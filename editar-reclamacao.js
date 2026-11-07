
document.addEventListener("DOMContentLoaded", async function () {

    const formulario = document.getElementById("form-reclamacao");
    const mensagem = document.getElementById("mensagem-formulario");
    const fotosAtuais = document.getElementById("fotos-atuais");

    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");

    const botaoEnviar = formulario.querySelector('button[type="submit"]');

    let carregamentoConcluido = false;

    // Voltar para a página de reclamações.
    document.getElementById("btnVoltar")?.addEventListener("click", function () {
        window.location.href = "reclamacoes.html";
    });

    if (!id || !/^\d+$/.test(id)) {
        mensagem.textContent = "Identificador da reclamação inválido.";
        botaoEnviar.disabled = true;
        return;
    }

    if (!(await sessaoAtiva())) {
        window.location.replace("login.html");
        return;
    }

    // Valida o arquivo selecionado.
    function validarFoto(foto) {
        const formatosValidos = ["image/jpeg", "image/png"];
        const tamanhoMaximo = 5 * 1024 * 1024;

        if (!formatosValidos.includes(foto.type)) {
            mensagem.textContent = "A foto deve estar no formato JPG ou PNG.";
            return false;
        }

        if (foto.size > tamanhoMaximo) {
            mensagem.textContent = "A foto deve ter no máximo 5 MB.";
            return false;
        }

        mensagem.textContent = "";
        return true;
    }

    // Cria um cartão para cada foto.
    function criarCartaoFoto(foto) {
        const cartao = document.createElement("div");
        cartao.className = "foto-atual-card";

        const imagem = document.createElement("img");
        imagem.src = foto.url;
        imagem.alt = "Foto atual da reclamação";

        const controles = document.createElement("div");
        controles.className = "controles-foto";

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png";
        input.hidden = true;

        const botaoEscolher = document.createElement("button");
        botaoEscolher.type = "button";
        botaoEscolher.textContent = "Escolher outra foto";
        botaoEscolher.className = "btn-substituir-foto";

        const botaoConfirmar = document.createElement("button");
        botaoConfirmar.type = "button";
        botaoConfirmar.textContent = "Confirmar substituição";
        botaoConfirmar.className = "btn-confirmar-foto";
        botaoConfirmar.hidden = true;

        const status = document.createElement("p");
        status.className = "status-foto";

        let arquivoSelecionado = null;
        let urlTemporaria = null;

        botaoEscolher.addEventListener("click", function () {
            input.click();
        });

        input.addEventListener("change", function () {
            const arquivo = input.files[0];

            if (!arquivo) return;

            if (!validarFoto(arquivo)) {
                input.value = "";
                arquivoSelecionado = null;
                botaoConfirmar.hidden = true;
                return;
            }

            arquivoSelecionado = arquivo;

            if (urlTemporaria) {
                URL.revokeObjectURL(urlTemporaria);
            }

            urlTemporaria = URL.createObjectURL(arquivo);
            imagem.src = urlTemporaria;

            status.textContent = "Pré-visualização da nova foto.";
            botaoConfirmar.hidden = false;
        });

        botaoConfirmar.addEventListener("click", async function () {
            if (!arquivoSelecionado) return;

            if (!validarFoto(arquivoSelecionado)) return;

            botaoConfirmar.disabled = true;
            botaoEscolher.disabled = true;
            botaoConfirmar.textContent = "Substituindo...";
            status.textContent = "Enviando nova imagem...";

            const formData = new FormData();
            formData.append("foto", arquivoSelecionado);

            try {
                const resposta = await apiFetch(
                    `/reclamacoes/${id}/fotos/${foto.id}`,
                    {
                        method: "PATCH",
                        body: formData
                    }
                );

                if (!resposta.ok) {
                    const erro = await resposta.text();
                    throw new Error(
                        erro || `Erro ao substituir foto (${resposta.status}).`
                    );
                }

                status.textContent = "Foto substituída com sucesso!";

                // Recarrega os dados para exibir a URL definitiva.
                await carregarReclamacao();

                mensagem.textContent = "Foto substituída com sucesso!";

            } catch (erro) {
                console.error("Erro ao substituir foto:", erro);
                status.textContent = erro.message;

                botaoConfirmar.disabled = false;
                botaoEscolher.disabled = false;
                botaoConfirmar.textContent = "Confirmar substituição";
            }
        });

        controles.appendChild(input);
        controles.appendChild(botaoEscolher);
        controles.appendChild(botaoConfirmar);
        controles.appendChild(status);

        cartao.appendChild(imagem);
        cartao.appendChild(controles);

        return cartao;
    }

    // Carrega os dados da reclamação.
    async function carregarReclamacao() {
        try {
            const resposta = await apiFetch(`/reclamacoes/${id}`);

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar a reclamação.");
            }

            const reclamacao = await resposta.json();

            document.getElementById("titulo").value = reclamacao.titulo || "";
            document.getElementById("categoria").value = reclamacao.categoria || "";
            document.getElementById("descricao").value = reclamacao.descricao || "";
            document.getElementById("endereco").value = reclamacao.endereco || "";
            document.getElementById("bairro").value = reclamacao.bairro || "";
            document.getElementById("gravidade").value = reclamacao.gravidade || "";

            fotosAtuais.replaceChildren();

         
            // Usa os dados detalhados, que possuem o ID de cada foto.
            const fotos = reclamacao.fotosDetalhadas || [];

            if (fotos.length > 0) {
                fotos.forEach(foto => {
                    fotosAtuais.appendChild(criarCartaoFoto(foto));
                });

            } else if (reclamacao.fotos?.length) {
                // Compatibilidade com reclamações sem dados detalhados.
                reclamacao.fotos.forEach(url => {
                    const imagem = document.createElement("img");
                    imagem.src = url;
                    imagem.alt = "Foto atual da reclamação";
                    fotosAtuais.appendChild(imagem);
                });

                const aviso = document.createElement("p");
                aviso.textContent =
                    "Não foi possível carregar os identificadores das fotos para substituí-las.";
                fotosAtuais.appendChild(aviso);

            } else {
                fotosAtuais.textContent = "Nenhuma foto cadastrada.";
            }

            carregamentoConcluido = true;

        } catch (erro) {
            console.error("Erro ao carregar reclamação:", erro);
            mensagem.textContent = erro.message;
            botaoEnviar.disabled = true;
        }
    }

    await carregarReclamacao();

    // Envia somente os dados da reclamação.
    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!carregamentoConcluido) {
            mensagem.textContent = "Aguarde o carregamento da reclamação.";
            return;
        }

        mensagem.textContent = "";

        const dados = {
            titulo: document.getElementById("titulo").value.trim(),
            categoria: document.getElementById("categoria").value,
            descricao: document.getElementById("descricao").value.trim(),
            endereco: document.getElementById("endereco").value.trim(),
            bairro: document.getElementById("bairro").value,
            gravidade: document.getElementById("gravidade").value
        };

        const formData = new FormData();

        formData.append(
            "dados",
            new Blob(
                [JSON.stringify(dados)],
                { type: "application/json" }
            )
        );

        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Salvando...";

        try {
            const resposta = await apiFetch(`/reclamacoes/${id}`, {
                method: "PATCH",
                body: formData
            });

            if (!resposta.ok) {
                const erro = await resposta.text();
                throw new Error(
                    erro || `Erro ao atualizar (${resposta.status}).`
                );
            }

            mensagem.textContent = "Reclamação atualizada com sucesso!";

            setTimeout(() => {
                window.location.href =
                    `detalhe-reclamacao.html?id=${encodeURIComponent(id)}&origem=reclamacoes.html`;
            }, 1000);

        } catch (erro) {
            console.error("Erro ao editar reclamação:", erro);
            mensagem.textContent =
                erro.message || "Não foi possível atualizar a reclamação.";

        } finally {
            botaoEnviar.disabled = false;
            botaoEnviar.textContent = "Salvar alterações";
        }
    });

});
