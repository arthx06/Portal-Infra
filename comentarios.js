document.getElementById("btnVoltar")?.addEventListener("click", function () {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "index.html";
    }
});

function mostrarTotal(total) {
  const el = document.getElementById('count-resultados');
  if (el) el.textContent = `${total.toLocaleString('pt-BR')} ${total === 1 ? 'reclamação' : 'reclamações'}`;
}

async function carregarTotal() {
  try {
    const salvo = localStorage.getItem('total_reclamacoes');
    if (salvo) mostrarTotal(Number(salvo));
  } catch (e) {}

  try {
    const res = await fetch(`${API_BASE}/reclamacoes/contagem`);
    if (!res.ok) return;
    const d = await res.json();
    mostrarTotal(d.total);
    try { localStorage.setItem('total_reclamacoes', d.total); } catch (e) {}
  } catch (e) {
    console.error('Erro ao carregar total', e);
  }
}

let filtroAtual = new URLSearchParams();

function lerFiltros() {
  const v = (id) => (document.getElementById(id)?.value || '').trim();
  const p = new URLSearchParams();
  [['titulo', 'filtro-busca'], ['categoria', 'filtro-categoria'],
   ['bairro', 'filtro-bairro'], ['status', 'filtro-status']]
    .forEach(([nome, id]) => {
        const valor = v(id);
        if (valor && !valor.toLowerCase().startsWith('todos')) p.set(nome, valor);
    });
  return p;
}

function aplicarFiltro() {
  filtroAtual = lerFiltros();
  paginaAtual = 0;
  const lista = document.getElementById('lista-reclamacoes');
  if (lista) lista.innerHTML = '';
  carregarReclamacoes();
}

document.getElementById('btn-filtrar')?.addEventListener('click', aplicarFiltro);
document.getElementById('filtro-busca')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') aplicarFiltro();
});

let paginaAtual = 0;

let usuarioLogadoId = (typeof obterUsuarioCache === 'function' && obterUsuarioCache()?.id)
    ? obterUsuarioCache().id
    : null;

async function carregarUsuarioSessao() {
    try {
        const resposta = await apiFetch('/usuarios/sessao');

        if (!resposta.ok) {
            usuarioLogadoId = null;
            return;
        }

        const sessao = await resposta.json();

        usuarioLogadoId = sessao.autenticado
            ? sessao.id
            : null;

    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        usuarioLogadoId = null;
    }
}

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


function criarCard(r) {
    const classe = {
        pendente: 'pending',
        resolvida: 'resolved'
    }[(r.status || '').toLowerCase()] || '';

    const data = r.dataCriacao
        ? new Date(r.dataCriacao).toLocaleDateString('pt-BR')
        : '';

    const ehDono = usuarioLogadoId != null &&
        String(usuarioLogadoId) === String(r.usuarioId);

    const botoesProprietario = ehDono ? `
        <div class="acoes-reclamacao">
            <button
                type="button"
                class="botao-editar-reclamacao"
                data-acao="editar"
                data-id="${Number(r.id)}">
                Editar
            </button>

            <button
                type="button"
                class="botao-excluir-reclamacao"
                data-acao="excluir"
                data-id="${Number(r.id)}">
                Excluir
            </button>
        </div>
    ` : '';

    const botaoDenunciarReclamacao = ehDono ? '' : `
        <button
            type="button"
            class="botao-denunciar-reclamacao"
            onclick="abrirModalDenunciaReclamacao(${Number(r.id)})">
            🚩 Denunciar
        </button>
    `;

    return `
    <div class="complaint-card" data-id="${Number(r.id)}">
        <div class="image-container">
            <img src="${esc(r.fotoUrl)}" alt="${esc(r.titulo)}" />
            <span class="category">${esc(r.categoria)}</span>
        </div>

        <div class="card-content">
            <span class="status ${classe}">${esc(r.status)}</span>
            <h2>${esc(r.titulo)}</h2>
            <p class="location">${esc(r.endereco)}, ${esc(r.bairro)}</p>
            <p class="description">${esc(r.descricao)}</p>

            <div class="card-footer">
                <span>${data}</span>
                <button
                    type="button"
                    onclick="abrirComentarios(${Number(r.id)})">
                    Comentários
                </button>
                ${botaoDenunciarReclamacao}
            </div>

            ${botoesProprietario}
        </div>
    </div>`;
}

async function excluirReclamacao(id, botao) {
    const confirmar = confirm(
        "Deseja realmente excluir esta reclamação?\n\n" +
        "Os comentários, respostas e imagens relacionados também serão excluídos."
    );

    if (!confirmar) return;

    botao.disabled = true;
    botao.textContent = "Excluindo...";

    try {
        const resposta = await apiFetch(`/reclamacoes/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            const resultado = await resposta.json().catch(() => ({}));

            throw new Error(
                resultado.message ||
                resultado.erro ||
                "Não foi possível excluir a reclamação."
            );
        }

        alert("Reclamação excluída com sucesso!");

        // Atualiza a lista desde a primeira página
        paginaAtual = 0;

        const lista = document.getElementById('lista-reclamacoes');
        if (lista) lista.innerHTML = '';

        await carregarReclamacoes();
        await carregarTotal();

    } catch (erro) {
        console.error("Erro ao excluir reclamação:", erro);
        alert(erro.message);

        botao.disabled = false;
        botao.textContent = "Excluir";
    }
}


async function carregarReclamacoes() {
  const lista = document.getElementById('lista-reclamacoes');
  const btn = document.getElementById('btn-mais');
  const TAMANHO_PAGINA = 12;
  if (!lista) return;

  try {
    const params = new URLSearchParams(filtroAtual);
    params.set('page', paginaAtual);
    params.set('size', TAMANHO_PAGINA);

    const res = await fetch(`${API_BASE}/reclamacoes?${params}`);
    if (!res.ok) return;
    const pagina = await res.json();

    if (paginaAtual === 0 && pagina.content.length === 0) {
      lista.innerHTML = '<p>Nenhuma reclamação encontrada.</p>';
    } else {
      lista.insertAdjacentHTML('beforeend', pagina.content.map(criarCard).join(''));
    }

    if (btn) btn.hidden = pagina.content.length < TAMANHO_PAGINA;
    paginaAtual++;
  } catch (e) {
    console.error('Erro ao carregar reclamações', e);
  }
}

const btnMais = document.getElementById('btn-mais');
if (btnMais) btnMais.addEventListener('click', carregarReclamacoes);


document.getElementById('lista-reclamacoes')?.addEventListener('click', (e) => {
    const botaoAcao = e.target.closest('[data-acao]');

    if (botaoAcao) {
        e.stopPropagation();

        const id = botaoAcao.dataset.id;
        const acao = botaoAcao.dataset.acao;

        if (acao === 'editar') {
            window.location.href =
                `editar-reclamacao.html?id=${encodeURIComponent(id)}`;
        }

        if (acao === 'excluir') {
            excluirReclamacao(id, botaoAcao);
        }

        return;
    }

    // O botão de comentários mantém seu próprio comportamento
    if (e.target.closest('.card-footer button')) return;

    const card = e.target.closest('.complaint-card');

    if (card?.dataset.id) {
       window.location.href =
            `detalhe-reclamacao.html?id=${card.dataset.id}&origem=reclamacoes.html`;
    }
});


// INICIALIZA A PÁGINA PÚBLICA

async function inicializarPaginaReclamacoes() {
    await carregarUsuarioSessao();

    carregarTotal();
    carregarReclamacoes();
}

inicializarPaginaReclamacoes();


// =====================================================
// COMENTÁRIOS E THREADS
// =====================================================
async function estaLogado() {
    try {
        const res = await apiFetch('/usuarios/sessao');
        return res.ok && (await res.json()).autenticado === true;
    } catch (e) {
        return false;
    }
}

async function carregarComentarios(reclamacaoId) {
    const container = document.getElementById("lista-comentarios");
    if (!container) return;

    if (usuarioLogadoId == null) {
        await carregarUsuarioSessao();
    }

    try {
        const resposta = await fetch(`${API_BASE}/comentarios/reclamacao/${reclamacaoId}`);
        if (!resposta.ok) throw new Error("Erro ao carregar comentários");

        const comentarios = await resposta.json();
        container.innerHTML = "";

        if (comentarios.length === 0) {
            container.innerHTML = "<p style='color: #888; font-size: 13px;'>Nenhum comentário ainda. Seja o primeiro a comentar!</p>";
            return;
        }

        comentarios.forEach(comentario => {
            container.appendChild(criarElementoComentario(comentario, reclamacaoId));
        });
    } catch (erro) {
        console.error("Erro:", erro);
        container.innerHTML = "<p style='color: red; font-size: 13px;'>Erro ao carregar comentários.</p>";
    }
}

// Cria o elemento visual de um comentário e suas respostas encadeadas
function criarElementoComentario(comentario, reclamacaoId) {
    const div = document.createElement("div");
    div.className = "comentario-item";
    div.id = `comentario-${comentario.id}`;

    const dataFormatada = comentario.dataCriacao ? new Date(comentario.dataCriacao).toLocaleDateString("pt-BR") : "";

    const ehDono = usuarioLogadoId != null &&
        comentario.usuarioId != null &&
        String(usuarioLogadoId) === String(comentario.usuarioId);

    const botaoDenunciar = ehDono ? '' : `
        <button
            type="button"
            class="btn-denunciar-comentario"
            title="Denunciar este comentário"
            onclick="abrirModalDenunciaComentario(${comentario.id})">
            🚩 Denunciar
        </button>
    `;

    div.innerHTML = `
        <div class="comentario-header">
            <span class="comentario-autor">${esc(comentario.usuarioNome || 'Usuário')}</span>
            <span class="comentario-data" style="color: #888; font-size: 11px; margin-left: 8px;">${dataFormatada}</span>
        </div>
        <div class="comentario-texto">${esc(comentario.texto)}</div>
        <div class="comentario-acoes">
            <button class="btn-responder" type="button" onclick="mostrarFormularioResposta(${comentario.id}, ${reclamacaoId})">Responder</button>
            ${botaoDenunciar}
        </div>
        <div id="caixa-resposta-${comentario.id}" style="display: none; margin-top: 8px;"></div>
        <div class="respostas-container" id="respostas-${comentario.id}"></div>
    `;

    // Se tiver respostas aninhadas (thread estilo Twitter)
    if (comentario.respostas && comentario.respostas.length > 0) {
        const containerRespostas = div.querySelector(`#respostas-${comentario.id}`);
        comentario.respostas.forEach(filho => {
            containerRespostas.appendChild(criarElementoComentario(filho, reclamacaoId));
        });
    }

    return div;
}

// Abre uma caixinha para responder diretamente àquele comentário
function mostrarFormularioResposta(comentarioId, reclamacaoId) {
    const caixa = document.getElementById(`caixa-resposta-${comentarioId}`);
    if (!caixa) return;

    if (caixa.style.display === "block") {
        caixa.style.display = "none";
        return;
    }

    caixa.style.display = "block";
    caixa.innerHTML = `
        <textarea id="texto-resposta-${comentarioId}" placeholder="Escreva sua resposta..." style="width: 100%; border-radius: 6px; border: 1px solid #ccc; padding: 6px; font-size: 13px;"></textarea>
        <div style="margin-top: 4px;">
            <button onclick="enviarResposta(${comentarioId}, ${reclamacaoId})" style="background: #2563EB; color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px;">Enviar resposta</button>
            <button onclick="document.getElementById('caixa-resposta-${comentarioId}').style.display='none'" style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px; margin-left: 6px;">Cancelar</button>
        </div>
    `;
}

// Envia a resposta do comentário para o backend
async function enviarResposta(comentarioPaiId, reclamacaoId) {
   if (!(await estaLogado())) {
        alert("Você precisa estar logado para comentar!");
        return;
    }

    const campoTexto = document.getElementById(`texto-resposta-${comentarioPaiId}`);
    const texto = campoTexto ? campoTexto.value.trim() : "";
    if (!texto) return;

    try {
        const form = new FormData();
        form.append(
            "dados",
            new Blob(
                [JSON.stringify({ texto, comentarioPaiId })],
                { type: "application/json" }
            )
        );

        const resposta = await apiFetch(`/comentarios?reclamacaoId=${reclamacaoId}`, {
            method: "POST",
            body: form
        });

        if (!resposta.ok) throw new Error("Erro ao salvar resposta");

        // Recarrega os comentários para já exibir a thread atualizada
        carregarComentarios(reclamacaoId);
    } catch (erro) {
        console.error("Erro:", erro);
        alert("Não foi possível enviar a resposta.");
    }
}

// --- CONTROLE DO MODAL DE COMENTÁRIOS ---
let reclamacaoAtualId = null;

function abrirComentarios(reclamacaoId) {
    reclamacaoAtualId = reclamacaoId;
    document.getElementById("modal-comentarios").style.display = "flex";
    carregarComentarios(reclamacaoId);
}

function fecharModalComentarios() {
    document.getElementById("modal-comentarios").style.display = "none";
}

async function enviarComentarioPrincipal() {
    if (!(await estaLogado())) {
        alert("Você precisa estar logado para comentar!");
        return;
    }

    const campo = document.getElementById("novo-comentario-texto");
    const texto = campo ? campo.value.trim() : "";
    if (!texto) return;

    try {
        const form = new FormData();
        form.append(
            "dados",
            new Blob(
                [JSON.stringify({ texto })],
                { type: "application/json" }
            )
        );

        const resposta = await apiFetch(`/comentarios?reclamacaoId=${reclamacaoAtualId}`, {
            method: "POST",
            body: form
        });
        
        if (!resposta.ok) throw new Error("Erro ao postar comentário");

        campo.value = "";
        carregarComentarios(reclamacaoAtualId);
    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro ao publicar comentário.");
    }
}

// =====================================================
// SISTEMA DE DENÚNCIA DE COMENTÁRIOS (DenunciaService.java)
// Opções: CONTEUDO_SEXUAL, DISCURSO_DE_ODIO, PALAVRAS_DE_BAIXO_CALAO,
// CONTEUDO_FALSO, SPAM, VENDA_OU_SERVICOS, OUTROS
// =====================================================

function garantirModalDenunciaExiste() {
    if (document.getElementById("modal-denuncia-comentario")) return;

    const modalHtml = `
    <div id="modal-denuncia-comentario" class="modal-denuncia" style="display: none;">
      <div class="modal-denuncia-overlay" onclick="fecharModalDenunciaComentario()"></div>
      <div class="modal-denuncia-card" role="dialog" aria-modal="true" aria-labelledby="modal-denuncia-titulo">
        <div class="modal-denuncia-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🚩</span>
            <h3 id="modal-denuncia-titulo">Denunciar Comentário</h3>
          </div>
          <button type="button" class="btn-fechar-modal-denuncia" onclick="fecharModalDenunciaComentario()" aria-label="Fechar">&times;</button>
        </div>

        <form id="form-denuncia-comentario" onsubmit="enviarDenunciaComentario(event)">
          <input type="hidden" id="denuncia-comentario-id" value="" />

          <p class="modal-denuncia-instrucao">
            Por favor, selecione a categoria que melhor descreve o motivo da denúncia:
          </p>

          <div class="modal-denuncia-opcoes">
            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="CONTEUDO_SEXUAL" required />
              <div>
                <strong>Conteúdo sexual</strong>
                <small>Nudez, pornografia ou atos sexuais explícitos.</small>
              </div>
            </label>

            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="DISCURSO_DE_ODIO" />
              <div>
                <strong>Discurso de ódio</strong>
                <small>Ataques, intolerância ou discriminação por qualquer motivo.</small>
              </div>
            </label>

            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="PALAVRAS_DE_BAIXO_CALAO" />
              <div>
                <strong>Palavras de baixo calão</strong>
                <small>Ofensas, xingamentos, ameaças ou agressões verbais.</small>
              </div>
            </label>

            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="CONTEUDO_FALSO" />
              <div>
                <strong>Conteúdo falso</strong>
                <small>Desinformação deliberada, mentiras ou boatos.</small>
              </div>
            </label>

            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="SPAM" />
              <div>
                <strong>Spam</strong>
                <small>Publicações repetitivas, links suspeitos ou irrelevantes.</small>
              </div>
            </label>

            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="VENDA_OU_SERVICOS" />
              <div>
                <strong>Venda ou serviços</strong>
                <small>Divulgação comercial, autopromoção ou comércio não autorizado.</small>
              </div>
            </label>

            <label class="modal-denuncia-opcao">
              <input type="radio" name="tipoDenuncia" value="OUTROS" />
              <div>
                <strong>Outros</strong>
                <small>Outras infrações às diretrizes da comunidade.</small>
              </div>
            </label>
          </div>

          <div class="modal-denuncia-campo">
            <label for="denuncia-descricao">Detalhes adicionais (opcional):</label>
            <textarea
              id="denuncia-descricao"
              placeholder="Descreva com mais detalhes o problema ocorrido..."
              rows="3"
            ></textarea>
          </div>

          <div id="denuncia-feedback-erro" class="modal-denuncia-erro" style="display: none;"></div>

          <div class="modal-denuncia-acoes">
            <button type="button" class="btn-cancelar-denuncia" onclick="fecharModalDenunciaComentario()">Cancelar</button>
            <button type="submit" class="btn-confirmar-denuncia" id="btn-enviar-denuncia">Enviar denúncia</button>
          </div>
        </form>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

async function abrirModalDenunciaComentario(comentarioId) {
    if (!(await estaLogado())) {
        alert("Você precisa estar logado para denunciar um comentário!");
        return;
    }

    garantirModalDenunciaExiste();

    const inputId = document.getElementById("denuncia-comentario-id");
    const campoDescricao = document.getElementById("denuncia-descricao");
    const erroEl = document.getElementById("denuncia-feedback-erro");
    const radios = document.getElementsByName("tipoDenuncia");

    if (inputId) inputId.value = comentarioId;
    if (campoDescricao) campoDescricao.value = "";
    if (erroEl) {
        erroEl.style.display = "none";
        erroEl.textContent = "";
    }
    radios.forEach(r => (r.checked = false));

    const modal = document.getElementById("modal-denuncia-comentario");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function fecharModalDenunciaComentario() {
    const modal = document.getElementById("modal-denuncia-comentario");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}

async function enviarDenunciaComentario(event) {
    if (event) event.preventDefault();

    const inputId = document.getElementById("denuncia-comentario-id");
    const comentarioId = inputId ? inputId.value : null;
    const radios = document.getElementsByName("tipoDenuncia");
    let tipoSelecionado = null;

    for (const r of radios) {
        if (r.checked) {
            tipoSelecionado = r.value;
            break;
        }
    }

    const erroEl = document.getElementById("denuncia-feedback-erro");
    const mostrarErro = (msg) => {
        if (erroEl) {
            erroEl.textContent = msg;
            erroEl.style.display = "block";
        } else {
            alert(msg);
        }
    };

    if (!tipoSelecionado) {
        mostrarErro("Selecione um tipo de denúncia.");
        return;
    }

    const campoDescricao = document.getElementById("denuncia-descricao");
    const descricao = campoDescricao ? campoDescricao.value.trim() : "";

    const btnEnviar = document.getElementById("btn-enviar-denuncia");
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Enviando...";
    }

    try {
        const resposta = await apiFetch("/denuncias", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                comentarioId: Number(comentarioId),
                tipo: tipoSelecionado,
                descricao: descricao || null
            })
        });

        if (resposta.ok) {
            alert("Denúncia enviada com sucesso! Nossa equipe de moderação irá analisar o comentário.");
            fecharModalDenunciaComentario();
            return;
        }

        let mensagem = "Não foi possível enviar a denúncia.";
        try {
            const dadosErro = await resposta.json();
            mensagem = dadosErro.message || dadosErro.erro || mensagem;
        } catch (_) {}

        if (resposta.status === 409) {
            mensagem = "Você já denunciou este comentário anteriormente.";
        } else if (resposta.status === 401) {
            mensagem = "Você precisa estar logado para denunciar um comentário.";
        } else if (resposta.status === 400 && mensagem.includes("próprio")) {
            mensagem = "Você não pode denunciar o seu próprio comentário.";
        }

        mostrarErro(mensagem);
    } catch (err) {
        console.error("Erro ao enviar denúncia:", err);
        mostrarErro("Erro de comunicação com o servidor. Tente novamente.");
    } finally {
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = "Enviar denúncia";
        }
    }
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        fecharModalDenunciaComentario();
        fecharModalDenunciaReclamacao();
    }
});

function garantirModalDenunciaReclamacaoExiste() {
    if (document.getElementById("modal-denuncia-reclamacao")) return;

    document.body.insertAdjacentHTML("beforeend", `
    <div id="modal-denuncia-reclamacao" class="modal-denuncia" style="display: none;">
      <div class="modal-denuncia-overlay" onclick="fecharModalDenunciaReclamacao()"></div>
      <div class="modal-denuncia-card" role="dialog" aria-modal="true" aria-labelledby="modal-denuncia-reclamacao-titulo">
        <div class="modal-denuncia-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🚩</span>
            <h3 id="modal-denuncia-reclamacao-titulo">Denunciar Reclamação</h3>
          </div>
          <button type="button" class="btn-fechar-modal-denuncia" onclick="fecharModalDenunciaReclamacao()" aria-label="Fechar">&times;</button>
        </div>
        <form id="form-denuncia-reclamacao" onsubmit="enviarDenunciaReclamacao(event)">
          <input type="hidden" id="denuncia-reclamacao-id" />
          <p class="modal-denuncia-instrucao">Selecione o motivo da denúncia:</p>
          <div class="modal-denuncia-opcoes">
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="CONTEUDO_SEXUAL" required /><div><strong>Conteúdo sexual</strong><small>Nudez, pornografia ou atos sexuais explícitos.</small></div></label>
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="DISCURSO_DE_ODIO" /><div><strong>Discurso de ódio</strong><small>Ataques, intolerância ou discriminação.</small></div></label>
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="PALAVRAS_DE_BAIXO_CALAO" /><div><strong>Palavras de baixo calão</strong><small>Ofensas, ameaças ou agressões verbais.</small></div></label>
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="CONTEUDO_FALSO" /><div><strong>Conteúdo falso</strong><small>Informações falsas ou enganosas.</small></div></label>
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="SPAM" /><div><strong>Spam</strong><small>Publicações repetitivas ou irrelevantes.</small></div></label>
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="VENDA_OU_SERVICOS" /><div><strong>Venda ou serviços</strong><small>Divulgação comercial não autorizada.</small></div></label>
            <label class="modal-denuncia-opcao"><input type="radio" name="tipoDenunciaReclamacao" value="OUTROS" /><div><strong>Outros</strong><small>Outra infração às diretrizes da comunidade.</small></div></label>
          </div>
          <div class="modal-denuncia-campo">
            <label for="denuncia-reclamacao-descricao">Detalhes adicionais (opcional):</label>
            <textarea id="denuncia-reclamacao-descricao" rows="3" placeholder="Descreva o problema ocorrido..."></textarea>
          </div>
          <div id="denuncia-reclamacao-feedback" class="modal-denuncia-erro" style="display: none;"></div>
          <div class="modal-denuncia-acoes">
            <button type="button" class="btn-cancelar-denuncia" onclick="fecharModalDenunciaReclamacao()">Cancelar</button>
            <button type="submit" class="btn-confirmar-denuncia" id="btn-enviar-denuncia-reclamacao">Enviar denúncia</button>
          </div>
        </form>
      </div>
    </div>
    `);
}

async function abrirModalDenunciaReclamacao(reclamacaoId) {
    if (!(await estaLogado())) {
        alert("Você precisa estar logado para denunciar uma reclamação!");
        return;
    }

    garantirModalDenunciaReclamacaoExiste();
    document.getElementById("denuncia-reclamacao-id").value = reclamacaoId;
    document.getElementById("denuncia-reclamacao-descricao").value = "";
    document.getElementById("denuncia-reclamacao-feedback").style.display = "none";
    document.querySelectorAll('input[name="tipoDenunciaReclamacao"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById("modal-denuncia-reclamacao").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function fecharModalDenunciaReclamacao() {
    const modal = document.getElementById("modal-denuncia-reclamacao");
    if (modal) modal.style.display = "none";
    if (!document.getElementById("modal-denuncia-comentario") ||
        document.getElementById("modal-denuncia-comentario").style.display === "none") {
        document.body.style.overflow = "";
    }
}

async function enviarDenunciaReclamacao(event) {
    event.preventDefault();

    const reclamacaoId = Number(document.getElementById("denuncia-reclamacao-id").value);
    const tipo = document.querySelector('input[name="tipoDenunciaReclamacao"]:checked')?.value;
    const descricao = document.getElementById("denuncia-reclamacao-descricao").value.trim();
    const feedback = document.getElementById("denuncia-reclamacao-feedback");
    const botao = document.getElementById("btn-enviar-denuncia-reclamacao");

    if (!tipo) {
        feedback.textContent = "Selecione um tipo de denúncia.";
        feedback.style.display = "block";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando...";
    try {
        const resposta = await apiFetch("/denuncias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reclamacaoId, tipo, descricao: descricao || null })
        });

        if (resposta.ok) {
            alert("Denúncia enviada com sucesso! Nossa equipe irá analisar a reclamação.");
            fecharModalDenunciaReclamacao();
            return;
        }

        let mensagem = "Não foi possível enviar a denúncia.";
        try {
            const erro = await resposta.json();
            mensagem = erro.message || erro.erro || mensagem;
        } catch (_) {}
        if (resposta.status === 409) mensagem = "Você já denunciou esta reclamação anteriormente.";
        if (resposta.status === 401) mensagem = "Você precisa estar logado para denunciar uma reclamação.";
        feedback.textContent = mensagem;
        feedback.style.display = "block";
    } catch (erro) {
        console.error("Erro ao denunciar reclamação:", erro);
        feedback.textContent = "Erro de comunicação com o servidor. Tente novamente.";
        feedback.style.display = "block";
    } finally {
        botao.disabled = false;
        botao.textContent = "Enviar denúncia";
    }
}
