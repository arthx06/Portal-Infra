package org.example.portalinfra.dto;

import org.example.portalinfra.model.Denuncia;
import java.time.LocalDateTime;

public record DenunciaResponse(
        Long id,
        Long usuarioId,
        String denuncianteNome,
        Long reclamacaoId,
        String reclamacaoTitulo,
        String reclamacaoDescricao,
        Long comentarioId,
        String comentarioTexto,
        Long usuarioDenunciadoId,
        String usuarioDenunciadoNome,
        String usuarioDenunciadoEmail,
        String tipo,
        String descricao,
        String status,
        LocalDateTime dataCriacao,
        Long resolvidoPorId,
        String moderadorNome,
        LocalDateTime dataModeracao,
        String acaoTomada
) {
    public static DenunciaResponse de(Denuncia denuncia) {
        var reclamacao = denuncia.getReclamacao();
        var comentario = denuncia.getComentario();
        var moderador = denuncia.getResolvidoPor();

        var autorAlvo = reclamacao != null
                ? reclamacao.getUsuario()
                : (comentario != null ? comentario.getUsuario() : null);

        Long reclamacaoOrigemId = reclamacao != null
                ? reclamacao.getId()
                : (comentario != null && comentario.getReclamacao() != null
                ? comentario.getReclamacao().getId()
                : null);

        return new DenunciaResponse(
                denuncia.getId(),
                denuncia.getUsuario().getId(),
                denuncia.getUsuario().getNome(),
                reclamacaoOrigemId,
                reclamacao != null ? reclamacao.getTitulo() : null,
                reclamacao != null ? reclamacao.getDescricao() : null,
                comentario != null ? comentario.getId() : null,
                comentario != null ? comentario.getTexto() : null,
                autorAlvo != null ? autorAlvo.getId() : null,
                autorAlvo != null ? autorAlvo.getNome() : null,
                autorAlvo != null ? autorAlvo.getEmail() : null,
                denuncia.getTipo(),
                denuncia.getDescricao(),
                denuncia.getStatus(),
                denuncia.getDataCriacao(),
                moderador != null ? moderador.getId() : null,
                moderador != null ? moderador.getNome() : null,
                denuncia.getDataResolucao(),
                denuncia.getAcaoTomada()
        );
    }
}