
async function carregarContagem() {
  try {
    const res = await fetch(`${API_BASE}/reclamacoes/contagem`);
    if (!res.ok) return;
    const d = await res.json();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('count-total', d.total);
    set('count-pendentes', d.pendentes);
    set('count-resolvidas', d.resolvidas);
  } catch (e) {
    console.error('Erro ao carregar contagem', e);
  }
}
carregarContagem();



document.addEventListener("DOMContentLoaded", async function () {

    const botaoEntrar = document.getElementById("btn-entrar");
    const menuUsuario = document.getElementById("user-menu");
    const nomeUsuario = document.getElementById("nome-usuario");
    const botaoMenu = document.getElementById("user-menu-btn");
    const dropdown = document.getElementById("user-dropdown");
    const botaoSair = document.getElementById("btn-sair");

    // Consulta os dados atualizados da sessão
    const usuario = await obterDadosSessao();

    const logado = usuario !== null;
    const isAdmin = logado && usuario.tipo === "ADMIN";

    // Disponibiliza os dados do usuário para outros scripts
    window.usuarioAtual = usuario;

    // Atualiza o menu de usuário
    if (logado) {

        if (botaoEntrar) botaoEntrar.style.display = "none";
        if (menuUsuario) menuUsuario.style.display = "block";

        if (nomeUsuario) {
            nomeUsuario.textContent = usuario.nome || "Minha conta";
        }

    } else {

        if (menuUsuario) menuUsuario.style.display = "none";
        if (botaoEntrar) botaoEntrar.style.display = "";

    }

    // Controla elementos exclusivos do administrador
    document.querySelectorAll("[data-admin-only]").forEach(elemento => {
        elemento.hidden = !isAdmin;
    });

    // Identifica o tipo de usuário na página
    document.body.classList.toggle("usuario-admin", isAdmin);

    console.log("Usuário autenticado:", usuario);
    console.log("Administrador:", isAdmin);

    // Abre e fecha o menu
    if (botaoMenu && dropdown) {

        botaoMenu.addEventListener("click", function () {

            const aberto = !dropdown.hidden;

            dropdown.hidden = aberto;
            botaoMenu.setAttribute("aria-expanded", String(!aberto));

        });

        // Fecha o menu ao clicar fora
        document.addEventListener("click", function (event) {

            if (menuUsuario && !menuUsuario.contains(event.target)) {

                dropdown.hidden = true;
                botaoMenu.setAttribute("aria-expanded", "false");

            }

        });

    }

    // Encerra a sessão
    if (botaoSair) {

        botaoSair.addEventListener("click", async () => {

            try {
                await apiFetch("/usuarios/logout", { method: "POST" });
            } catch (error) {
                console.error("Erro ao encerrar sessão:", error);
            }

            localStorage.removeItem("usuario");
            window.location.href = "index.html";

        });

    }

});


// se o arquivo ainda não tiver a função esc, copie; se já tiver, não repita
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function criarItemRecente(r) {
  const resolvida = (r.status || '').toLowerCase().startsWith('resolvid');
  const icone = resolvida
    ? '<div class="resolvidas-gre">OK</div>'
    : '<div class="red-recl">!</div>';
  const classe = resolvida ? 'resolved' : 'pending';
  const data = r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '';

  return `
    <article class="complaint">
      ${icone}
      <div class="complaint-info">
        <h3>${esc(r.titulo)}</h3>
        <p>${esc(r.endereco)} — ${esc(r.bairro)}</p>
        <span class="date">Registrado em ${data}</span>
      </div>
      <span class="status ${classe}">${esc(r.status)}</span>
      <button class="arrow">→</button>
    </article>`;
}

async function carregarRecentes() {
  const lista = document.getElementById('lista-recentes');
  if (!lista) return;
  try {
    const res = await fetch(`${API_BASE}/reclamacoes?page=0&size=3`);
    if (!res.ok) return;
    const pagina = await res.json();

    lista.innerHTML = pagina.content.length === 0
      ? '<p>Nenhuma reclamação registrada ainda.</p>'
      : pagina.content.map(criarItemRecente).join('');
  } catch (e) {
    console.error('Erro ao carregar últimas reclamações', e);
  }
}
carregarRecentes();

let map;

async function carregarGoogleMaps() {
    try {
        const resposta = await fetch(
            `${API_BASE}/usuarios/config/maps`
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar a configuração do Maps.");
        }

        const configuracao = await resposta.json();

        const script = document.createElement("script");

        script.src =
            `https://maps.googleapis.com/maps/api/js?key=${configuracao.apiKey}&loading=async&callback=initMap`;

        script.async = true;
        document.head.appendChild(script);

    } catch (erro) {
        console.error("Erro ao carregar Google Maps:", erro);
    }
}


// Normaliza o texto para facilitar a comparação das categorias
function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


// Define a cor de cada reclamação
function definirCorMarcador(reclamacao) {
    const categoria = normalizarTexto(reclamacao.categoria);
    const status = normalizarTexto(reclamacao.status);

    if (status.startsWith("resolvid")) {
        return "#64748b";
    }

    const cores = {
        "arvore caida": "#16a34a",
        "buraco na rua": "#dc2626",
        "rua sem asfalto": "#dc2626",
        "poste danificado": "#eab308",
        "poste sem iluminacao": "#eab308",
        "calcada danificada": "#2563eb",
        "alagamento": "#9333ea"
    };

    return cores[categoria] || "#64748b";
}


// Busca todas as reclamações no backend
async function carregarReclamacoesMapa() {
    try {
        const primeiraResposta = await fetch(
            `${API_BASE}/reclamacoes?page=0&size=100`
        );

        if (!primeiraResposta.ok) {
            throw new Error("Erro ao buscar reclamações.");
        }

        const primeiraPagina = await primeiraResposta.json();

        let reclamacoes = [...primeiraPagina.content];

        // Busca outras páginas, caso existam
        for (let pagina = 1; pagina < primeiraPagina.totalPages; pagina++) {
            const resposta = await fetch(
                `${API_BASE}/reclamacoes?page=${pagina}&size=100`
            );

            if (!resposta.ok) {
                throw new Error("Erro ao buscar outras reclamações.");
            }

            const dados = await resposta.json();
            reclamacoes.push(...dados.content);
        }

        adicionarMarcadores(reclamacoes);

    } catch (erro) {
        console.error("Erro ao carregar reclamações no mapa:", erro);
    }
}


// Cria os marcadores no Google Maps
function adicionarMarcadores(reclamacoes) {
    const janelaInfo = new google.maps.InfoWindow();

    reclamacoes.forEach(reclamacao => {
     
        if (
            reclamacao.latitude == null ||
            reclamacao.longitude == null
        ) {
            return;
        }

        const latitude = Number(reclamacao.latitude);
        const longitude = Number(reclamacao.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        const marcador = new google.maps.Marker({
            position: {
                lat: latitude,
                lng: longitude
            },
            map: map,
            title: reclamacao.titulo,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: definirCorMarcador(reclamacao),
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
                scale: 9
            }
        });

        marcador.addListener("click", function () {
            const conteudo = `
                <div style="max-width: 230px; padding: 5px;">
                    <strong>${esc(reclamacao.titulo)}</strong>
                    <p style="margin: 6px 0;">
                        ${esc(reclamacao.categoria)}
                    </p>
                    <p style="margin: 6px 0;">
                        ${esc(reclamacao.bairro || "")}
                    </p>
                    <p style="margin: 6px 0;">
                        Status: ${esc(reclamacao.status)}
                    </p>
                    <a href="detalhe-reclamacao.html?id=${encodeURIComponent(reclamacao.id)}">
                        Ver reclamação
                    </a>
                </div>
            `;

            janelaInfo.setContent(conteudo);
            janelaInfo.open({
                anchor: marcador,
                map: map
            });
        });
    });
}


// Inicialização do mapa
function initMap() {
    const saoPaulo = {
        lat: -23.5505,
        lng: -46.6333
    };

    map = new google.maps.Map(
        document.getElementById("map"),
        {
            center: saoPaulo,
            zoom: 12
        }
    );

    carregarReclamacoesMapa();
}


carregarGoogleMaps();