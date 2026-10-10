package org.example.portalinfra.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;


public record AtualizarPerfilRequest(

    @NotBlank
    @Size(max = 255)
    String nome,

    @NotBlank
    @Pattern(regexp = "\\d{10,11}")
    String telefone,

    @NotBlank
    @Pattern(regexp = "\\d{5}-?\\d{3}")
    String cep,

    LocalDate dataNascimento,

    @NotBlank
    @Size(max = 255)
    String logradouro,

    @NotBlank
    @Size(max = 20)
    String numero,

    @Size(max = 100)
    String complemento,

    @NotBlank
    @Size(max = 100)
    String bairro,

    @NotBlank
    @Size(max = 100)
    String cidade,

    @NotBlank
    @Pattern(regexp = "[A-Za-z]{2}")
    String uf

) {}
