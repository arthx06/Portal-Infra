package org.example.portalinfra.service;

import org.example.portalinfra.dto.DenunciaRequest;
import org.example.portalinfra.dto.DenunciaResponse;
import org.example.portalinfra.model.Comentario;
import org.example.portalinfra.model.Denuncia;
import org.example.portalinfra.model.Reclamacao;
import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.repository.ComentarioRepository;
import org.example.portalinfra.repository.DenunciaRepository;
import org.example.portalinfra.repository.ReclamacaoRepository;
import org.example.portalinfra.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DenunciaService {

    private final DenunciaRepository denunciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ReclamacaoRepository reclamacaoRepository;
    private final ComentarioRepository comentarioRepository;

    private static final List<String> TIPOS_VALIDOS = List.of(
            "CONTEUDO_SEXUAL",
            "DISCURSO_DE_ODIO",
            "PALAVRAS_DE_BAIXO_CALAO",
            "CONTEUDO_FALSO",
            "SPAM",
            "VENDA_OU_SERVICOS",
            "OUTROS"
    );

    public DenunciaService(DenunciaRepository denunciaRepository,
                           UsuarioRepository usuarioRepository,
                           ReclamacaoRepository reclamacaoRepository,
                           ComentarioRepository comentarioRepository) {
        this.denunciaRepository = denunciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.reclamacaoRepository = reclamacaoRepository;
        this.comentarioRepository = comentarioRepository;
    }

    @Transactional
    public DenunciaResponse criarDenuncia(Long usuarioId, DenunciaRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (!TIPOS_VALIDOS.contains(request.tipo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de denúncia inválido.");
        }

        boolean temReclamacao = request.reclamacaoId() != null;
        boolean temComentario = request.comentarioId() != null;

        if (temReclamacao && temComentario) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uma denúncia não pode apontar para uma reclamação e um comentário ao mesmo tempo.");
        }
        if (!temReclamacao && !temComentario) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A denúncia deve apontar para uma reclamação ou um comentário.");
        }

        Denuncia denuncia = new Denuncia();
        denuncia.setUsuario(usuario);
        denuncia.setTipo(request.tipo());
        denuncia.setDescricao(request.descricao());
        denuncia.setStatus("PENDENTE");

        if (temReclamacao) {
            Reclamacao reclamacao = reclamacaoRepository.findById(request.reclamacaoId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamação não encontrada."));

            if (reclamacao.getUsuario().getId().equals(usuarioId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode denunciar sua própria reclamação.");
            }
            if (denunciaRepository.existsByUsuarioIdAndReclamacaoId(usuarioId, request.reclamacaoId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já denunciou esta reclamação.");
            }
            denuncia.setReclamacao(reclamacao);
        } else {
            Comentario comentario = comentarioRepository.findById(request.comentarioId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comentário não encontrado."));

            if (comentario.getUsuario().getId().equals(usuarioId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode denunciar seu próprio comentário.");
            }
            if (denunciaRepository.existsByUsuarioIdAndComentarioId(usuarioId, request.comentarioId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já denunciou este comentário.");
            }
            denuncia.setComentario(comentario);
        }

        Denuncia salva = denunciaRepository.save(denuncia);
        return DenunciaResponse.de(salva);
    }

    // ==========================================
    // LEITURAS PARA O ADMIN (FILAS SEPARADAS)
    // ==========================================

    @Transactional(readOnly = true)
    public List<DenunciaResponse> listarDenunciasDeReclamacoes(Long adminId) {
        verificarAdmin(adminId);
        return denunciaRepository.findByReclamacaoIsNotNullOrderByDataCriacaoDesc()
                .stream()
                .map(DenunciaResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DenunciaResponse> listarDenunciasDeComentarios(Long adminId) {
        verificarAdmin(adminId);
        return denunciaRepository.findByComentarioIsNotNullOrderByDataCriacaoDesc()
                .stream()
                .map(DenunciaResponse::de)
                .toList();
    }

    // ==========================================
    // AÇÃO DE MODERAÇÃO
    // ==========================================

    @Transactional
    public DenunciaResponse resolverDenuncia(Long denunciaId, Long adminId, boolean aceitar) {
        Usuario admin = verificarAdmin(adminId);

        Denuncia denuncia = denunciaRepository.findById(denunciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Denúncia não encontrada."));

        if (!"PENDENTE".equalsIgnoreCase(denuncia.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esta denúncia já foi concluída.");
        }

        denuncia.setStatus("CONCLUIDA");
        denuncia.setResolvidoPor(admin);
        denuncia.setDataResolucao(LocalDateTime.now());

        if (aceitar) {
            boolean conteudoFoiRemovido = denuncia.getReclamacao() == null && denuncia.getComentario() == null;
            denuncia.setAcaoTomada(
                    conteudoFoiRemovido
                            ? "Conteúdo apagado pelo administrador"
                            : "Conteúdo editado pelo administrador"
            );
        } else {
            denuncia.setAcaoTomada("Denúncia improcedente (conteúdo mantido)");
        }

        Denuncia salva = denunciaRepository.save(denuncia);
        return DenunciaResponse.de(salva);
    }

    private Usuario verificarAdmin(Long adminId) {
        Usuario admin = usuarioRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (!"ADMIN".equalsIgnoreCase(admin.getTipo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado. Área restrita à moderação.");
        }
        return admin;
    }
}