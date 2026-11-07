package org.example.portalinfra.dto;

import org.example.portalinfra.model.Reclamacao;

import java.time.LocalDateTime;
import java.util.List;

public record ReclamacaoResponse(
    Long id,
    String titulo,
    String categoria,
    String descricao,
    String endereco,
    String bairro,
    Double latitude,
    Double longitude,
    String gravidade,
    String fotoUrl,
    List<String> fotos,
    String status,
    LocalDateTime dataCriacao,
    Long usuarioId,
    List<ReclamacaoFotoResponse> fotosDetalhadas
    
) {
    public static ReclamacaoResponse de(Reclamacao r) {
        return new ReclamacaoResponse(
            r.getId(),
            r.getTitulo(),
            r.getCategoria(),
            r.getDescricao(),
            r.getEndereco(),
            r.getBairro(),
            r.getLatitude(),
            r.getLongitude(),
            r.getGravidade(),
            r.getFotoUrl(),
            r.getFotos().stream()
                .map(foto -> foto.getUrl())
                .toList(),
            r.getStatus(),
            r.getDataCriacao(),
            r.getUsuario().getId(),
            r.getFotos().stream()
                .map(ReclamacaoFotoResponse::de)
                .toList()
        );
    }
}