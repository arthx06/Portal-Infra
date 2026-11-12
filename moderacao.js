const estadoModeracao = {
    adminAtual: null,
    tipoAtivo: "RECLAMACAO", // "RECLAMACAO" | "COMENTARIO"
    statusFiltro: "PENDENTE", // "PENDENTE" | "CONCLUIDA" | "TODAS"
    termoBusca: "",
    quantidadeVisivel: 10,
    incrementoPagina: 10,
    todasReclamacoesDenunciadas: [],
    todosComentariosDenunciados: [],
    denunciaSelecionada: null,
};

const LABELS_TIPO_DENUNCIA = {
    CONTEUDO_SEXUAL: "Conteúdo sexual",
    DISCURSO_DE_ODIO: "Discurso de ódio",
    PALAVRAS_DE_BAIXO_CALAO: "Palavras de baixo calão",
    CONTEUDO_FALSO: "Conteúdo falso",
    SPAM: "Spam",
    VENDA_OU_SERVICOS: "Venda ou serviços",
    OUTROS: "Outros",
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

function formatarTipoDenuncia(tipoRaw) {
    if (!tipoRaw) return "Denúncia";
    const chave = String(tipoRaw).toUpperCase().trim();
    return LABELS_TIPO_DENUNCIA[chave] || tipoRaw;
}

function normalizarDenuncia(raw, alvoTipo) {
    const statusBruto = String(raw.status || "PENDENTE").toUpperCase();
    const concluida = statusBruto === "CONCLUIDA";
    const isReclamacao = alvoTipo === "RECLAMACAO";

    const conteudoId = isReclamacao ? raw.reclamacaoId : raw.comentarioId;

    return {
        id: raw.id,
        tipo: alvoTipo,
        status: concluida ? "CONCLUIDA" : "PENDENTE",
        statusOriginal: statusBruto,
        motivoCategoria: formatarTipoDenuncia(raw.tipo),
        motivoDescricao: raw.descricao || "",
        quantidadeDenuncias: 1,
        dataDenuncia: raw.dataCriacao || null,
        denuncianteNome: raw.denuncianteNome || "Usuário",

        // Campos de auditoria do DenunciaResponse
        moderadorNome: raw.moderadorNome || null,
        dataModeracao: raw.dataModeracao || null,
        acaoTomada: raw.acaoTomada || null,

        usuarioDenunciado: {
            id: raw.usuarioDenunciadoId ?? "-",
            nome: raw.usuarioDenunciadoNome || "Usuário",
            email: raw.usuarioDenunciadoEmail || "-",
        },

        conteudo: {
            id: conteudoId,
            reclamacaoId: raw.reclamacaoId ?? null,
            titulo: isReclamacao ? raw.reclamacaoTitulo || "" : null,
            texto: isReclamacao
                ? raw.reclamacaoDescricao || ""
                : raw.comentarioTexto || "",
            bairro: null,
            dataCriacao: null,
        },
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await obterDadosSessao();

    if (!usuario || usuario.tipo !== "ADMIN") {
        window.location.replace("index.html");
        return;
    }

    estadoModeracao.adminAtual = usuario;
    document.getElementById("conteudo-moderacao").style.visibility = "visible";

    configurarHeaderUsuario(usuario);
    configurarEventosInterface();

    await carregarTodasDenuncias(true);
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
   EVENTOS DE ABAS, BUSCA E GAVETA
========================= */
function configurarEventosInterface() {
    document.querySelectorAll(".mod-tab").forEach((aba) => {
        aba.addEventListener("click", () => {
            const novoTipo = aba.dataset.tipo;
            if (novoTipo === estadoModeracao.tipoAtivo) return;

            document.querySelectorAll(".mod-tab").forEach((t) => {
                t.classList.remove("active");
                t.setAttribute("aria-selected", "false");
            });
            aba.classList.add("active");
            aba.setAttribute("aria-selected", "true");

            estadoModeracao.tipoAtivo = novoTipo;
            estadoModeracao.quantidadeVisivel = estadoModeracao.incrementoPagina;
            renderizarListaFiltrada();
        });
    });

    const inputBusca = document.getElementById("input-busca");
    const btnLimpar = document.getElementById("btn-limpar-busca");
    let timerDebounce = null;

    inputBusca.addEventListener("input", () => {
        const valor = inputBusca.value.trim();
        btnLimpar.hidden = valor.length === 0;

        clearTimeout(timerDebounce);
        timerDebounce = setTimeout(() => {
            estadoModeracao.termoBusca = valor;
            estadoModeracao.quantidadeVisivel = estadoModeracao.incrementoPagina;
            renderizarListaFiltrada();
        }, 250);
    });

    btnLimpar.addEventListener("click", () => {
        inputBusca.value = "";
        btnLimpar.hidden = true;
        estadoModeracao.termoBusca = "";
        estadoModeracao.quantidadeVisivel = estadoModeracao.incrementoPagina;
        renderizarListaFiltrada();
        inputBusca.focus();
    });

    document.getElementById("filtro-status").addEventListener("change", (e) => {
        estadoModeracao.statusFiltro = e.target.value;
        estadoModeracao.quantidadeVisivel = estadoModeracao.incrementoPagina;
        renderizarListaFiltrada();
    });

    document.getElementById("btn-carregar-mais").addEventListener("click", () => {
        estadoModeracao.quantidadeVisivel += estadoModeracao.incrementoPagina;
        renderizarListaFiltrada();
    });

    document.getElementById("lista-denuncias").addEventListener("click", (event) => {
        const card = event.target.closest(".mod-card");
        if (!card) return;

        const idDenuncia = Number(card.dataset.id);
        const listaAtual =
            estadoModeracao.tipoAtivo === "RECLAMACAO"
                ? estadoModeracao.todasReclamacoesDenunciadas
                : estadoModeracao.todosComentariosDenunciados;

        const denuncia = listaAtual.find((d) => Number(d.id) === idDenuncia);
        if (denuncia) {
            abrirGavetaDenuncia(denuncia);
        }
    });

    document.getElementById("btn-fechar-drawer").addEventListener("click", fecharGaveta);
    document.getElementById("drawer-overlay").addEventListener("click", fecharGaveta);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            fecharGaveta();
        }
    });

    document.getElementById("btn-ativar-edicao").addEventListener("click", ativarModoEdicao);
    document.getElementById("btn-cancelar-edicao").addEventListener("click", desativarModoEdicao);
    document.getElementById("drawer-edit-form").addEventListener("submit", salvarEdicaoConteudo);
    document.getElementById("btn-excluir-conteudo").addEventListener("click", excluirConteudoDenunciado);
    document.getElementById("btn-ignorar-denuncia").addEventListener("click", ignorarDenuncia);
}

/* =========================
   CARREGAMENTO DOS ENDPOINTS REAIS
========================= */
async function carregarTodasDenuncias(resetarLimite = true) {
    const feedbackEl = document.getElementById("mod-feedback");
    const listaEl = document.getElementById("lista-denuncias");

    if (resetarLimite) {
        estadoModeracao.quantidadeVisivel = estadoModeracao.incrementoPagina;
    }

    listaEl.innerHTML = "";
    feedbackEl.textContent = "Carregando denúncias...";
    feedbackEl.hidden = false;

    try {
        const [resReclamacoes, resComentarios] = await Promise.all([
            apiFetch("/denuncias/reclamacoes"),
            apiFetch("/denuncias/comentarios"),
        ]);

        if (!resReclamacoes.ok || !resComentarios.ok) {
            throw new Error("Erro ao consultar as denúncias no servidor.");
        }

        const rawReclamacoes = await resReclamacoes.json();
        const rawComentarios = await resComentarios.json();

        estadoModeracao.todasReclamacoesDenunciadas = (rawReclamacoes || []).map((item) =>
            normalizarDenuncia(item, "RECLAMACAO")
        );
        estadoModeracao.todosComentariosDenunciados = (rawComentarios || []).map((item) =>
            normalizarDenuncia(item, "COMENTARIO")
        );

        atualizarContadoresResumo();
        renderizarListaFiltrada();
    } catch (erro) {
        console.error("Erro ao carregar denúncias:", erro);
        feedbackEl.textContent = "Não foi possível carregar as denúncias no momento.";
        feedbackEl.hidden = false;
    }
}

function atualizarContadoresResumo() {
    const recPendentes = estadoModeracao.todasReclamacoesDenunciadas.filter(
        (d) => d.status === "PENDENTE"
    ).length;
    const comPendentes = estadoModeracao.todosComentariosDenunciados.filter(
        (d) => d.status === "PENDENTE"
    ).length;

    document.getElementById("stat-pendentes").textContent = recPendentes + comPendentes;
    document.getElementById("stat-reclamacoes").textContent = recPendentes;
    document.getElementById("stat-comentarios").textContent = comPendentes;
    document.getElementById("badge-tab-reclamacao").textContent = recPendentes;
    document.getElementById("badge-tab-comentario").textContent = comPendentes;
}

function renderizarListaFiltrada() {
    const listaEl = document.getElementById("lista-denuncias");
    const feedbackEl = document.getElementById("mod-feedback");
    const wrapMaisEl = document.getElementById("wrap-carregar-mais");

    const base =
        estadoModeracao.tipoAtivo === "RECLAMACAO"
            ? estadoModeracao.todasReclamacoesDenunciadas
            : estadoModeracao.todosComentariosDenunciados;

    const termo = estadoModeracao.termoBusca.toLowerCase();

    const filtrados = base.filter((d) => {
        if (estadoModeracao.statusFiltro !== "TODAS" && d.status !== estadoModeracao.statusFiltro) {
            return false;
        }
        if (!termo) return true;

        const idDenunciaMatch = String(d.id).includes(termo);
        const idUsuarioMatch = String(d.usuarioDenunciado.id).includes(termo);
        const idConteudoMatch = String(d.conteudo.id).includes(termo);
        const nomeMatch = (d.usuarioDenunciado.nome || "").toLowerCase().includes(termo);
        const emailMatch = (d.usuarioDenunciado.email || "").toLowerCase().includes(termo);

        return idDenunciaMatch || idUsuarioMatch || idConteudoMatch || nomeMatch || emailMatch;
    });

    if (filtrados.length === 0) {
        listaEl.innerHTML = "";
        wrapMaisEl.hidden = true;
        feedbackEl.textContent = "Nenhuma denúncia encontrada para os filtros selecionados.";
        feedbackEl.hidden = false;
        return;
    }

    feedbackEl.hidden = true;
    const fatiaVisivel = filtrados.slice(0, estadoModeracao.quantidadeVisivel);
    listaEl.innerHTML = fatiaVisivel.map(renderizarCardDenuncia).join("");

    wrapMaisEl.hidden = fatiaVisivel.length >= filtrados.length;
}

function renderizarCardDenuncia(d) {
    const isReclamacao = d.tipo === "RECLAMACAO";
    const tituloOuResumo = isReclamacao
        ? d.conteudo.titulo || `Reclamação #${d.conteudo.id}`
        : `Comentário #${d.conteudo.id} (Reclamação #${d.conteudo.reclamacaoId ?? "-"})`;

    const badgeStatus =
        d.status === "CONCLUIDA"
            ? `<span class="status resolved">Concluída</span>`
            : `<span class="status pending">Pendente</span>`;

    const blocoAuditoria =
        d.status === "CONCLUIDA" && d.moderadorNome
            ? `<div class="mod-card-audit">
           Moderada por <strong>${esc(d.moderadorNome)}</strong>
           ${d.dataModeracao ? `em ${formatarDataHora(d.dataModeracao)}` : ""}
           ${d.acaoTomada ? `— ${esc(d.acaoTomada)}` : ""}
         </div>`
            : "";

    return `
    <article class="mod-card" data-id="${esc(d.id)}">
      <div class="mod-card-main">
        <div class="mod-card-top">
          <span class="mod-id-pill">Denúncia #${esc(d.id)}</span>
          <span class="mod-motivo-pill">${esc(d.motivoCategoria)}</span>
          <span class="mod-date">${formatarDataHora(d.dataDenuncia)}</span>
        </div>

        <h3 class="mod-card-title">${esc(tituloOuResumo)}</h3>
        <p class="mod-card-excerpt">${esc(d.conteudo.texto || "Clique em Analisar para ver detalhes.")}</p>

        <div class="mod-card-user">
          <span>Autor: <strong>${esc(d.usuarioDenunciado.nome)}</strong></span>
          <span>${esc(d.usuarioDenunciado.email)}</span>
          <span>ID Usuário: #${esc(d.usuarioDenunciado.id)}</span>
        </div>

        ${blocoAuditoria}
      </div>

      <div class="mod-card-actions">
        ${badgeStatus}
        <button type="button" class="btn-analisar">Analisar</button>
      </div>
    </article>
  `;
}

/* =========================
   GAVETA LATERAL (DETALHES E AÇÕES)
========================= */
async function abrirGavetaDenuncia(denuncia) {
    estadoModeracao.denunciaSelecionada = denuncia;
    desativarModoEdicao();

    const isReclamacao = denuncia.tipo === "RECLAMACAO";
    const concluida = denuncia.status === "CONCLUIDA";

    document.getElementById("drawer-id").textContent =
        `Denúncia #${denuncia.id} • ${isReclamacao ? "Reclamação" : "Comentário"}`;
    document.getElementById("drawer-titulo").textContent =
        isReclamacao ? "Análise de Reclamação" : "Análise de Comentário";

    const auditoriaBox = document.getElementById("drawer-auditoria-box");
    if (concluida) {
        auditoriaBox.hidden = false;
        auditoriaBox.innerHTML = `
      <strong>Moderação Concluída</strong><br />
      ${
            denuncia.moderadorNome
                ? `Responsável: <strong>${esc(denuncia.moderadorNome)}</strong>${
                    denuncia.dataModeracao ? ` em ${formatarDataHora(denuncia.dataModeracao)}` : ""
                }.<br />`
                : ""
        }
      Status registrado: <strong>${esc(denuncia.acaoTomada || denuncia.statusOriginal)}</strong>
    `;
    } else {
        auditoriaBox.hidden = true;
    }

    const nome = denuncia.usuarioDenunciado.nome || "Usuário";
    document.getElementById("drawer-user-avatar").textContent = nome.charAt(0).toUpperCase();
    document.getElementById("drawer-user-nome").textContent = nome;
    document.getElementById("drawer-user-email").textContent = denuncia.usuarioDenunciado.email || "-";
    document.getElementById("drawer-user-id").textContent =
        `ID do Usuário: #${denuncia.usuarioDenunciado.id}`;

    document.getElementById("drawer-motivo-categoria").textContent = denuncia.motivoCategoria;
    document.getElementById("drawer-motivo-descricao").textContent =
        denuncia.motivoDescricao || "Sem descrição adicional.";
    document.getElementById("drawer-denunciante-info").textContent =
        `Reportado por ${denuncia.denuncianteNome}`;

    document.getElementById("drawer-conteudo-label").textContent =
        isReclamacao ? "Reclamação Denunciada" : "Comentário Denunciado";

    const linkOriginal = document.getElementById("drawer-link-original");
    if (denuncia.conteudo.reclamacaoId) {
        linkOriginal.href = `detalhe-reclamacao.html?id=${encodeURIComponent(denuncia.conteudo.reclamacaoId)}`;
        linkOriginal.hidden = false;
    } else {
        linkOriginal.hidden = true;
    }

    const itemTituloEl = document.getElementById("drawer-item-titulo");
    const itemTextoEl = document.getElementById("drawer-item-texto");

    if (isReclamacao) {
        itemTituloEl.textContent = denuncia.conteudo.titulo || "Carregando título...";
        itemTituloEl.hidden = false;
    } else {
        itemTituloEl.hidden = true;
    }

    itemTextoEl.textContent = denuncia.conteudo.texto || "Carregando conteúdo...";
    document.getElementById("drawer-item-meta").textContent =
        `ID do Conteúdo: #${denuncia.conteudo.id ?? "-"}`;

    document.getElementById("drawer-footer").hidden = concluida;

    const overlay = document.getElementById("drawer-overlay");
    const drawer = document.getElementById("mod-drawer");
    overlay.hidden = false;
    requestAnimationFrame(() => {
        overlay.classList.add("open");
        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
    });

    if (isReclamacao && denuncia.conteudo.id && (!denuncia.conteudo.titulo || !denuncia.conteudo.texto)) {
        try {
            const res = await apiFetch(`/reclamacoes/${denuncia.conteudo.id}`);
            if (res.ok) {
                const rec = await res.json();
                denuncia.conteudo.titulo = rec.titulo;
                denuncia.conteudo.texto = rec.descricao;
                denuncia.conteudo.bairro = rec.bairro;
                denuncia.conteudo.dataCriacao = rec.dataCriacao;
                denuncia.conteudoCompleto = rec;

                if (estadoModeracao.denunciaSelecionada?.id === denuncia.id) {
                    itemTituloEl.textContent = rec.titulo || "";
                    itemTextoEl.textContent = rec.descricao || "-";
                    document.getElementById("drawer-item-meta").textContent =
                        `ID do Conteúdo: #${rec.id} • Bairro: ${rec.bairro || "-"}`;
                }
            }
        } catch (e) {
            console.error("Erro ao complementar dados da reclamação:", e);
        }
    }
}

function fecharGaveta() {
    const overlay = document.getElementById("drawer-overlay");
    const drawer = document.getElementById("mod-drawer");

    overlay.classList.remove("open");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");

    setTimeout(() => {
        overlay.hidden = true;
        estadoModeracao.denunciaSelecionada = null;
        desativarModoEdicao();
    }, 260);
}

function ativarModoEdicao() {
    const denuncia = estadoModeracao.denunciaSelecionada;
    if (!denuncia) return;

    const isReclamacao = denuncia.tipo === "RECLAMACAO";
    const grupoTitulo = document.getElementById("grupo-edit-titulo");
    const inputTitulo = document.getElementById("edit-titulo");
    const inputTexto = document.getElementById("edit-texto");

    if (isReclamacao) {
        grupoTitulo.hidden = false;
        inputTitulo.value = denuncia.conteudo.titulo || "";
        document.getElementById("label-edit-texto").textContent = "Descrição da Reclamação";
    } else {
        grupoTitulo.hidden = true;
        inputTitulo.value = "";
        document.getElementById("label-edit-texto").textContent = "Texto do Comentário";
    }

    inputTexto.value = denuncia.conteudo.texto || "";

    document.getElementById("drawer-view-mode").hidden = true;
    document.getElementById("drawer-edit-form").hidden = false;
    document.getElementById("drawer-footer").hidden = true;
    inputTexto.focus();
}

function desativarModoEdicao() {
    document.getElementById("drawer-view-mode").hidden = false;
    document.getElementById("drawer-edit-form").hidden = true;

    if (estadoModeracao.denunciaSelecionada?.status === "PENDENTE") {
        document.getElementById("drawer-footer").hidden = false;
    }
}

/* =========================
   AÇÕES DO ADMIN (ALINHADAS COM AS CONTROLLERS)
========================= */
async function salvarEdicaoConteudo(event) {
    event.preventDefault();
    const denuncia = estadoModeracao.denunciaSelecionada;
    if (!denuncia) return;

    const isReclamacao = denuncia.tipo === "RECLAMACAO";
    const novoTitulo = document.getElementById("edit-titulo").value.trim();
    const novoTexto = document.getElementById("edit-texto").value.trim();

    if (!novoTexto) {
        alert("O texto do conteúdo não pode ficar vazio.");
        return;
    }

    const btnSalvar = document.getElementById("btn-salvar-edicao");
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    try {
        if (isReclamacao) {
            let recAtual = denuncia.conteudoCompleto;
            if (!recAtual) {
                const resGet = await apiFetch(`/reclamacoes/${denuncia.conteudo.id}`);
                if (!resGet.ok) throw new Error("Não foi possível carregar a reclamação para edição.");
                recAtual = await resGet.json();
            }

            const dadosAtualizados = {
                titulo: novoTitulo || recAtual.titulo,
                descricao: novoTexto,
                categoria: recAtual.categoria,
                endereco: recAtual.endereco,
                bairro: recAtual.bairro,
                cep: recAtual.cep,
                latitude: recAtual.latitude,
                longitude: recAtual.longitude,
            };

            const formData = new FormData();
            formData.append(
                "dados",
                new Blob([JSON.stringify(dadosAtualizados)], { type: "application/json" })
            );

            const resRec = await apiFetch(`/reclamacoes/admin/${denuncia.conteudo.id}`, {
                method: "PATCH",
                body: formData,
            });
            if (!resRec.ok) throw new Error("Erro ao editar a reclamação pelo admin.");
        } else {
            const formData = new FormData();
            formData.append("texto", novoTexto);

            const resCom = await apiFetch(`/comentarios/admin/${denuncia.conteudo.id}`, {
                method: "PATCH",
                body: formData,
            });
            if (!resCom.ok) throw new Error("Erro ao editar o comentário pelo admin.");
        }

        await resolverDenunciaNoBack(denuncia.id, true);

        fecharGaveta();
        await carregarTodasDenuncias(false);
    } catch (erro) {
        console.error("Erro ao salvar edição na moderação:", erro);
        alert(erro.message || "Não foi possível salvar a edição.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar edição e concluir";
    }
}

async function excluirConteudoDenunciado() {
    const denuncia = estadoModeracao.denunciaSelecionada;
    if (!denuncia) return;

    const tipoLabel = denuncia.tipo === "RECLAMACAO" ? "esta reclamação" : "este comentário";
    const confirmou = window.confirm(
        `Tem certeza que deseja apagar ${tipoLabel} por completo? Essa ação não poderá ser desfeita.`
    );
    if (!confirmou) return;

    const btnExcluir = document.getElementById("btn-excluir-conteudo");
    btnExcluir.disabled = true;
    btnExcluir.textContent = "Apagando...";

    try {
        const rotaExclusao =
            denuncia.tipo === "RECLAMACAO"
                ? `/reclamacoes/admin/${denuncia.conteudo.id}`
                : `/comentarios/admin/${denuncia.conteudo.id}`;

        const resDel = await apiFetch(rotaExclusao, { method: "DELETE" });
        if (!resDel.ok) throw new Error("Erro ao excluir o conteúdo denunciado.");

        await resolverDenunciaNoBack(denuncia.id, true);

        fecharGaveta();
        await carregarTodasDenuncias(false);
    } catch (erro) {
        console.error("Erro ao excluir conteúdo:", erro);
        alert(erro.message || "Não foi possível excluir o conteúdo.");
    } finally {
        btnExcluir.disabled = false;
        btnExcluir.textContent = "Apagar por completo";
    }
}

async function ignorarDenuncia() {
    const denuncia = estadoModeracao.denunciaSelecionada;
    if (!denuncia) return;

    const btnIgnorar = document.getElementById("btn-ignorar-denuncia");
    btnIgnorar.disabled = true;
    btnIgnorar.textContent = "Concluindo...";

    try {
        await resolverDenunciaNoBack(denuncia.id, false);

        fecharGaveta();
        await carregarTodasDenuncias(false);
    } catch (erro) {
        console.error("Erro ao ignorar denúncia:", erro);
        alert("Não foi possível concluir a denúncia.");
    } finally {
        btnIgnorar.disabled = false;
        btnIgnorar.textContent = "Ignorar denúncia";
    }
}

async function resolverDenunciaNoBack(denunciaId, aceitar) {
    const res = await apiFetch(`/denuncias/${denunciaId}/resolver?aceitar=${aceitar}`, {
        method: "PATCH",
    });

    if (!res.ok) {
        throw new Error("Houve uma falha ao atualizar o status da denúncia.");
    }
}