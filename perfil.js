
const API_BASE = "https://portal-infra-backend.onrender.com";

document.addEventListener("DOMContentLoaded", async function () {
    const usuarioLogado = localStorage.getItem("usuarioLogado");
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    if (usuarioLogado !== "true" || !usuario.id) {
        window.location.href = "login.html";
        return;
    }

    const formulario = document.getElementById("formularioPerfil");
    const botaoAlterar = document.getElementById("botaoAlterar");
    const botaoSalvar = document.getElementById("botaoSalvar");
    const botaoCancelar = document.getElementById("botaoCancelar");

    if (!formulario || !botaoAlterar || !botaoSalvar || !botaoCancelar) {
        console.error("Verifique os IDs do formulário e dos botões no HTML.");
        return;
    }

    // Relaciona os campos da API com os IDs do HTML.
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

    // Campos editáveis nesta tela.
    // O e-mail possui um processo próprio de verificação.
    const camposEditaveis = [
        "nome",
        "telefone",
        "dataNascimento",
        "cep",
        "logradouro",
        "numero",
        "complemento",
        "bairro",
        "cidade",
        "estado"
    ];

    const inputsEditaveis = camposEditaveis
        .map(id => document.getElementById(id))
        .filter(input => input !== null);

    let valoresOriginais = {};

    function guardarValores() {
        valoresOriginais = {};

        inputsEditaveis.forEach(input => {
            valoresOriginais[input.id] = input.value;
        });
    }

    function definirModoEdicao(editar) {
        inputsEditaveis.forEach(input => {
            input.disabled = !editar;
        });

        botaoAlterar.style.display = editar ? "none" : "inline-block";
        botaoSalvar.style.display = editar ? "inline-block" : "none";
        botaoCancelar.style.display = editar ? "inline-block" : "none";
    }

    // Carrega os dados atuais do banco.
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

        guardarValores();
        definirModoEdicao(false);

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        alert("Não foi possível carregar seus dados. Tente novamente.");
        return;
    }

    // Habilita a edição.
    botaoAlterar.addEventListener("click", function () {
        guardarValores();
        definirModoEdicao(true);
    });

    // Cancela as alterações.
    botaoCancelar.addEventListener("click", function () {
        inputsEditaveis.forEach(input => {
            input.value = valoresOriginais[input.id] ?? "";
        });

        definirModoEdicao(false);
    });

    // Envia os dados para o backend.
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();

            
    function obterValor(id) {
        const campo = document.getElementById(id);

        if (!campo) {
            throw new Error(
                `Campo com id="${id}" não encontrado no HTML do perfil.`
            );
        }

        return campo.value.trim();
    }

    const payload = {
        nome: obterValor("nome"),
        telefone: obterValor("telefone").replace(/\D/g, ""),
        dataNascimento: obterValor("dataNascimento") || null,
        cep: obterValor("cep").replace(/\D/g, ""),
        logradouro: obterValor("logradouro"),
        numero: obterValor("numero"),
        complemento: obterValor("complemento"),
        bairro: obterValor("bairro"),
        cidade: obterValor("cidade"),
        uf: obterValor("estado").toUpperCase()
    };

        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";

        try {
            const resposta = await fetch(
                `${API_BASE}/usuarios/${usuario.id}/perfil`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            const resultado = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    resultado.message ||
                    "Verifique os dados e o endpoint de atualização."
                );
            }

            // Atualiza a tela com os dados retornados pelo backend.
            for (const [campoAPI, idHTML] of Object.entries(campos)) {
                const input = document.getElementById(idHTML);

                if (input && resultado[campoAPI] !== undefined) {
                    input.value = resultado[campoAPI] ?? "";
                }
            }

            guardarValores();
            definirModoEdicao(false);

            // Atualiza os dados locais básicos, se necessário.
            const usuarioAtualizado = {
                ...usuario,
                nome: resultado.nome ?? payload.nome
            };

            localStorage.setItem(
                "usuario",
                JSON.stringify(usuarioAtualizado)
            );

            alert("Informações atualizadas com sucesso!");

        } catch (erro) {
            console.error("Erro ao salvar perfil:", erro);
            alert("Não foi possível salvar: " + erro.message);

        } finally {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = "Salvar alterações";
        }
    });
});
