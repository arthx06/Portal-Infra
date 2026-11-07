(function () {
    const $ = (id) => document.getElementById(id);
    const id = Number(new URLSearchParams(window.location.search).get("id"));

    function mostrarErro(msg) {
        $("detalhe-erro").textContent = msg;
        $("detalhe-erro").hidden = false;
    }

    function formatarData(valor) {
        const d = new Date(valor);
        return isNaN(d) ? "—" : d.toLocaleDateString("pt-BR");
    }

    function preencher(r) {
        document.title = r.titulo + " | Portal-Infra";
        // Carrega as fotos da reclamação
    const fotos = r.fotos && r.fotos.length > 0
        ? r.fotos
        : (r.fotoUrl ? [r.fotoUrl] : []);

    const fotoPrincipal = $("detalhe-foto");
    const miniaturas = $("detalhe-miniaturas");

    miniaturas.innerHTML = "";

    let fotoSelecionada = 0;

    function atualizarGaleria() {
        fotoPrincipal.src = fotos[fotoSelecionada];
        fotoPrincipal.alt = `Foto ${fotoSelecionada + 1} da reclamação`;

        miniaturas.innerHTML = "";

        fotos.forEach((url, index) => {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "miniatura-foto";

            if (index === fotoSelecionada) {
                botao.classList.add("selecionada");
            }

            botao.setAttribute(
                "aria-label",
                `Visualizar foto ${index + 1}`
            );

            const imagem = document.createElement("img");
            imagem.src = url;
            imagem.alt = `Foto ${index + 1}`;

            botao.appendChild(imagem);

            botao.addEventListener("click", function () {
                fotoSelecionada = index;
                atualizarGaleria();
            });

            miniaturas.appendChild(botao);
        });

        miniaturas.hidden = fotos.length <= 1;
    }

    if (fotos.length > 0) {
        atualizarGaleria();
    } else {
        fotoPrincipal.removeAttribute("src");
        fotoPrincipal.alt = "Nenhuma foto disponível";
        miniaturas.hidden = true;
    }
        const resolvida = String(r.status).toLowerCase().startsWith("resolv");
        $("detalhe-status").textContent = r.status;
        $("detalhe-status").className = "status " + (resolvida ? "resolved" : "pending");
        $("detalhe-categoria").textContent = r.categoria;
        $("detalhe-titulo").textContent = r.titulo;
        $("detalhe-local").textContent = [r.endereco, r.bairro].filter(Boolean).join(" — ");
        $("detalhe-descricao").textContent = r.descricao;
        $("detalhe-gravidade").textContent = r.gravidade || "—";
        $("detalhe-data").textContent = formatarData(r.dataCriacao);
        $("detalhe-id").textContent = "#" + r.id;
        $("detalhe").hidden = false;
        $("comentarios").hidden = false;
        reclamacaoAtualId = r.id;      // variável global do comentarios.js
        carregarComentarios(r.id);
    }

    async function carregar() {
        if (!Number.isInteger(id) || id <= 0) {
            mostrarErro("Reclamação não encontrada.");
            return;
        }
        try {
            const resposta = await apiFetch("/reclamacoes/" + id);
            if (resposta.status === 404) {
                mostrarErro("Reclamação não encontrada.");
                return;
            }
            if (!resposta.ok) throw new Error();
            preencher(await resposta.json());
        } catch (e) {
            mostrarErro("Não foi possível carregar a reclamação. Tente novamente.");
        }
    }

    carregar();
})();