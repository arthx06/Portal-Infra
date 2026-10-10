const API_BASE = "https://portal-infra-backend.onrender.com";
document.addEventListener("DOMContentLoaded", async function () {
    const usuarioLogado = localStorage.getItem("usuarioLogado");
    const usuario = JSON.parse(
        localStorage.getItem("usuario") || "{}"
    );

    if (usuarioLogado !== "true" || !usuario.id) {
        window.location.href = "login.html";
        return;
    }

    const campos = {
        nome: "nome",
        email: "email",
        telefone: "telefone",
        dataNascimento: "dataNascimento",
        cep: "cep",
        logradouro: "logradouro",
        numero: "numero",
        complemento: "complemento",
        bairro: "bairro",
        cidade: "cidade",
        uf: "estado"
    };

    try {
        const resposta = await fetch(
            `${API_BASE}/usuarios/${usuario.id}`
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar seu perfil.");
        }

        const perfil = await resposta.json();

        for (const [campoAPI, idHTML] of Object.entries(campos)) {
            const input = document.getElementById(idHTML);

            if (input) {
                input.value = perfil[campoAPI] ?? "";
            }
        }
    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        alert("Não foi possível carregar seus dados. Tente novamente.");
    }
});
