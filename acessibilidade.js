// acessibilidade.js
// -----------------------------------------------------------------------------
// Recursos de acessibilidade do Portal Infra baseados na Web Speech API:
//   1) Leitura da página em áudio (SpeechSynthesis) — disponível em TODAS as páginas.
//   2) Preenchimento de formulários por voz (SpeechRecognition) — desativado nas
//      telas de login, cadastro, recuperação/redefinição de senha e no formulário
//      de alteração de senha do perfil, para evitar erros de reconhecimento em
//      senhas e dados de acesso.
//
// O script é autocontido (IIFE) e não cria variáveis globais, portanto não entra
// em conflito com api.js, comentarios.js, scriptlogin.js etc.
// -----------------------------------------------------------------------------
(function () {
    "use strict";

    if (window.__a11yIniciado) return;
    window.__a11yIniciado = true;

    const synth = window.speechSynthesis || null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

    const IDIOMA = "pt-BR";
    const CHAVE_VELOCIDADE = "a11y_velocidade";
    const TAMANHO_MAX_TRECHO = 220; // evita o corte de falas longas em alguns navegadores

    // Campos que NUNCA podem ser preenchidos por voz (senhas e telas de acesso).
    const SELETOR_BLOQUEADO = [
        "#formularioSenha",
        "#login-form",
        "#cadastro-form",
        "#recuperar-form",
        "#redefinir-form",
        "#area-verificacao",
        "#form-login",
        "#form-cadastro",
        "#form-recuperar",
        ".campo-senha",
        ".a11y-widget",
        "[data-sem-voz]"
    ].join(", ");

    // Rótulos para campos que não possuem <label> nem placeholder úteis.
    const ROTULOS_POR_ID = {
        "filtro-busca": "Pesquisar reclamação",
        "filtro-categoria": "Tipo de problema",
        "filtro-bairro": "Bairro",
        "filtro-status": "Status",
        "novo-comentario-texto": "Comentário",
        "input-busca": "Busca"
    };

    const INLINE = new Set([
        "A", "SPAN", "STRONG", "B", "EM", "I", "SMALL", "LABEL",
        "CODE", "ABBR", "MARK", "SUB", "SUP", "TIME", "U", "S"
    ]);

    const TAGS_IGNORADAS = new Set([
        "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "IFRAME",
        "HEAD", "CANVAS", "OPTION", "OPTGROUP"
    ]);

    const REGEX_SIMBOLOS =
        /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}×]/gu;

    let VOZ_PERMITIDA = true; // definido no init, conforme a página

    // =========================================================================
    // UTILITÁRIOS
    // =========================================================================
    function limpar(texto) {
        return String(texto == null ? "" : texto)
            .replace(REGEX_SIMBOLOS, "")
            .replace(/#(\d+)/g, "número $1")
            .replace(/[•|]/g, ", ")
            .replace(/\*/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function rotuloLimpo(texto) {
        return limpar(texto).replace(/\s*:\s*$/, "");
    }

    function norm(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function encurtar(texto, max) {
        const t = String(texto || "");
        const limite = max || 140;
        return t.length > limite ? t.slice(0, limite) + "..." : t;
    }

    function cssEsc(valor) {
        return window.CSS && CSS.escape ? CSS.escape(valor) : valor;
    }

    function reduzMovimento() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function elementoVisivel(el) {
        if (!el || !el.isConnected) return false;
        if (el.getClientRects().length === 0) return false;
        return getComputedStyle(el).visibility !== "hidden";
    }

    function disparar(el, tipo) {
        el.dispatchEvent(new Event(tipo, { bubbles: true }));
    }

    function dividirTexto(texto) {
        const frases = texto.match(/[^.!?]+[.!?]*\s*/g) || [texto];
        const saida = [];
        let atual = "";

        const empurrar = () => {
            if (atual.trim()) saida.push(atual.trim());
            atual = "";
        };

        for (const frase of frases) {
            if (frase.length > TAMANHO_MAX_TRECHO) {
                empurrar();
                let parte = "";
                for (const palavra of frase.split(/\s+/)) {
                    if ((parte + " " + palavra).length > TAMANHO_MAX_TRECHO) {
                        if (parte) saida.push(parte.trim());
                        parte = palavra;
                    } else {
                        parte += (parte ? " " : "") + palavra;
                    }
                }
                if (parte) atual = parte + " ";
                continue;
            }

            if ((atual + frase).length > TAMANHO_MAX_TRECHO) empurrar();
            atual += frase;
        }

        empurrar();
        return saida;
    }

    // =========================================================================
    // SÍNTESE DE VOZ (BASE)
    // =========================================================================
    const VELOCIDADE_MIN = 0.5;
    const VELOCIDADE_MAX = 2;
    const VELOCIDADE_PADRAO = 1;

    let velocidade = VELOCIDADE_PADRAO;
    try {
        const salvo = parseFloat(localStorage.getItem(CHAVE_VELOCIDADE));
        if (salvo >= VELOCIDADE_MIN && salvo <= VELOCIDADE_MAX) velocidade = salvo;
    } catch (e) { /* storage indisponível */ }

    let vozPortugues = null;
    function escolherVoz() {
        if (!synth) return;
        const vozes = synth.getVoices();
        vozPortugues =
            vozes.find((v) => v.lang === "pt-BR") ||
            vozes.find((v) => v.lang && v.lang.toLowerCase().startsWith("pt")) ||
            null;
    }
    if (synth) {
        escolherVoz();
        synth.onvoiceschanged = escolherVoz;
    }

    let falaResolver = null;
    let falaAtual = null; // mantém referência para evitar coleta de lixo prematura

    function cancelarFala() {
        if (synth) {
            try { synth.cancel(); } catch (e) { /* ignora */ }
        }
        if (falaResolver) {
            const resolver = falaResolver;
            falaResolver = null;
            resolver();
        }
    }

    function utter(texto) {
        return new Promise((resolve) => {
            if (!synth || !texto) {
                resolve();
                return;
            }

            if (synth.speaking || synth.pending) cancelarFala();
            if (synth.paused) synth.resume();

            const u = new SpeechSynthesisUtterance(texto);
            u.lang = IDIOMA;
            u.rate = velocidade;
            if (vozPortugues) u.voice = vozPortugues;

            let feito = false;
            const fim = () => {
                if (feito) return;
                feito = true;
                if (falaResolver === fim) falaResolver = null;
                resolve();
            };

            falaResolver = fim;
            falaAtual = u;
            u.onend = fim;
            u.onerror = fim;
            synth.speak(u);
        });
    }

    // =========================================================================
    // INTERFACE (WIDGET FLUTUANTE)
    // =========================================================================
    const ui = {};

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto != null) el.textContent = texto;
        return el;
    }

    function botao(texto, classe, aoClicar) {
        const b = criar("button", "a11y-btn " + (classe || ""), texto);
        b.type = "button";
        b.addEventListener("click", aoClicar);
        return b;
    }

    function status(mensagem) {
        if (ui.status) ui.status.textContent = mensagem || "";
    }

    function criarWidget() {
        const widget = criar("div", "a11y-widget");
        widget.id = "a11y-widget";

        // Botão flutuante
        const fab = criar("button", "a11y-fab");
        fab.type = "button";
        fab.setAttribute("aria-label", "Abrir ferramentas de acessibilidade");
        fab.setAttribute("aria-expanded", "false");
        fab.setAttribute("aria-controls", "a11y-painel");
        fab.innerHTML =
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
            '<circle cx="12" cy="4.5" r="2.2" fill="currentColor"/>' +
            '<path d="M4 8.5h16M12 8.5v5.5m0 0l-3.5 6m3.5-6l3.5 6" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' +
            '<span class="a11y-fab-texto">Acessibilidade</span>';
        ui.fab = fab;

        // Painel
        const painel = criar("div", "a11y-painel");
        painel.id = "a11y-painel";
        painel.setAttribute("role", "dialog");
        painel.setAttribute("aria-label", "Ferramentas de acessibilidade");
        painel.hidden = true;
        ui.painel = painel;

        painel.appendChild(criar("h2", "a11y-titulo", "Acessibilidade"));

        // --- Leitura ---
        const secLeitura = criar("section", "a11y-secao");
        secLeitura.appendChild(criar("h3", "a11y-subtitulo", "Ler em voz alta"));

        ui.btnLer = botao("Ler página", "a11y-btn-primario", lerPagina);
        ui.btnPausa = botao("Pausar", "", alternarPausa);
        ui.btnParar = botao("Parar", "", pararTudo);
        ui.btnAnterior = botao("Anterior", "", () => pular(-1));
        ui.btnProximo = botao("Próximo", "", () => pular(1));
        ui.btnSelecao = botao("Ler texto selecionado", "", lerSelecao);
        ui.btnSelecao.addEventListener("mousedown", (e) => e.preventDefault()); // mantém a seleção

        const linhaPrincipal = criar("div", "a11y-linha");
        linhaPrincipal.append(ui.btnLer, ui.btnPausa, ui.btnParar);
        const linhaNavegacao = criar("div", "a11y-linha");
        linhaNavegacao.append(ui.btnAnterior, ui.btnProximo);

        const campoVelocidade = criar("label", "a11y-velocidade");
        const textoVelocidade = criar("span", "", "Velocidade: ");
        ui.valorVelocidade = criar("output", "", velocidade.toFixed(1) + "x");
        textoVelocidade.appendChild(ui.valorVelocidade);
        const range = document.createElement("input");
        range.type = "range";
        range.min = String(VELOCIDADE_MIN);
        range.max = String(VELOCIDADE_MAX);
        range.step = "0.1";
        range.value = String(velocidade);
        range.setAttribute("aria-valuetext", velocidade.toFixed(1) + "x");
        range.addEventListener("input", () => {
            velocidade = parseFloat(range.value) || VELOCIDADE_PADRAO;
            ui.valorVelocidade.textContent = velocidade.toFixed(1) + "x";
            range.setAttribute("aria-valuetext", velocidade.toFixed(1) + "x");
            try { localStorage.setItem(CHAVE_VELOCIDADE, String(velocidade)); } catch (e) { /* ignora */ }
        });

        // Marcadores visuais: extremos, 1x (padrão) e 1,5x
        const trilho = criar("div", "a11y-range-wrap");
        const marcas = criar("div", "a11y-marcas");
        marcas.setAttribute("aria-hidden", "true");
        [
            { valor: VELOCIDADE_MIN, texto: "0,5x", destaque: false },
            { valor: 1, texto: "1x padrão", destaque: true },
            { valor: 1.5, texto: "1,5x", destaque: true },
            { valor: VELOCIDADE_MAX, texto: "2x", destaque: false }
        ].forEach((m) => {
            const marca = criar("span", "a11y-marca" + (m.destaque ? " a11y-marca-destaque" : ""));
            marca.style.setProperty(
                "--pos",
                String((m.valor - VELOCIDADE_MIN) / (VELOCIDADE_MAX - VELOCIDADE_MIN))
            );
            marca.appendChild(criar("i", "a11y-marca-traco"));
            marca.appendChild(criar("span", "a11y-marca-texto", m.texto));
            marcas.appendChild(marca);
        });
        trilho.append(range, marcas);
        campoVelocidade.append(textoVelocidade, trilho);

        secLeitura.append(linhaPrincipal, linhaNavegacao, ui.btnSelecao, campoVelocidade);
        painel.appendChild(secLeitura);

        // --- Voz ---
        const secVoz = criar("section", "a11y-secao");
        secVoz.appendChild(criar("h3", "a11y-subtitulo", "Preencher por voz"));

        if (VOZ_PERMITIDA) {
            ui.btnVoz = botao("Iniciar preenchimento por voz", "a11y-btn-primario", iniciarPreenchimento);
            secVoz.appendChild(ui.btnVoz);
            secVoz.appendChild(criar(
                "p", "a11y-dica",
                "Clique em um campo (opcional) e inicie. O sistema lê o nome de cada campo e ouve sua resposta. " +
                "Comandos: próximo, voltar, repetir, limpar, enviar e parar."
            ));
        } else {
            secVoz.appendChild(criar(
                "p", "a11y-dica",
                "O preenchimento por voz fica indisponível nesta tela para evitar erros em e-mail, senha e dados de acesso. " +
                "A leitura em voz alta continua funcionando."
            ));
        }
        painel.appendChild(secVoz);

        ui.status = criar("p", "a11y-status");
        ui.status.setAttribute("role", "status");
        ui.status.setAttribute("aria-live", "polite");
        painel.appendChild(ui.status);

        widget.append(painel, fab);
        document.body.appendChild(widget);
        ui.widget = widget;

        // Abrir / fechar painel
        fab.addEventListener("click", () => {
            const abrir = painel.hidden;
            painel.hidden = !abrir;
            fab.setAttribute("aria-expanded", String(abrir));
            if (abrir) ui.btnLer.focus();
        });

        document.addEventListener("click", (e) => {
            if (!painel.hidden && !widget.contains(e.target)) {
                painel.hidden = true;
                fab.setAttribute("aria-expanded", "false");
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !painel.hidden) {
                painel.hidden = true;
                fab.setAttribute("aria-expanded", "false");
                fab.focus();
            }
        });

        // Recursos indisponíveis no navegador
        if (!synth) {
            [ui.btnLer, ui.btnPausa, ui.btnParar, ui.btnAnterior, ui.btnProximo, ui.btnSelecao]
                .forEach((b) => { b.disabled = true; });
            status("Seu navegador não suporta leitura em voz alta.");
        }
        if (VOZ_PERMITIDA && !SR) {
            ui.btnVoz.disabled = true;
            status("Seu navegador não suporta reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge.");
        }

        atualizarUI();
    }

    function atualizarUI() {
        if (!ui.widget) return;

        const lendo = Leitura.estado === "lendo";
        const pausado = Leitura.estado === "pausado";
        const temLeitura = lendo || pausado;

        ui.btnPausa.textContent = pausado ? "Continuar" : "Pausar";
        ui.btnPausa.disabled = !synth || !temLeitura;
        ui.btnParar.disabled = !synth || !(temLeitura || Voz.ativo);
        ui.btnAnterior.disabled = !synth || !temLeitura;
        ui.btnProximo.disabled = !synth || !temLeitura;

        if (ui.btnVoz) {
            ui.btnVoz.textContent = Voz.ativo
                ? "Parar preenchimento por voz"
                : "Iniciar preenchimento por voz";
        }

        ui.fab.dataset.ativo = lendo || Voz.ativo ? "true" : "false";
    }

    // =========================================================================
    // DIÁLOGOS / ÁREA ATIVA
    // =========================================================================
    // Se houver um modal ou gaveta aberto, ele passa a ser a "área ativa".
    function encontrarDialogoVisivel() {
        let achado = null;
        document
            .querySelectorAll(".modal-denuncia, #modal-comentarios, .mod-drawer.open, .val-drawer.open")
            .forEach((el) => {
                if (elementoVisivel(el)) achado = el;
            });
        return achado;
    }

    // =========================================================================
    // LEITURA DA PÁGINA
    // =========================================================================
    const Leitura = { fila: [], i: 0, estado: "parado", tk: 0 };
    let elementoDestacado = null;

    function destacar(el) {
        if (elementoDestacado) {
            elementoDestacado.classList.remove("a11y-lendo-agora");
            elementoDestacado = null;
        }
        if (!el || !el.classList || el === document.body || el === document.documentElement) return;

        el.classList.add("a11y-lendo-agora");
        elementoDestacado = el;
        try {
            el.scrollIntoView({ block: "center", behavior: reduzMovimento() ? "auto" : "smooth" });
        } catch (e) { /* ignora */ }
    }

    function blocoDe(el) {
        let atual = el;
        while (atual && atual.parentElement && INLINE.has(atual.tagName)) {
            atual = atual.parentElement;
        }
        return atual;
    }

    function ignorarNo(el) {
        if (TAGS_IGNORADAS.has(el.tagName.toUpperCase())) return true;
        if (el.id === "a11y-widget" || (el.classList && el.classList.contains("menu-toggle"))) return true;
        if (el.hidden || el.getAttribute("aria-hidden") === "true") return true;

        const estilo = getComputedStyle(el);
        return estilo.display === "none" || estilo.visibility === "hidden";
    }

    function rotuloExplicito(el) {
        const aria = limpar(el.getAttribute("aria-label"));
        if (aria) return aria;

        if (el.id) {
            const label = document.querySelector('label[for="' + cssEsc(el.id) + '"]');
            if (label) return rotuloLimpo(label.textContent);
        }

        const envolvente = el.closest("label");
        if (envolvente) return rotuloLimpo(envolvente.textContent);

        return "";
    }

    function rotuloCampo(el) {
        const explicito = rotuloExplicito(el);
        if (explicito) return explicito;

        if (el.id && ROTULOS_POR_ID[el.id]) return ROTULOS_POR_ID[el.id];

        const placeholder = limpar(el.getAttribute("placeholder")).replace(/[.…]+$/, "");
        if (placeholder) return placeholder;

        if (el.tagName === "SELECT" && el.options.length) {
            const primeira = limpar(el.options[0].textContent);
            if (primeira) return primeira;
        }

        return limpar(el.title) || el.name || "Campo";
    }

    function rotuloBotao(b) {
        return limpar(b.getAttribute("aria-label")) || limpar(b.textContent) || limpar(b.title) || limpar(b.value);
    }

    function formatarValorLeitura(el) {
        const v = String(el.value || "").trim();
        if (!v) return "";
        if ((el.type || "").toLowerCase() === "date") return v.split("-").reverse().join("/");
        return encurtar(limpar(v), 160);
    }

    function descreverCampo(el) {
        const tag = el.tagName;
        const tipo = (el.type || "").toLowerCase();
        const prefixo = rotuloExplicito(el) ? "" : rotuloCampo(el) + ". ";

        if (tag === "SELECT") {
            const op = el.options[el.selectedIndex];
            const texto = op && op.value !== "" ? limpar(op.textContent) : "";
            return prefixo + "Lista de seleção, " + (texto ? "selecionado " + texto : "nada selecionado");
        }

        if (tipo === "password") {
            return prefixo + "Campo de senha, " + (el.value ? "preenchido" : "vazio");
        }

        if (tipo === "file") {
            const qtd = el.files ? el.files.length : 0;
            return prefixo + "Campo de envio de arquivo, " +
                (qtd ? qtd + (qtd === 1 ? " arquivo selecionado" : " arquivos selecionados") : "nenhum arquivo selecionado");
        }

        if (tipo === "checkbox" || tipo === "radio") {
            return (tipo === "radio" ? "Opção" : "Caixa de seleção") + ", " + (el.checked ? "marcada" : "não marcada");
        }

        if (tipo === "submit" || tipo === "button") {
            return (limpar(el.value) || "Botão") + ", botão";
        }

        const valor = formatarValorLeitura(el);

        if (el.disabled || el.readOnly) {
            return prefixo + (valor || "vazio");
        }

        return prefixo + "Campo de texto, " + (valor ? "preenchido com " + valor : "vazio");
    }

    // Percorre o DOM e gera a fila de trechos a serem lidos.
    function extrairFila() {
        const raiz = encontrarDialogoVisivel() || document.body;
        const fila = [];
        let buffer = "";
        let bufferEl = null;

        function descarregar() {
            const texto = limpar(buffer);
            if (texto) {
                const alvo = bufferEl;
                dividirTexto(texto).forEach((parte) => fila.push({ texto: parte, el: alvo }));
            }
            buffer = "";
            bufferEl = null;
        }

        function direto(texto, el) {
            descarregar();
            const limpo = limpar(texto);
            if (limpo) dividirTexto(limpo).forEach((parte) => fila.push({ texto: parte, el }));
        }

        function andar(no) {
            if (no.nodeType === 3) {
                if (no.nodeValue.trim()) {
                    if (!bufferEl) bufferEl = blocoDe(no.parentElement);
                    buffer += no.nodeValue;
                } else if (buffer) {
                    buffer += " ";
                }
                return;
            }

            if (no.nodeType !== 1 || ignorarNo(no)) return;

            const tag = no.tagName.toUpperCase();

            if (no.id === "map") {
                direto("Mapa interativo com as reclamações da cidade.", no);
                return;
            }

            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                if ((no.type || "").toLowerCase() === "hidden") return;
                direto(descreverCampo(no), no);
                return;
            }

            if (tag === "BUTTON") {
                const rotulo = rotuloBotao(no);
                if (rotulo) direto(rotulo + ", botão", no);
                return;
            }

            if (tag === "IMG") {
                if (no.closest(".complaint-card")) return;
                const alt = limpar(no.getAttribute("alt"));
                if (alt) direto("Imagem: " + alt, no);
                return;
            }

            if (tag === "BR") {
                buffer += " ";
                return;
            }

            const ehBloco = !INLINE.has(tag);
            if (ehBloco) descarregar();
            no.childNodes.forEach(andar);
            if (ehBloco) descarregar();
        }

        andar(raiz);
        descarregar();
        return fila;
    }

    function iniciarFila(fila) {
        pararTudo();
        if (!fila.length) {
            status("Não há conteúdo para ler.");
            return;
        }
        Leitura.fila = fila;
        Leitura.i = 0;
        Leitura.estado = "lendo";
        atualizarUI();
        executarLeitura();
    }

    async function executarLeitura() {
        const tk = ++Leitura.tk;

        while (
            Leitura.estado === "lendo" &&
            tk === Leitura.tk &&
            Leitura.i < Leitura.fila.length
            ) {
            const item = Leitura.fila[Leitura.i];
            destacar(item.el);
            status("Lendo " + (Leitura.i + 1) + " de " + Leitura.fila.length);
            await utter(item.texto);

            if (tk !== Leitura.tk || Leitura.estado !== "lendo") return;
            Leitura.i++;
        }

        if (tk === Leitura.tk && Leitura.estado === "lendo") {
            pararLeitura();
            status("Leitura concluída.");
        }
    }

    function lerPagina() {
        if (!synth) return;
        iniciarFila(extrairFila());
    }

    function lerSelecao() {
        if (!synth) return;
        const selecao = limpar(window.getSelection ? String(window.getSelection()) : "");
        if (!selecao) {
            status("Selecione um trecho de texto na página e clique novamente.");
            return;
        }
        iniciarFila(dividirTexto(selecao).map((parte) => ({ texto: parte, el: null })));
    }

    function alternarPausa() {
        if (Leitura.estado === "lendo") {
            Leitura.estado = "pausado";
            Leitura.tk++;
            cancelarFala();
            status("Leitura pausada.");
        } else if (Leitura.estado === "pausado") {
            Leitura.estado = "lendo";
            executarLeitura();
        }
        atualizarUI();
    }

    function pular(delta) {
        if (!Leitura.fila.length) return;
        Leitura.i = Math.min(Math.max(Leitura.i + delta, 0), Leitura.fila.length - 1);
        Leitura.tk++;
        cancelarFala();
        Leitura.estado = "lendo";
        atualizarUI();
        executarLeitura();
    }

    function pararLeitura() {
        Leitura.tk++;
        Leitura.estado = "parado";
        Leitura.fila = [];
        Leitura.i = 0;
        destacar(null);
        cancelarFala();
        atualizarUI();
    }

    function pararTudo() {
        pararLeitura();
        pararVoz();
        status("");
    }

    // =========================================================================
    // PREENCHIMENTO POR VOZ
    // =========================================================================
    const Voz = { ativo: false, tk: 0, rec: null, campo: null };
    let ultimoCampo = null;

    function ativoV(tk) {
        return Voz.ativo && tk === Voz.tk;
    }

    function campoElegivel(el) {
        if (!el || !el.tagName || el.disabled || el.readOnly) return false;
        if (el.closest(SELETOR_BLOQUEADO)) return false;
        if (el.closest('[aria-hidden="true"]')) return false;

        const tag = el.tagName.toUpperCase();
        if (tag === "INPUT") {
            const tipo = (el.type || "text").toLowerCase();
            if (!["text", "search", "tel", "number", "date", "radio"].includes(tipo)) return false;
        } else if (tag !== "TEXTAREA" && tag !== "SELECT") {
            return false;
        }

        return elementoVisivel(el);
    }

    function tipoCampo(el) {
        const tag = el.tagName.toUpperCase();
        if (tag === "SELECT") return "select";
        if (tag === "TEXTAREA") return "texto";

        const tipo = (el.type || "text").toLowerCase();
        if (tipo === "date") return "data";
        if (tipo === "tel" || tipo === "number" || /cep/i.test(el.id + " " + el.name)) return "numeros";
        return "texto";
    }

    function descobrirEscopo() {
        const dialogo = encontrarDialogoVisivel();
        if (dialogo) return dialogo;

        const foco = ultimoCampo && ultimoCampo.isConnected ? ultimoCampo : document.activeElement;
        if (foco && foco !== document.body && campoElegivel(foco)) {
            const form = foco.closest("form");
            if (form) return form;
        }

        return document.querySelector("main") || document.body;
    }

    function coletarCampos(escopo) {
        const campos = [];
        const vistos = new Set();

        escopo.querySelectorAll("input, textarea, select").forEach((el) => {
            if (!campoElegivel(el)) return;

            if ((el.type || "").toLowerCase() === "radio") {
                const chave = (el.form ? el.form.id : "") + "|" + (el.name || el.id);
                if (vistos.has(chave)) return;
                vistos.add(chave);

                const base = el.form || escopo;
                const grupo = Array.from(base.querySelectorAll('input[type="radio"]'))
                    .filter((r) => r.name === el.name && campoElegivel(r));
                campos.push({ el, tipo: "radio", grupo });
                return;
            }

            campos.push({ el, tipo: tipoCampo(el) });
        });

        return campos;
    }

    function textoOpcao(radio) {
        const label = radio.closest("label");
        const forte = label && label.querySelector("strong");
        return limpar(forte ? forte.textContent : label ? label.textContent : radio.value);
    }

    function obrigatorio(c) {
        return c.tipo === "radio" ? c.grupo.some((r) => r.required) : !!c.el.required;
    }

    function vazio(c) {
        if (c.tipo === "radio") return !c.grupo.some((r) => r.checked);
        if (c.tipo === "select") return c.el.value === "";
        return !String(c.el.value || "").trim();
    }

    function limparCampo(c) {
        if (c.tipo === "radio") {
            c.grupo.forEach((r) => { r.checked = false; });
            disparar(c.el, "change");
            return;
        }
        if (c.tipo === "select") {
            const temVazio = Array.from(c.el.options).some((o) => o.value === "");
            if (temVazio) c.el.value = "";
            else c.el.selectedIndex = 0;
            disparar(c.el, "input");
            disparar(c.el, "change");
            return;
        }
        definirValor(c.el, "");
    }

    function definirValor(el, valor) {
        let v = valor;
        if (el.maxLength > 0 && v.length > el.maxLength) v = v.slice(0, el.maxLength);
        el.value = v;
        disparar(el, "input");
        disparar(el, "change");
        return v;
    }

    function escolher(itens, falado) {
        const f = norm(falado);
        if (!f) return null;

        let m = itens.filter((i) => i.n === f);
        if (m.length) return m[0].ref;

        m = itens.filter((i) => i.n.startsWith(f));
        if (m.length === 1) return m[0].ref;

        m = itens.filter((i) => i.n.includes(f));
        if (m.length === 1) return m[0].ref;

        m = itens
            .filter((i) => i.n.length >= 3 && f.includes(i.n))
            .sort((a, b) => b.n.length - a.n.length);
        return m.length ? m[0].ref : null;
    }

    const MESES = {
        janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
        julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
    };

    function interpretarData(falado) {
        let t = norm(falado).replace(/\bprimeiro\b/, "1");
        let dia, mes, ano;

        const compacto = t.replace(/\s/g, "");
        if (/^\d{8}$/.test(compacto)) {
            dia = +compacto.slice(0, 2);
            mes = +compacto.slice(2, 4);
            ano = +compacto.slice(4);
        } else {
            const m = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]+|\d{1,2})\s*(?:de\s+)?(\d{4})/);
            if (!m) return null;
            dia = +m[1];
            mes = /^\d+$/.test(m[2]) ? +m[2] : MESES[m[2]];
            ano = +m[3];
        }

        if (!dia || !mes || !ano) return null;
        const data = new Date(ano, mes - 1, dia);
        if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;

        const dd = String(dia).padStart(2, "0");
        const mm = String(mes).padStart(2, "0");
        return { iso: ano + "-" + mm + "-" + dd, legivel: dd + "/" + mm + "/" + ano };
    }

    function formatarTexto(el, texto) {
        let s = texto
            .trim()
            .replace(/\s+vírgula\b/gi, ",")
            .replace(/\s+ponto final\b/gi, ".")
            .replace(/\s+ponto de interrogação\b/gi, "?")
            .replace(/\s+ponto de exclamação\b/gi, "!");

        if (el.maxLength > 0 && el.maxLength <= 2) {
            return s.replace(/\s+/g, "").toUpperCase(); // ex.: UF
        }

        if ((el.type || "").toLowerCase() !== "search" && !/busca/i.test(el.id)) {
            s = s.charAt(0).toUpperCase() + s.slice(1);
        }
        return s;
    }

    // Aplica o que foi falado ao campo. Retorna { ok, legivel } ou { ok:false, msg }.
    function aplicarFala(c, r) {
        const alternativas = r.alternativas && r.alternativas.length ? r.alternativas : [r.texto];
        const el = c.el;

        if (c.tipo === "select") {
            const opcoes = Array.from(el.options)
                .filter((o) => (el.required ? o.value !== "" : true))
                .map((o) => ({ n: norm(o.textContent), ref: o }))
                .filter((i) => i.n);

            for (const alt of alternativas) {
                const op = escolher(opcoes, alt);
                if (op) {
                    el.value = op.value;
                    disparar(el, "input");
                    disparar(el, "change");
                    return { ok: true, legivel: limpar(op.textContent) || "opção em branco" };
                }
            }
            return { ok: false, msg: "Não encontrei a opção " + alternativas[0] + ". Fale o nome da opção novamente." };
        }

        if (c.tipo === "radio") {
            const itens = c.grupo.map((rd) => ({ n: norm(textoOpcao(rd)), ref: rd })).filter((i) => i.n);
            for (const alt of alternativas) {
                const escolhido = escolher(itens, alt);
                if (escolhido) {
                    escolhido.click();
                    return { ok: true, legivel: textoOpcao(escolhido) };
                }
            }
            return { ok: false, msg: "Não encontrei a opção " + alternativas[0] + ". Fale o nome da opção novamente." };
        }

        if (c.tipo === "data") {
            for (const alt of alternativas) {
                const data = interpretarData(alt);
                if (data) {
                    definirValor(el, data.iso);
                    return { ok: true, legivel: data.legivel };
                }
            }
            return { ok: false, msg: "Não entendi a data. Diga, por exemplo, dez de março de mil novecentos e noventa, ou apenas os números." };
        }

        if (c.tipo === "numeros") {
            const digitos = alternativas[0].replace(/\D/g, "");
            if (!digitos) {
                return { ok: false, msg: "Não entendi. Diga apenas os números." };
            }
            const aplicado = definirValor(el, digitos);
            return { ok: true, legivel: aplicado.split("").join(" ") };
        }

        const texto = formatarTexto(el, alternativas[0]);
        if (!texto) return { ok: false, msg: "Não entendi. Pode repetir?" };
        const aplicado = definirValor(el, texto);
        return { ok: true, legivel: aplicado };
    }

    function descreverPrompt(c) {
        if (c.tipo === "radio") {
            const nomes = c.grupo.map(textoOpcao).filter(Boolean).join(", ");
            const marcado = c.grupo.find((r) => r.checked);
            return "Escolha uma opção" + (obrigatorio(c) ? ", obrigatório" : "") + ". Opções: " + nomes + "." +
                (marcado ? " Selecionado: " + textoOpcao(marcado) + "." : "");
        }

        const rotulo = rotuloCampo(c.el) || "Campo";
        let p = rotulo + (c.el.required ? ", obrigatório" : "") + ". ";

        if (c.tipo === "select") {
            const op = c.el.options[c.el.selectedIndex];
            if (op && op.value !== "") p += "Selecionado: " + limpar(op.textContent) + ". ";
            return p + "Diga o nome da opção.";
        }

        const atual = formatarValorLeitura(c.el);
        if (atual) p += "Valor atual: " + atual + ". ";

        if (c.tipo === "data") return p + "Diga a data.";
        if (c.tipo === "numeros") return p + "Diga apenas os números.";
        return p + "Pode falar.";
    }

    function marcarCampo(c) {
        desmarcarCampo();
        Voz.campo = c.el;
        c.el.classList.add("a11y-campo-ativo");
        try {
            c.el.scrollIntoView({ block: "center", behavior: reduzMovimento() ? "auto" : "smooth" });
            c.el.focus({ preventScroll: true });
        } catch (e) { /* ignora */ }
    }

    function desmarcarCampo() {
        if (Voz.campo) {
            Voz.campo.classList.remove("a11y-campo-ativo");
            Voz.campo = null;
        }
    }

    const COMANDOS = {
        next: ["proximo", "proxima", "avancar", "seguinte", "pular", "continuar", "pode continuar"],
        prev: ["voltar", "anterior", "campo anterior", "voltar campo"],
        repeat: ["repetir", "repete", "ler novamente", "ler de novo"],
        fix: ["corrigir", "refazer", "errado"],
        clear: ["limpar", "apagar", "limpar campo", "apagar campo"],
        stop: ["parar", "cancelar", "sair", "encerrar", "terminar", "parar de ouvir", "cancelar preenchimento"],
        submit: ["enviar", "enviar formulario", "salvar", "publicar", "concluir", "finalizar", "filtrar"]
    };

    const CONFIRMACOES = ["confirmar", "confirmo", "confirma", "sim", "pode enviar", "enviar"];

    function interpretarComando(r) {
        const alternativas = (r.alternativas && r.alternativas.length ? r.alternativas : [r.texto]).map(norm);
        for (const nome of Object.keys(COMANDOS)) {
            if (alternativas.some((a) => COMANDOS[nome].includes(a))) return nome;
        }
        return null;
    }

    function confirmou(r) {
        const alternativas = (r.alternativas && r.alternativas.length ? r.alternativas : [r.texto]).map(norm);
        return alternativas.some((a) => CONFIRMACOES.includes(a));
    }

    function mensagemErro(codigo) {
        switch (codigo) {
            case "not-allowed":
            case "service-not-allowed":
                return "Não foi possível usar o microfone. Permita o acesso ao microfone no navegador e tente novamente.";
            case "audio-capture":
                return "Nenhum microfone foi encontrado.";
            case "network":
                return "O reconhecimento de voz precisa de conexão com a internet.";
            case "language-not-supported":
                return "O reconhecimento de voz em português não está disponível neste navegador.";
            default:
                return "Ocorreu um erro no reconhecimento de voz. Preenchimento por voz encerrado.";
        }
    }

    function ouvir(limiteMs) {
        return new Promise((resolve) => {
            let feito = false;
            let timer = null;
            let rec = null;

            const fim = (resultado) => {
                if (feito) return;
                feito = true;
                clearTimeout(timer);
                if (Voz.rec === rec) Voz.rec = null;
                resolve(resultado);
            };

            try {
                rec = new SR();
            } catch (e) {
                resolve({ erro: "indisponivel" });
                return;
            }

            Voz.rec = rec;
            rec.lang = IDIOMA;
            rec.interimResults = false;
            rec.continuous = false;
            rec.maxAlternatives = 3;

            timer = setTimeout(() => {
                try { rec.stop(); } catch (e) { /* ignora */ }
            }, limiteMs || 12000);

            rec.onresult = (ev) => {
                const resultado = ev.results[0];
                const alternativas = [];
                for (let i = 0; i < resultado.length; i++) {
                    alternativas.push(resultado[i].transcript.trim());
                }
                const texto = alternativas[0] || "";
                fim(texto ? { texto, alternativas } : { erro: "no-speech" });
            };
            rec.onerror = (ev) => fim({ erro: ev.error });
            rec.onend = () => fim({ erro: "no-speech" });

            status("Ouvindo...");
            try {
                rec.start();
            } catch (e) {
                fim({ erro: "indisponivel" });
            }
        });
    }

    function acharBotaoEnvio(campoEl, limite) {
        let no = campoEl.parentElement;
        while (no) {
            const encontrado = Array.from(no.querySelectorAll("button")).find((b) =>
                !b.disabled &&
                !b.closest(".a11y-widget") &&
                b.getClientRects().length > 0 &&
                /enviar|publicar|filtrar|salvar|buscar|pesquisar/i.test(b.textContent) &&
                !/cancelar/i.test(b.textContent)
            );
            if (encontrado) return encontrado;
            if (no === limite) break;
            no = no.parentElement;
        }
        return null;
    }

    async function iniciarPreenchimento() {
        if (!VOZ_PERMITIDA) return;

        if (!SR) {
            status("Seu navegador não suporta reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge.");
            return;
        }

        if (Voz.ativo) {
            pararVoz();
            return;
        }

        pararLeitura();

        const escopo = descobrirEscopo();
        const campos = coletarCampos(escopo);

        if (!campos.length) {
            const msg =
                "Não há campos que possam ser preenchidos por voz nesta tela.";
            status(msg);
            await utter(msg);
            return;
        }

        const tk = ++Voz.tk;
        Voz.ativo = true;
        atualizarUI();

        let idx = 0;
        if (ultimoCampo) {
            const i = campos.findIndex(
                (c) => c.el === ultimoCampo || (c.grupo && c.grupo.includes(ultimoCampo))
            );
            if (i >= 0) idx = i;
        }

        // ---------- funções internas do fluxo ----------
        async function processarCampo(c) {
            if (!c.el.isConnected || !campoElegivel(c.el)) return "next";

            marcarCampo(c);

            let prompt = descreverPrompt(c);
            let falhas = 0;
            let aguardando = false;

            while (ativoV(tk)) {
                await utter(prompt);
                if (!ativoV(tk)) return "stop";

                const r = await ouvir();
                if (!ativoV(tk)) return "stop";

                if (r.erro) {
                    if (r.erro === "no-speech") {
                        if (aguardando) return "next"; // sem resposta: considera confirmado
                        falhas++;
                        if (falhas >= 2) {
                            await utter("Não consegui ouvir. Preenchimento por voz encerrado.");
                            return "stop";
                        }
                        prompt = "Não ouvi nada. Pode falar.";
                        continue;
                    }
                    if (r.erro === "aborted") return "stop";
                    await utter(mensagemErro(r.erro));
                    return "stop";
                }

                falhas = 0;
                status("Você disse: " + r.texto);

                const cmd = interpretarComando(r);
                if (cmd) {
                    if (cmd === "repeat") {
                        prompt = descreverPrompt(c);
                        aguardando = false;
                        continue;
                    }
                    if (cmd === "fix") {
                        prompt = "Pode falar novamente.";
                        aguardando = false;
                        continue;
                    }
                    if (cmd === "clear") {
                        limparCampo(c);
                        prompt = "Campo limpo. Pode falar novamente.";
                        aguardando = false;
                        continue;
                    }
                    if (cmd === "next") {
                        if (obrigatorio(c) && vazio(c)) {
                            prompt = "Este campo é obrigatório. " + descreverPrompt(c);
                            continue;
                        }
                        return "next";
                    }
                    return cmd; // prev, stop, submit
                }

                const resultado = aplicarFala(c, r);
                if (!resultado.ok) {
                    prompt = resultado.msg;
                    aguardando = false;
                    continue;
                }

                aguardando = true;
                prompt =
                    "Preenchido: " + encurtar(resultado.legivel, 200) +
                    ". Diga próximo para continuar, ou fale de novo para corrigir.";
            }

            return "stop";
        }

        async function etapaFinal() {
            desmarcarCampo();
            let prompt =
                "Chegamos ao fim dos campos. Diga enviar para enviar, voltar para revisar, ou parar para encerrar.";

            for (let tentativa = 0; tentativa < 2; tentativa++) {
                await utter(prompt);
                if (!ativoV(tk)) return "stop";

                const r = await ouvir();
                if (!ativoV(tk)) return "stop";

                if (r.erro && r.erro !== "no-speech") {
                    if (r.erro !== "aborted") await utter(mensagemErro(r.erro));
                    return "stop";
                }

                const cmd = r.erro ? null : interpretarComando(r);
                if (cmd === "submit" || cmd === "prev" || cmd === "stop") return cmd;

                prompt = "Não entendi. Diga enviar, voltar ou parar.";
            }

            return "stop";
        }

        async function tentarEnviar() {
            const referencia = campos[Math.min(idx, campos.length - 1)].el;
            const form = escopo.tagName === "FORM" ? escopo : referencia.closest("form");
            let botaoEnvio = null;

            if (form) {
                const invalido = form.querySelector(":invalid");
                if (invalido) {
                    const i = campos.findIndex(
                        (c) => c.el === invalido || (c.grupo && c.grupo.includes(invalido))
                    );
                    if (i >= 0) {
                        idx = i;
                        await utter("Ainda falta preencher um campo obrigatório.");
                    } else {
                        try { invalido.focus(); } catch (e) { /* ignora */ }
                        await utter(
                            "Há um campo que precisa ser preenchido manualmente: " +
                            rotuloCampo(invalido) + ". Preencha e diga enviar novamente."
                        );
                    }
                    return false;
                }
            } else {
                botaoEnvio = acharBotaoEnvio(referencia, escopo);
                if (!botaoEnvio) {
                    await utter("Não encontrei um botão de envio para esta área. Use o botão da tela.");
                    return false;
                }
            }

            const dispensaConfirmacao = botaoEnvio && /filtrar|pesquisar|buscar/i.test(botaoEnvio.textContent);
            if (!dispensaConfirmacao) {
                await utter("Deseja realmente enviar? Diga confirmar ou cancelar.");
                if (!ativoV(tk)) return false;

                const r = await ouvir();
                if (!ativoV(tk)) return false;

                if (r.erro || !confirmou(r)) {
                    await utter("Envio cancelado.");
                    return false;
                }
            }

            await utter("Enviando.");
            if (!ativoV(tk)) return false;

            if (form) form.requestSubmit();
            else botaoEnvio.click();
            return true;
        }

        // ---------- laço principal ----------
        await utter(
            "Preenchimento por voz iniciado. Comandos: próximo, voltar, repetir, limpar, enviar e parar."
        );

        while (ativoV(tk)) {
            const acao = idx >= campos.length ? await etapaFinal() : await processarCampo(campos[idx]);
            if (!ativoV(tk)) return;

            if (acao === "next") {
                idx++;
            } else if (acao === "prev") {
                if (idx > 0) idx--;
                else await utter("Este é o primeiro campo.");
            } else if (acao === "submit") {
                const enviado = await tentarEnviar();
                if (!ativoV(tk)) return;
                if (enviado) break;
            } else {
                break; // stop
            }
        }

        if (tk === Voz.tk) {
            Voz.ativo = false;
            desmarcarCampo();
            atualizarUI();
            status("Preenchimento por voz encerrado.");
            await utter("Preenchimento por voz encerrado.");
        }
    }

    function pararVoz() {
        const estavaAtivo = Voz.ativo;
        Voz.ativo = false;
        Voz.tk++;

        if (Voz.rec) {
            try { Voz.rec.abort(); } catch (e) { /* ignora */ }
            Voz.rec = null;
        }

        desmarcarCampo();
        if (estavaAtivo) cancelarFala();
        atualizarUI();
    }

    // =========================================================================
    // INICIALIZAÇÃO
    // =========================================================================
    function iniciar() {
        VOZ_PERMITIDA = !document.querySelector(
            "#login-form, #cadastro-form, #recuperar-form, #redefinir-form"
        );

        criarWidget();

        // Guarda o último campo editável focado (o botão do painel tira o foco do campo).
        document.addEventListener("focusin", (e) => {
            const alvo = e.target;
            if (alvo && alvo.closest && !alvo.closest(".a11y-widget") && campoElegivel(alvo)) {
                ultimoCampo = alvo;
            }
        });

        // Interrompe áudio e microfone ao sair da página.
        window.addEventListener("pagehide", () => {
            pararLeitura();
            pararVoz();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }
})();
