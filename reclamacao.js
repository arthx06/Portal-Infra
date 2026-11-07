const formulario = document.getElementById("form-reclamacao");
const mensagem = document.getElementById("mensagem-formulario");
const campoFoto = document.getElementById("foto");
const previewFotos = document.getElementById("preview-fotos");

document.getElementById("btnVoltar")?.addEventListener("click", function () {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "index.html";
    }
});

campoFoto.addEventListener("change", function () {
    previewFotos.innerHTML = "";

    const fotos = Array.from(campoFoto.files);

    if (fotos.length > 3) {
        mensagem.textContent = "Selecione no máximo 3 fotos.";
        campoFoto.value = "";
        return;
    }

    mensagem.textContent = "";

    fotos.forEach(foto => {
        const imagem = document.createElement("img");
        imagem.src = URL.createObjectURL(foto);
        imagem.alt = "Prévia da foto selecionada";

        previewFotos.appendChild(imagem);
    });
});
async function verificarSessao() {
    if (!(await sessaoAtiva())) {
        window.location.replace("login.html");
    }
}

verificarSessao();

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    mensagem.textContent = "";

    const botao = formulario.querySelector(
        'button[type="submit"]'
    );

    const fotos = Array.from(campoFoto.files);

    // Validação da quantidade de fotos.
    if (fotos.length === 0) {
        mensagem.textContent = "Selecione pelo menos uma foto do problema.";
        campoFoto.focus();
        return;
    }

    if (fotos.length > 3) {
        mensagem.textContent = "Selecione no máximo 3 fotos.";
        campoFoto.value = "";
        return;
    }

    const formatosValidos = ["image/jpeg", "image/png"];
    const tamanhoMaximo = 5 * 1024 * 1024;

    // Valida cada imagem individualmente.
    for (const foto of fotos) {
        if (!formatosValidos.includes(foto.type)) {
            mensagem.textContent = "Todas as fotos devem estar no formato JPG ou PNG.";
            campoFoto.value = "";
            return;
        }

        if (foto.size > tamanhoMaximo) {
            mensagem.textContent = "Cada foto deve ter no máximo 5 MB.";
            campoFoto.value = "";
            return;
        }
    }

    // Recupera o usuário salvo no navegador.
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

    // Dados da reclamação.
    formData.append(
        "dados",
        new Blob(
            [JSON.stringify(dados)],
            { type: "application/json" }
        )
    );

    // Adiciona todas as fotos com o mesmo nome de campo.
    fotos.forEach(foto => {
        formData.append("fotos", foto);
    });

    botao.disabled = true;
    botao.textContent = "Enviando...";

    try {
        const resposta = await apiFetch("/reclamacoes", {
            method: "POST",
            body: formData
        });

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
        previewFotos.innerHTML = "";

    } catch (erro) {
        console.error("Erro ao enviar reclamação:", erro);

        mensagem.textContent =
            "Não foi possível enviar a reclamação. Verifique a conexão e tente novamente.";

    } finally {
        botao.disabled = false;
        botao.textContent = "Enviar reclamação";
    }
});
