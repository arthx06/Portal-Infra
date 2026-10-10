
package org.example.portalinfra.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ReclamacaoRequest(

    @NotBlank
    @Size(max = 100)
    String titulo,

    @NotBlank
    @Size(max = 100)
    String categoria,

    @NotBlank
    @Size(max = 1500)
    String descricao,

    @NotBlank
    @Size(max = 255)
    String endereco,

    @NotBlank
    @Size(max = 100)
    String bairro,

    @NotBlank
    @Pattern(regexp = "Leve|Moderado|Grave")
    String gravidade

) {}
