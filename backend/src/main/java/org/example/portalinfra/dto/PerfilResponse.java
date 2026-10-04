package org.example.portalinfra.dto;

import org.example.portalinfra.model.Usuario;

public record PerfilResponse(
        Long id,
        String nome,
        String email,
        String telefone
) {
    public static PerfilResponse de(Usuario u) {
        return new PerfilResponse(
                u.getId(),
                u.getNome(),
                u.getEmail(),
                u.getTelefone()
        );
    }
}