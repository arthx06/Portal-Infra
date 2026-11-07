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
