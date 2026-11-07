
package org.example.portalinfra.dto;

import org.example.portalinfra.model.ReclamacaoFoto;

public record ReclamacaoFotoResponse(
    Long id,
    String url,
    Integer ordem
) {
    public static ReclamacaoFotoResponse de(ReclamacaoFoto foto) {
        return new ReclamacaoFotoResponse(
            foto.getId(),
            foto.getUrl(),
            foto.getOrdem()
        );
    }
}
