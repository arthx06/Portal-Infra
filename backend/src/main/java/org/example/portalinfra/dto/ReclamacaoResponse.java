
package org.example.portalinfra.dto;

import org.example.portalinfra.model.Reclamacao;

import java.time.LocalDateTime;

public record ReclamacaoResponse(
    Long id,
    String titulo,
    String categoria,
    String descricao,
    String endereco,
    String bairro,
    String gravidade,
    String fotoUrl,
    String status,
    LocalDateTime dataCriacao,
    Long usuarioId
) {
    public static ReclamacaoResponse de(Reclamacao r) {
        return new ReclamacaoResponse(
            r.getId(),
            r.getTitulo(),
            r.getCategoria(),
            r.getDescricao(),
            r.getEndereco(),
            r.getBairro(),
            r.getGravidade(),
            r.getFotoUrl(),
            r.getStatus(),
            r.getDataCriacao(),
            r.getUsuario().getId()
        );
    }
}

