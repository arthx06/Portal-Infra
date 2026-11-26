// api.js
const API_BASE = "https://portal-infra-backend.onrender.com";

// Token JWT guardado no navegador. É enviado no header Authorization, o que
// funciona em qualquer navegador (inclusive Safari, que bloqueia cookies de terceiros).
const TOKEN_KEY = "token";

const LINKS_ADMIN_DROPDOWN = [
    { id: "link-moderacao", href: "moderacao.html", texto: "Painel de Moderação" },
    { id: "link-validacao-resolucoes", href: "validar-resolucoes.html", texto: "Validar Resoluções" },
];

function obterToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function limparSessaoLocal() {
    try {
        localStorage.removeItem("usuario");
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // storage indisponível: nada a limpar
    }
}

function obterUsuarioCache() {
    try {
        const raw = localStorage.getItem("usuario");
        return raw ? JSON.parse(raw) : null;
    } catch {
        localStorage.removeItem("usuario");
        return null;
    }
}

function removerLinksAdminDropdown() {
    LINKS_ADMIN_DROPDOWN.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}

function aplicarEstadoHeader(usuario) {
    const btnEntrar = document.getElementById("btn-entrar");
    const userMenu = document.getElementById("user-menu");
    const nomeUsuario = document.getElementById("nome-usuario");
    const userDropdown = document.getElementById("user-dropdown");
    const btnSair = document.getElementById("btn-sair");

    if (usuario && usuario.nome) {
        if (btnEntrar) btnEntrar.style.display = "none";
        if (userMenu) userMenu.style.display = "block";
        if (nomeUsuario) nomeUsuario.textContent = usuario.nome;

        if (usuario.tipo === "ADMIN" && userDropdown) {
            LINKS_ADMIN_DROPDOWN.forEach(({ id, href, texto }) => {
                if (!document.getElementById(id)) {
                    const link = document.createElement("a");
                    link.id = id;
                    link.href = href;
                    link.textContent = texto;
                    if (btnSair) {
                        userDropdown.insertBefore(link, btnSair);
                    } else {
                        userDropdown.appendChild(link);
                    }
                }
            });
        } else {
            removerLinksAdminDropdown();
        }
    } else {
        if (btnEntrar) btnEntrar.style.display = "";
        if (userMenu) userMenu.style.display = "none";
        removerLinksAdminDropdown();
    }
}

async function apiFetch(path, options = {}) {
    // Monta os headers sem perder os que o chamador definiu.
    // Para FormData, não definimos Content-Type (o navegador cuida disso).
    const headers = new Headers(options.headers || {});
    const token = obterToken();

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", "Bearer " + token);
    }

    const resp = await fetch(API_BASE + path, {
        credentials: "include", // mantém o cookie como alternativa
        ...options,
        headers,
    });

    // Logout / desativação bem-sucedidos: apaga o token local também.
    if (
        resp.ok &&
        (path === "/usuarios/logout" || path === "/usuarios/me/desativar")
    ) {
        limparSessaoLocal();
    }

    // Somente o 401 (token inválido/expirado/ausente) derruba a sessão local.
    // 403 (sem permissão) ou 5xx (Render dormindo) NÃO deslogam o usuário.
    if (resp.status === 401) {
        limparSessaoLocal();
        aplicarEstadoHeader(null);
        if (document.body && document.body.dataset.protegida === "true") {
            window.location.replace("login.html");
        }
    }

    return resp;
}

// Consulta a sessão no servidor.
// - Retorna o usuário quando autenticado.
// - Retorna null quando NÃO autenticado (401 / autenticado=false).
// - Em falha de rede ou 5xx (ex.: Render acordando) devolve o cache local.
async function obterDadosSessao() {
    try {
        const r = await apiFetch("/usuarios/sessao");

        if (!r.ok) {
            if (r.status === 401) return null; // apiFetch já limpou a sessão local
            return obterUsuarioCache();
        }

        const dados = await r.json();

        if (!dados.autenticado) {
            limparSessaoLocal();
            aplicarEstadoHeader(null);
            if (document.body && document.body.dataset.protegida === "true") {
                window.location.replace("login.html");
            }
            return null;
        }

        const usuario = {
            id: dados.id,
            nome: dados.nome,
            email: dados.email,
            tipo: dados.tipo
        };

        localStorage.setItem("usuario", JSON.stringify(usuario));
        aplicarEstadoHeader(usuario);

        return usuario;

    } catch (erro) {
        console.error("Erro ao obter dados da sessão:", erro);
        // Falha de rede: confia no cache para não derrubar o usuário
        return obterUsuarioCache();
    }
}

// Usada por perfil.js, reclamacao.js e editar-reclamacao.js
async function sessaoAtiva() {
    const usuario = await obterDadosSessao();
    return usuario !== null;
}

// ==========================================
// Menu Mobile Hambúrguer e Header (Global)
// ==========================================
function initMenuMobileGlobal() {
    aplicarEstadoHeader(obterUsuarioCache());

    const menuToggle = document.getElementById("menu-toggle");
    const navMenu = document.getElementById("nav-menu");

    if (menuToggle && navMenu && !menuToggle.dataset.menuIniciado) {
        menuToggle.dataset.menuIniciado = "true";

        menuToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            const aberto = navMenu.classList.toggle("aberto");
            menuToggle.classList.toggle("aberto", aberto);
            menuToggle.setAttribute("aria-expanded", String(aberto));

            const dropdown = document.getElementById("user-dropdown");
            const botaoMenu = document.getElementById("user-menu-btn");
            if (dropdown && !dropdown.hidden) {
                dropdown.hidden = true;
                if (botaoMenu) botaoMenu.setAttribute("aria-expanded", "false");
            }
        });

        document.addEventListener("click", function (event) {
            if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                navMenu.classList.remove("aberto");
                menuToggle.classList.remove("aberto");
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });

        navMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navMenu.classList.remove("aberto");
                menuToggle.classList.remove("aberto");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenuMobileGlobal);
} else {
    initMenuMobileGlobal();
}

// ==========================================
// Acessibilidade (leitura em voz alta e preenchimento por voz)
// Todas as páginas que incluem api.js passam a carregar automaticamente
// acessibilidade.css e acessibilidade.js. A página login.html não usa
// api.js e inclui esses dois arquivos diretamente no <head>.
// ==========================================
(function carregarAcessibilidade() {
    if (!document.querySelector('link[href$="acessibilidade.css"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "acessibilidade.css";
        document.head.appendChild(css);
    }

    if (!document.querySelector('script[src$="acessibilidade.js"]')) {
        const script = document.createElement("script");
        script.src = "acessibilidade.js";
        document.head.appendChild(script);
    }
})();
