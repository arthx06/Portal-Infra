package org.example.portalinfra.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AlterarEmailRequest(
        @NotBlank(message = "Novo e-mail é obrigatório!")
        @Email(message = "E-mail inválido")
        String novoEmail,

        @NotBlank(message = "O código de autenticação é obrigatório!")
        String codigo,

        @NotBlank(message = "A senha é obrigatória")
        String senha
) {}