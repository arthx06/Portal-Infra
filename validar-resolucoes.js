const estadoValidacao = {
    adminAtual: null,
    statusFiltro: "PENDENTE", // "PENDENTE" | "RESOLVIDA" | "TODAS"
    termoBusca: "",
    quantidadeVisivel: 10,
    incrementoPagina: 10,
    todosRelatos: [],
    relatoSelecionado: null,
};

const esc = (texto) =>
    String(texto ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

function formatarDataHora(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function extrairPrimeiraFotoReclamacao(rec) {
    if (!rec) return null;
    if (Array.isArray(rec.fotos) && rec.fotos.length > 0) {
        const primeira = rec.fotos[0];
        return typeof primeira === "string" ? primeira : primeira.url || primeira.fotoUrl || null;
    }
    return rec.fotoUrl || null;
}

function normalizarRelatoResolucao(raw) {
    const statusRecBruto = String(raw.reclamacaoStatus || raw.statusReclamacao || "Pendente").toUpperCase();
    const resolvida = statusRecBruto === "RESOLVIDA";

    return {
        id: raw.id,
        texto: raw.texto || "",
        fotoUrl: raw.fotoUrl || null,
        dataCriacao: raw.dataCriacao || null,
        isResolucao: Boolean(raw.isResolucao ?? raw.resolucao ?? true),

        reclamacao: {
            id: raw.reclamacaoId ?? raw.reclamacao?.id ?? null,
            titulo: raw.reclamacaoTitulo || raw.reclamacao?.titulo || "",
            descricao: raw.reclamacaoDescricao || raw.reclamacao?.descricao || "",
            bairro: raw.reclamacaoBairro || raw.reclamacao?.bairro || "",
            endereco: raw.reclamacaoEndereco || raw.reclamacao?.endereco || "",
            status: resolvida ? "RESOLVIDA" : "PENDENTE",
            fotoAntesUrl:
                raw.reclamacaoFotoUrl ||
                extrairPrimeiraFotoReclamacao(raw.reclamacao) ||
                null,
        },

        autor: {
            id: raw.usuarioId ?? raw.usuario?.id ?? "-",
            nome: raw.usuarioNome || raw.autorNome || raw.usuario?.nome || "Cidadão",
            email: raw.usuarioEmail || raw.autorEmail || raw.usuario?.email || "-",
        },
    };
}

/* =========================
   INICIALIZAÇÃO E CONTROLE DE ACESSO
========================= */
document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await obterDadosSessao();

    // Não autenticado (401 / sessão inexistente) -> login
    if (!usuario) {
        // Se o servidor está fora do ar e não há cache, avisa em vez de redirecionar às cegas
        const aviso = document.getElementById("aviso-sessao");
        if (aviso && !navigator.onLine) {
            aviso.textContent =
                "Sem conexão com o servidor. Verifique sua internet e recarregue a página.";
            aviso.style.display = "block";
            return;
        }
        window.location.replace("login.html");
        return;
    }

    // Autenticado, mas sem permissão de administrador -> início
    if (usuario.tipo !== "ADMIN") {
        window.location.replace("index.html");
        return;
    }

    estadoValidacao.adminAtual = usuario;
    document.getElementById("conteudo-validacao").style.visibility = "visible";

    configurarHeaderUsuario(usuario);
    configurarEventosInterface();

    await carregarRelatosResolucao(true);
});

/* =========================
   HEADER E MENU DO ADMIN
========================= */
function configurarHeaderUsuario(usuario) {
    const menuUsuario = document.getElementById("user-menu");
    const nomeUsuario = document.getElementById("nome-usuario");
    const botaoMenu = document.getElementById("user-menu-btn");
    const dropdown = document.getElementById("user-dropdown");
    const botaoSair = document.getElementById("btn-sair");

    if (menuUsuario) menuUsuario.style.display = "block";
    if (nomeUsuario) nomeUsuario.textContent = usuario.nome || "Administrador";

    if (botaoMenu && dropdown) {
        botaoMenu.addEventListener("click", () => {
            const aberto = !dropdown.hidden;
            dropdown.hidden = aberto;
            botaoMenu.setAttribute("aria-expanded", String(!aberto));
        });

        document.addEventListener("click", (event) => {
            if (!menuUsuario.contains(event.target)) {
                dropdown.hidden = true;
                botaoMenu.setAttribute("aria-expanded", "false");
            }
        });
    }

    if (botaoSair) {
        botaoSair.addEventListener("click", async () => {
            try {
                await apiFetch("/usuarios/logout", { method: "POST" });
            } catch (e) {
                console.error("Erro ao sair:", e);
            }
            localStorage.removeItem("usuario");
            window.location.href = "index.html";
        });
    }
}

/* =========================
   EVENTOS DE BUSCA, FILTROS E GAVETA
========================= */
function configurarEventosInterface() {
    const inputBusca = document.getElementById("input-busca");
    const btnLimpar = document.getElementById("btn-limpar-busca");
    let timerDebounce = null;

    inputBusca.addEventListener("input", () => {
        const valor = inputBusca.value.trim();
        btnLimpar.hidden = valor.length === 0;

        clearTimeout(timerDebounce);
        timerDebounce = setTimeout(() => {
            estadoValidacao.termoBusca = valor;
            estadoValidacao.quantidadeVisivel = estadoValidacao.incrementoPagina;
            renderizarListaFiltrada();
        }, 250);
    });

    btnLimpar.addEventListener("click", () => {
        inputBusca.value = "";
        btnLimpar.hidden = true;
        estadoValidacao.termoBusca = "";
        estadoValidacao.quantidadeVisivel = estadoValidacao.incrementoPagina;
        renderizarListaFiltrada();
        inputBusca.focus();
    });

    document.getElementById("filtro-status").addEventListener("change", (e) => {
        estadoValidacao.statusFiltro = e.target.value;
        estadoValidacao.quantidadeVisivel = estadoValidacao.incrementoPagina;
        renderizarListaFiltrada();
    });

    document.getElementById("btn-carregar-mais").addEventListener("click", () => {
        estadoValidacao.quantidadeVisivel += estadoValidacao.incrementoPagina;
        renderizarListaFiltrada();
    });

    document.getElementById("lista-resolucoes").addEventListener("click", (event) => {
        const card = event.target.closest(".val-card");
        if (!card) return;

        const idRelato = Number(card.dataset.id);
        const relato = estadoValidacao.todosRelatos.find((r) => Number(r.id) === idRelato);
        if (relato) {
            abrirGavetaRelato(relato);
        }
    });

    document.getElementById("btn-fechar-drawer").addEventListener("click", fecharGaveta);
    document.getElementById("drawer-overlay").addEventListener("click", fecharGaveta);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            fecharGaveta();
        }
    });

    // Permite abrir imagem em tamanho real ao clicar
    ["drawer-rec-foto", "drawer-com-foto"].forEach((imgId) => {
        const img = document.getElementById(imgId);
        if (img) {
            img.addEventListener("click", () => {
                if (img.src && !img.hidden) {
                    window.open(img.src, "_blank", "noopener,noreferrer");
                }
            });
        }
    });

    document
        .getElementById("btn-aprovar-resolucao")
        .addEventListener("click", aprovarResolucao);
    document
        .getElementById("btn-recusar-prova")
        .addEventListener("click", recusarProvaResolucao);
}

/* =========================
   CARREGAMENTO DOS RELATOS
========================= */
async function carregarRelatosResolucao(resetarLimite = true) {
    const feedbackEl = document.getElementById("val-feedback");
    const listaEl = document.getElementById("lista-resolucoes");

    if (resetarLimite) {
        estadoValidacao.quantidadeVisivel = estadoValidacao.incrementoPagina;
    }

    listaEl.innerHTML = "";
    feedbackEl.textContent = "Carregando relatos de resolução...";
    feedbackEl.hidden = false;

    try {
        const res = await apiFetch("/comentarios/admin/resolucoes");

        if (res.status === 401) {
            // apiFetch já limpou a sessão local; aqui só encaminhamos ao login.
            window.location.replace("login.html");
            return;
        }

        if (res.status === 403) {
            throw new Error("Você não tem permissão para visualizar os relatos de resolução.");
        }

        if (!res.ok) {
            throw new Error("Erro ao consultar os relatos de resolução no servidor.");
        }

        const rawLista = await res.json();
        estadoValidacao.todosRelatos = (rawLista || []).map(normalizarRelatoResolucao);

        atualizarContadoresResumo();
        renderizarListaFiltrada();
    } catch (erro) {
        console.error("Erro ao carregar relatos de resolução:", erro);
        feedbackEl.textContent =
            erro.message || "Não foi possível carregar os relatos de resolução no momento.";
        feedbackEl.hidden = false;
    }
}

function atualizarContadoresResumo() {
    const pendentes = estadoValidacao.todosRelatos.filter(
        (r) => r.reclamacao.status === "PENDENTE"
    ).length;
    const resolvidas = estadoValidacao.todosRelatos.filter(
        (r) => r.reclamacao.status === "RESOLVIDA"
    ).length;

    document.getElementById("stat-pendentes").textContent = pendentes;
    document.getElementById("stat-resolvidas").textContent = resolvidas;
    document.getElementById("stat-total").textContent = estadoValidacao.todosRelatos.length;
}

function renderizarListaFiltrada() {
    const listaEl = document.getElementById("lista-resolucoes");
    const feedbackEl = document.getElementById("val-feedback");
    const wrapMaisEl = document.getElementById("wrap-carregar-mais");

    const termo = estadoValidacao.termoBusca.toLowerCase();

    const filtrados = estadoValidacao.todosRelatos.filter((r) => {
        if (
            estadoValidacao.statusFiltro !== "TODAS" &&
            r.reclamacao.status !== estadoValidacao.statusFiltro
        ) {
            return false;
        }

        if (!termo) return true;

        const idRelatoMatch = String(r.id).includes(termo);
        const idRecMatch = String(r.reclamacao.id).includes(termo);
        const tituloMatch = (r.reclamacao.titulo || "").toLowerCase().includes(termo);
        const bairroMatch = (r.reclamacao.bairro || "").toLowerCase().includes(termo);
        const nomeMatch = (r.autor.nome || "").toLowerCase().includes(termo);
        const emailMatch = (r.autor.email || "").toLowerCase().includes(termo);

        return (
            idRelatoMatch ||
            idRecMatch ||
            tituloMatch ||
            bairroMatch ||
            nomeMatch ||
            emailMatch
        );
    });

    if (filtrados.length === 0) {
        listaEl.innerHTML = "";
        wrapMaisEl.hidden = true;
        feedbackEl.textContent = "Nenhum relato de resolução encontrado para os filtros selecionados.";
        feedbackEl.hidden = false;
        return;
    }

    feedbackEl.hidden = true;
    const fatiaVisivel = filtrados.slice(0, estadoValidacao.quantidadeVisivel);
    listaEl.innerHTML = fatiaVisivel.map(renderizarCardRelato).join("");

    wrapMaisEl.hidden = fatiaVisivel.length >= filtrados.length;
}

function renderizarCardRelato(r) {
    const isResolvida = r.reclamacao.status === "RESOLVIDA";
    const titulo =
        r.reclamacao.titulo || `Reclamação #${r.reclamacao.id ?? "-"}`;

    const badgeStatus = isResolvida
        ? `<span class="status-pill resolved">Resolvida</span>`
        : `<span class="status-pill pending">Pendente</span>`;

    const thumbHtml = r.fotoUrl
        ? `<img class="val-card-thumb" src="${esc(r.fotoUrl)}" alt="Foto de prova" loading="lazy" />`
        : "";

    return `
    <article class="val-card" data-id="${esc(r.id)}">
      ${thumbHtml}
 
      <div class="val-card-main">
        <div class="val-card-top">
          <span class="val-id-pill">Relato #${esc(r.id)} • Reclamação #${esc(r.reclamacao.id ?? "-")}</span>
          <span class="val-badge-prova">Prova de Resolução</span>
          <span class="val-date">${formatarDataHora(r.dataCriacao)}</span>
        </div>
 
        <h3 class="val-card-title">${esc(titulo)}</h3>
        <p class="val-card-excerpt">${esc(r.texto || "Clique em Analisar para conferir a foto de prova.")}</p>
 
        <div class="val-card-user">
          <span>Enviado por: <strong>${esc(r.autor.nome)}</strong></span>
          <span>${esc(r.autor.email)}</span>
          ${r.reclamacao.bairro ? `<span>Bairro: ${esc(r.reclamacao.bairro)}</span>` : ""}
        </div>
      </div>
 
      <div class="val-card-actions">
        ${badgeStatus}
        <button type="button" class="btn-analisar">Analisar</button>
      </div>
    </article>
  `;
}

/* =========================
   GAVETA LATERAL (ANTES VS DEPOIS)
========================= */
function preencherImagemFrame(imgId, vazioId, url) {
    const imgEl = document.getElementById(imgId);
    const vazioEl = document.getElementById(vazioId);

    if (url) {
        imgEl.src = url;
        imgEl.hidden = false;
        vazioEl.hidden = true;
    } else {
        imgEl.removeAttribute("src");
        imgEl.hidden = true;
        vazioEl.hidden = false;
    }
}

async function abrirGavetaRelato(relato) {
    estadoValidacao.relatoSelecionado = relato;

    const isResolvida = relato.reclamacao.status === "RESOLVIDA";

    document.getElementById("drawer-id").textContent =
        `Relato #${relato.id} • Reclamação #${relato.reclamacao.id ?? "-"}`;

    const statusBox = document.getElementById("drawer-status-box");
    if (isResolvida) {
        statusBox.hidden = false;
        statusBox.innerHTML =
            "<strong>Reclamação já marcada como Resolvida.</strong> Este relato já foi validado pela administração.";
    } else {
        statusBox.hidden = true;
    }

    // Fotos Antes e Depois
    preencherImagemFrame("drawer-rec-foto", "sem-foto-antes", relato.reclamacao.fotoAntesUrl);
    preencherImagemFrame("drawer-com-foto", "sem-foto-depois", relato.fotoUrl);

    // Dados da reclamação
    const linkOriginal = document.getElementById("drawer-link-original");
    if (relato.reclamacao.id) {
        linkOriginal.href = `detalhe-reclamacao.html?id=${encodeURIComponent(relato.reclamacao.id)}`;
        linkOriginal.hidden = false;
    } else {
        linkOriginal.hidden = true;
    }

    document.getElementById("drawer-rec-titulo").textContent =
        relato.reclamacao.titulo || `Reclamação #${relato.reclamacao.id ?? "-"}`;
    document.getElementById("drawer-rec-descricao").textContent =
        relato.reclamacao.descricao || "Carregando detalhes da reclamação...";
    document.getElementById("drawer-rec-local").textContent =
        [relato.reclamacao.endereco, relato.reclamacao.bairro].filter(Boolean).join(" • ") ||
        "Localização não informada";

    // Dados do relato do cidadão
    document.getElementById("drawer-com-texto").textContent =
        relato.texto || "Sem descrição adicional.";
    document.getElementById("drawer-com-data").textContent =
        `Enviado em ${formatarDataHora(relato.dataCriacao)}`;

    // Autor
    const nome = relato.autor.nome || "Cidadão";
    document.getElementById("drawer-user-avatar").textContent = nome.charAt(0).toUpperCase();
    document.getElementById("drawer-user-nome").textContent = nome;
    document.getElementById("drawer-user-email").textContent = relato.autor.email || "-";
    document.getElementById("drawer-user-id").textContent = `ID do Usuário: #${relato.autor.id}`;

    document.getElementById("drawer-footer").hidden = isResolvida;

    // Abre gaveta
    const overlay = document.getElementById("drawer-overlay");
    const drawer = document.getElementById("val-drawer");
    overlay.hidden = false;
    requestAnimationFrame(() => {
        overlay.classList.add("open");
        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
    });

    // Complementa dados e foto original da reclamação via GET /reclamacoes/{id}
    if (
        relato.reclamacao.id &&
        (!relato.reclamacao.fotoAntesUrl || !relato.reclamacao.descricao)
    ) {
        try {
            const res = await apiFetch(`/reclamacoes/${relato.reclamacao.id}`);
            if (res.ok) {
                const rec = await res.json();
                relato.reclamacao.titulo = rec.titulo || relato.reclamacao.titulo;
                relato.reclamacao.descricao = rec.descricao || relato.reclamacao.descricao;
                relato.reclamacao.bairro = rec.bairro || relato.reclamacao.bairro;
                relato.reclamacao.endereco = rec.endereco || relato.reclamacao.endereco;
                relato.reclamacao.fotoAntesUrl =
                    extrairPrimeiraFotoReclamacao(rec) || relato.reclamacao.fotoAntesUrl;

                if (estadoValidacao.relatoSelecionado?.id === relato.id) {
                    document.getElementById("drawer-rec-titulo").textContent = relato.reclamacao.titulo;
                    document.getElementById("drawer-rec-descricao").textContent =
                        relato.reclamacao.descricao || "-";
                    document.getElementById("drawer-rec-local").textContent =
                        [relato.reclamacao.endereco, relato.reclamacao.bairro].filter(Boolean).join(" • ") ||
                        "Localização não informada";
                    preencherImagemFrame(
                        "drawer-rec-foto",
                        "sem-foto-antes",
                        relato.reclamacao.fotoAntesUrl
                    );
                }
            }
        } catch (e) {
            console.error("Erro ao carregar foto original da reclamação:", e);
        }
    }
}

function fecharGaveta() {
    const overlay = document.getElementById("drawer-overlay");
    const drawer = document.getElementById("val-drawer");

    overlay.classList.remove("open");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");

    setTimeout(() => {
        overlay.hidden = true;
        estadoValidacao.relatoSelecionado = null;
    }, 260);
}

/* =========================
   DECISÕES DO ADMIN
========================= */
async function aprovarResolucao() {
    const relato = estadoValidacao.relatoSelecionado;
    if (!relato || !relato.reclamacao.id) return;

    const confirmou = window.confirm(
        `Confirmar que a reclamação #${relato.reclamacao.id} foi resolvida com base nesta prova?`
    );
    if (!confirmou) return;

    const btnAprovar = document.getElementById("btn-aprovar-resolucao");
    const btnRecusar = document.getElementById("btn-recusar-prova");
    btnAprovar.disabled = true;
    btnRecusar.disabled = true;
    btnAprovar.textContent = "Aprovando...";

    try {
        const res = await apiFetch(`/reclamacoes/admin/${relato.reclamacao.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Resolvida" }),
        });

        if (!res.ok) {
            throw new Error("Não foi possível atualizar o status da reclamação para Resolvida.");
        }

        fecharGaveta();
        await carregarRelatosResolucao(false);
    } catch (erro) {
        console.error("Erro ao aprovar resolução:", erro);
        alert(erro.message || "Falha ao aprovar a resolução.");
    } finally {
        btnAprovar.disabled = false;
        btnRecusar.disabled = false;
        btnAprovar.textContent = "Aprovar e marcar como Resolvida";
    }
}

async function recusarProvaResolucao() {
    const relato = estadoValidacao.relatoSelecionado;
    if (!relato) return;

    const confirmou = window.confirm(
        "Deseja recusar esta prova? O comentário perderá a marcação de resolução, mas continuará visível na publicação."
    );
    if (!confirmou) return;

    const btnAprovar = document.getElementById("btn-aprovar-resolucao");
    const btnRecusar = document.getElementById("btn-recusar-prova");
    btnAprovar.disabled = true;
    btnRecusar.disabled = true;
    btnRecusar.textContent = "Recusando...";

    try {
        const formData = new FormData();
        formData.append("texto", relato.texto);
        formData.append("isResolucao", "false");

        const res = await apiFetch(`/comentarios/admin/${relato.id}`, {
            method: "PATCH",
            body: formData,
        });

        if (!res.ok) {
            throw new Error("Não foi possível desmarcar o comentário como resolução.");
        }

        fecharGaveta();
        await carregarRelatosResolucao(false);
    } catch (erro) {
        console.error("Erro ao recusar prova:", erro);
        alert(erro.message || "Falha ao recusar a prova.");
    } finally {
        btnAprovar.disabled = false;
        btnRecusar.disabled = false;
        btnRecusar.textContent = "Recusar prova";
    }
}
