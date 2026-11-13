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

    // BLINDAGEM: Somente o erro 401 (Token inválido/expirado) derruba a sessão.
    // Erros 403 (Sem permissão) ou 500 (Erro no Render) não vão mais te deslogar!
    if (resp.status === 401) {
        localStorage.removeItem("usuario");
        aplicarEstadoHeader(null);
        if (document.body.dataset.protegida === "true") {
            window.location.replace("login.html");
        }
    }

    return resp;
}

async function obterDadosSessao() {
    try {
        const r = await apiFetch("/usuarios/sessao");

        // Se a rota falhar (ex: Render dormindo e deu 500), NÃO apaga o usuário, usa o cache.
        if (!r.ok) {
            if (r.status === 401) return null; // 401 já foi tratado e redirecionado pelo apiFetch
            return obterUsuarioCache();
        }

        const dados = await r.json();

        // Se o servidor responder 200 OK mas disser que não está autenticado
        if (!dados.autenticado) {
            localStorage.removeItem("usuario");
            aplicarEstadoHeader(null);
            if (document.body.dataset.protegida === "true") {
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
        // Em caso de falha de rede, confia no cache para não derrubar o usuário
        return obterUsuarioCache();
    }
}

// ==========================================
// Menu Mobile Hambúrguer e Header (Global)
// ==========================================
function initMenuMobileGlobal() {
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

// ==========================================
// Inicialização Principal da Aplicação
// ==========================================
async function initApp() {
    // 1. Aplica o estado inicial via cache para renderizar o header imediatamente sem piscar
    aplicarEstadoHeader(obterUsuarioCache());

    // 2. Consulta o backend para validar o cookie HttpOnly e atualizar os dados reais
    const usuarioServidor = await obterDadosSessao();

    // 3. Se a página for protegida e o servidor confirmar que não há sessão válida, redireciona
    if (!usuarioServidor && document.body.dataset.protegida === "true") {
        window.location.replace("login.html");
        return;
    }

    // 4. Inicializa o comportamento do menu mobile
    initMenuMobileGlobal();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}