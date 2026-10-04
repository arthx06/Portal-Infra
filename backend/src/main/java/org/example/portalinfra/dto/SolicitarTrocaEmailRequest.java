package org.example.portalinfra.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SolicitarTrocaEmailRequest(
        @NotBlank(message = "Novo e-mail é obrigatório!")
        @Email(message = "E-mail inválido")
        String novoEmail
) {}