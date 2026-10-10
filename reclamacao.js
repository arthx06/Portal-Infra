
const formulario = document.getElementById("form-reclamacao");
const mensagem = document.getElementById("mensagem-formulario");
const campoFoto = document.getElementById("foto");

// Use a URL do seu backend publicado no Render.
// Para testar localmente, utilize http://localhost:8080.
const API_BASE = "https://portal-infra-backend.onrender.com";

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    mensagem.textContent = "";

    const botao = formulario.querySelector(
        'button[type="submit"]'
    );

    const foto = campoFoto.files[0];

    // Validação da foto obrigatória.
    if (!foto) {
        mensagem.textContent = "Selecione uma foto do problema.";
        campoFoto.focus();
        return;
    }

    const formatosValidos = ["image/jpeg", "image/png"];

    if (!formatosValidos.includes(foto.type)) {
        mensagem.textContent = "Envie uma foto JPG ou PNG.";
        campoFoto.value = "";
        return;
    }

    if (foto.size > 5 * 1024 * 1024) {
        mensagem.textContent = "A foto deve ter no máximo 5 MB.";
        campoFoto.value = "";
        return;
    }

    // Recupera o usuário salvo no navegador após o login.
    const usuario = JSON.parse(
        localStorage.getItem("usuario") || "{}"
    );

    if (!usuario.id) {
        mensagem.textContent =
            "Não foi possível identificar sua conta. Entre novamente.";
        return;
    }

    const dados = {
        titulo: document.getElementById("titulo").value.trim(),
        categoria: document.getElementById("categoria").value,
        descricao: document.getElementById("descricao").value.trim(),
        endereco: document.getElementById("endereco").value.trim(),
        bairro: document.getElementById("bairro").value,
        gravidade: document.getElementById("gravidade").value
    };

    const formData = new FormData();

    // Parte JSON com os dados da reclamação.
    formData.append(
        "dados",
        new Blob(
            [JSON.stringify(dados)],
            { type: "application/json" }
        )
    );

    // Parte com o arquivo de imagem.
    formData.append("foto", foto);

    botao.disabled = true;
    botao.textContent = "Enviando...";

    try {
        const resposta = await fetch(
            `${API_BASE}/reclamacoes?usuarioId=${encodeURIComponent(usuario.id)}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!resposta.ok) {
            const erro = await resposta.text();

            throw new Error(
                erro || `Erro ao cadastrar (${resposta.status}).`
            );
        }

        const reclamacao = await resposta.json();

        mensagem.textContent =
            `Reclamação #${reclamacao.id} cadastrada com sucesso!`;

        formulario.reset();

    } catch (erro) {
        console.error("Erro ao enviar reclamação:", erro);

        mensagem.textContent =
            "Não foi possível enviar a reclamação. Verifique a conexão e tente novamente.";

    } finally {
        botao.disabled = false;
        botao.textContent = "Enviar reclamação";
    }
});
