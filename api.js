// api.js
const API_BASE = "https://portal-infra-backend.onrender.com";

const LINKS_ADMIN_DROPDOWN = [
    { id: "link-moderacao", href: "moderacao.html", texto: "Painel de Moderação" },
    { id: "link-validacao-resolucoes", href: "validar-resolucoes.html", texto: "Validar Resoluções" },
];

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
    const resp = await fetch(API_BASE + path, {
        credentials: "include", // envia o cookie JWT
        ...options,
    });

    // Somente o 401 (token inválido/expirado/não enviado) derruba a sessão local.
    // 403 (sem permissão) ou 5xx (Render dormindo) NÃO deslogam o usuário.
    if (resp.status === 401) {
        localStorage.removeItem("usuario");
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
            if (r.status === 401) return null; // apiFetch já limpou o cache
            return obterUsuarioCache();
        }

        const dados = await r.json();

        if (!dados.autenticado) {
            localStorage.removeItem("usuario");
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
// (antes não existia e causava ReferenceError).
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
