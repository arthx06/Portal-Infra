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

let usuarioLogadoId = null;

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

    // opcional: mostra no .results quantas bateram com o filtro
    // mostrarTotal(pagina.totalElements ?? 0);

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

    const dataFormatada = comentario.dataCriacao ? new Date(comentario.dataCriacao).toLocaleDateString("pt-BR") : "";

    div.innerHTML = `
        <div class="comentario-header">
            <span class="comentario-autor">${esc(comentario.usuarioNome || 'Usuário')}</span>
            <span class="comentario-data" style="color: #888; font-size: 11px; margin-left: 8px;">${dataFormatada}</span>
        </div>
        <div class="comentario-texto">${esc(comentario.texto)}</div>
        <button class="btn-responder" onclick="mostrarFormularioResposta(${comentario.id}, ${reclamacaoId})">Responder</button>
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
        form.append("texto", texto);
        form.append("comentarioPaiId", comentarioPaiId);

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
        form.append("texto", texto);   // comentário raiz: não envie comentarioPaiId

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
