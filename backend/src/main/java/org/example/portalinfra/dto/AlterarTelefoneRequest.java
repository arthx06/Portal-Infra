package org.example.portalinfra.dto;

import jakarta.validation.constraints.NotBlank;

public record AlterarTelefoneRequest(
        @NotBlank(message = "Telefone é obrigatório")
        String telefone
) {}