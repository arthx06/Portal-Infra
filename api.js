// api.js
const API_BASE = "https://portal-infra-backend.onrender.com";

async function apiFetch(path, options = {}) {
  const resp = await fetch(API_BASE + path, {
    credentials: "include",          // envia o cookie JWT
    ...options,
  });
  if (resp.status === 401 || resp.status === 403) {
    localStorage.removeItem("usuario");
    // só redireciona se a página exigir login
    if (document.body.dataset.protegida === "true") {
      window.location.replace("login.html");
    }
  }
  return resp;
}
async function sessaoAtiva() {
    try {
        const r = await apiFetch("/usuarios/sessao");

        if (!r.ok) {
            return false;
        }

        const dados = await r.json();

        return dados.autenticado === true;
    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        return false;
    }
}

async function obterDadosSessao() {
    try {
        const r = await apiFetch("/usuarios/sessao");

        if (!r.ok) {
            return null;
        }

        const dados = await r.json();

        if (!dados.autenticado) {
            return null;
        }

        const usuario = {
            id: dados.id,
            nome: dados.nome,
            email: dados.email,
            tipo: dados.tipo
        };

        localStorage.setItem("usuario", JSON.stringify(usuario));

        return usuario;

    } catch (erro) {
        console.error("Erro ao obter dados da sessão:", erro);
        return null;
    }
}


// ==========================================
// Menu Mobile Hambúrguer (Global)
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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenuMobileGlobal);
} else {
    initMenuMobileGlobal();
}