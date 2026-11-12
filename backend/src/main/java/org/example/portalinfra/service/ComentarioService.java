package org.example.portalinfra.service;

import com.cloudinary.Cloudinary;
import org.example.portalinfra.dto.ComentarioRequest;
import org.example.portalinfra.dto.ComentarioResponse;
import org.example.portalinfra.model.Comentario;
import org.example.portalinfra.model.Reclamacao;
import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.repository.ComentarioRepository;
import org.example.portalinfra.repository.ReclamacaoRepository;
import org.example.portalinfra.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ComentarioService {
    private final ComentarioRepository comentarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final ReclamacaoRepository reclamacaoRepository;
    private final Cloudinary cloudinary;

    public ComentarioService(
            ComentarioRepository comentarioRepository,
            UsuarioRepository usuarioRepository,
            ReclamacaoRepository reclamacaoRepository,
            Cloudinary cloudinary
    ) {
        this.comentarioRepository = comentarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.reclamacaoRepository = reclamacaoRepository;
        this.cloudinary = cloudinary;
    }

    @Transactional
    public ComentarioResponse criar(Long usuarioId, Long reclamacaoId, ComentarioRequest request, org.springframework.web.multipart.MultipartFile foto) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        Reclamacao reclamacao = reclamacaoRepository.findById(reclamacaoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamação não encontrada."));

        if (!usuario.isEstaAtivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta de usuário está desativada.");
        }

        boolean resolucao = request.isResolucao() != null && request.isResolucao();

        if (resolucao && (foto == null || foto.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Para relatar a resolução, é obrigatório enviar uma foto de prova.");
        }

        Comentario comentario = new Comentario();
        comentario.setTexto(request.texto());
        comentario.setUsuario(usuario);
        comentario.setReclamacao(reclamacao);
        comentario.setResolucao(resolucao);

        if (request.comentarioPaiId() != null) {
            Comentario pai = comentarioRepository.findById(request.comentarioPaiId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comentário principal não encontrado."));

            if (!pai.getReclamacao().getId().equals(reclamacao.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O comentário selecionado não pertence a esta reclamação.");
            }

            while (pai.getComentarioPai() != null) {
                pai = pai.getComentarioPai();
            }

            comentario.setComentarioPai(pai);
        }

        if (foto != null && !foto.isEmpty()) {
            try {
                var resultado = cloudinary.uploader().upload(
                        foto.getBytes(),
                        com.cloudinary.utils.ObjectUtils.asMap(
                                "folder", "portal-infra/comentarios",
                                "resource_type", "image"
                        )
                );
                comentario.setFotoUrl((String) resultado.get("secure_url"));
            } catch (java.io.IOException e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Erro ao fazer upload da imagem.");
            }
        }

        Comentario salvo = comentarioRepository.save(comentario);
        return ComentarioResponse.de(salvo);
    }

    @Transactional(readOnly = true)
    public List<ComentarioResponse> listarPorReclamacao(Long reclamacaoId) {
        return comentarioRepository.findByReclamacaoIdAndComentarioPaiIsNullOrderByDataCriacaoAsc(reclamacaoId)
                .stream()
                .map(ComentarioResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarSugestoesResolucaoParaAdmin(Long adminId) {
        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado. Apenas administradores podem realizar esta ação.");
        }

        return comentarioRepository.findByResolucaoTrueOrderByDataCriacaoDesc()
                .stream()
                .map(c -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", c.getId());
                    item.put("texto", c.getTexto());
                    item.put("fotoUrl", c.getFotoUrl());
                    item.put("dataCriacao", c.getDataCriacao());
                    item.put("isResolucao", c.isResolucao());

                    Usuario autor = c.getUsuario();
                    if (autor != null) {
                        item.put("usuarioId", autor.getId());
                        item.put("usuarioNome", autor.getNome());
                        item.put("usuarioEmail", autor.getEmail());
                    }

                    Reclamacao rec = c.getReclamacao();
                    if (rec != null) {
                        item.put("reclamacaoId", rec.getId());
                        item.put("reclamacaoTitulo", rec.getTitulo());
                        item.put("reclamacaoDescricao", rec.getDescricao());
                        item.put("reclamacaoBairro", rec.getBairro());
                        item.put("reclamacaoEndereco", rec.getEndereco());
                        item.put("reclamacaoStatus", rec.getStatus());
                    }

                    return item;
                })
                .toList();
    }

    // ==========================================
    // DELETAR COMENTÁRIO (USUÁRIO E ADMIN)
    // ==========================================

    @Transactional
    public void deletarPeloUsuario(Long id, Long usuarioId) {
        Comentario comentario = comentarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comentário não encontrado."));

        if (!comentario.getUsuario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode apagar seus próprios comentários.");
        }

        apagarComentarioEImagens(comentario);
    }

    @Transactional
    public void deletarComentarioPeloAdmin(Long id, Long adminId) {
        Comentario comentario = comentarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comentário não encontrado."));

        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado. Apenas administradores podem realizar esta ação.");
        }

        apagarComentarioEImagens(comentario);
    }

    private void apagarComentarioEImagens(Comentario comentario) {
        apagarImagensRecursivamente(comentario);
        comentarioRepository.delete(comentario);
    }

    private void apagarImagensRecursivamente(Comentario comentario) {
        if (comentario == null) {
            return;
        }

        apagarDoCloudinary(comentario.getFotoUrl());

        if (comentario.getRespostas() != null) {
            List<Comentario> respostas = new ArrayList<>(comentario.getRespostas());
            for (Comentario resposta : respostas) {
                apagarImagensRecursivamente(resposta);
            }
        }
    }

    public void apagarImagensDosComentariosDaReclamacao(Reclamacao reclamacao) {
        if (reclamacao == null || reclamacao.getComentarios() == null) {
            return;
        }

        List<Comentario> comentarios = new ArrayList<>(reclamacao.getComentarios());
        for (Comentario comentario : comentarios) {
            if (comentario.getComentarioPai() == null) {
                apagarImagensRecursivamente(comentario);
            }
        }
    }

    private void apagarDoCloudinary(String url) {
        if (url == null || url.isBlank()) return;

        int inicio = url.indexOf("portal-infra/comentarios/");
        int fim = url.lastIndexOf(".");
        if (inicio != -1 && fim != -1) {
            String publicId = url.substring(inicio, fim);
            try {
                cloudinary.uploader().destroy(publicId, com.cloudinary.utils.ObjectUtils.emptyMap());
            } catch (java.io.IOException e) {
                System.err.println("Erro ao deletar imagem do comentário no Cloudinary: " + e.getMessage());
            }
        }
    }

    private void validarArquivoImagem(org.springframework.web.multipart.MultipartFile foto) {
        String contentType = foto.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas arquivos de imagem são permitidos.");
        }

        try {
            BufferedImage image = ImageIO.read(foto.getInputStream());
            if (image == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado é inválido ou foi forjado.");
            }
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao ler o arquivo de imagem.");
        }
    }

    // ==========================================
    // EDITAR COMENTÁRIO (USUÁRIO E ADMIN)
    // ==========================================

    @Transactional
    public ComentarioResponse editarComentario(Long id, Long usuarioId, String novoTexto, Boolean isResolucao, org.springframework.web.multipart.MultipartFile novaFoto, boolean removerFoto) {
        Comentario comentario = comentarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comentário não encontrado."));

        if (!comentario.getUsuario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode editar seus próprios comentários.");
        }

        return processarEdicaoComentario(comentario, novoTexto, isResolucao, novaFoto, removerFoto);
    }

    @Transactional
    public ComentarioResponse editarComentarioPeloAdmin(Long id, Long adminId, String novoTexto, Boolean isResolucao, org.springframework.web.multipart.MultipartFile novaFoto, boolean removerFoto) {
        Comentario comentario = comentarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comentário não encontrado."));

        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado. Apenas administradores podem realizar esta ação.");
        }

        return processarEdicaoComentario(comentario, novoTexto, isResolucao, novaFoto, removerFoto);
    }

    private ComentarioResponse processarEdicaoComentario(Comentario comentario, String novoTexto, Boolean isResolucao, org.springframework.web.multipart.MultipartFile novaFoto, boolean removerFoto) {
        boolean enviouNovaFoto = novaFoto != null && !novaFoto.isEmpty();
        boolean seraResolucao = isResolucao != null ? isResolucao : comentario.isResolucao();

        if (seraResolucao) {
            boolean teraFotoNoFinal = (!removerFoto && comentario.getFotoUrl() != null) || enviouNovaFoto;
            if (!teraFotoNoFinal) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Alertas de resolução exigem uma foto de prova.");
            }
        }

        comentario.setTexto(novoTexto);
        comentario.setResolucao(seraResolucao);

        if (enviouNovaFoto) {
            validarArquivoImagem(novaFoto);
            apagarDoCloudinary(comentario.getFotoUrl());

            try {
                var resultado = cloudinary.uploader().upload(
                        novaFoto.getBytes(),
                        com.cloudinary.utils.ObjectUtils.asMap("folder", "portal-infra/comentarios", "resource_type", "image")
                );
                comentario.setFotoUrl((String) resultado.get("secure_url"));
            } catch (java.io.IOException e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Erro ao atualizar a imagem.");
            }
        } else if (removerFoto && comentario.getFotoUrl() != null) {
            apagarDoCloudinary(comentario.getFotoUrl());
            comentario.setFotoUrl(null);
        }

        Comentario salvo = comentarioRepository.save(comentario);
        return ComentarioResponse.de(salvo);
    }
}