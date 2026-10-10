
package org.example.portalinfra.dto;

import java.time.LocalDate;

import org.example.portalinfra.model.Usuario;

public record PerfilResponse(
        Long id,
        String nome,
        String email,
        String telefone,
        String cep,
        LocalDate dataNascimento,
        String logradouro,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf
       
) {
    public static PerfilResponse de(Usuario u) {
        return new PerfilResponse(
                u.getId(),
                u.getNome(),
                u.getEmail(),
                u.getTelefone(),
                u.getCep(),
                u.getDataNascimento(),
                u.getLogradouro(),
                u.getNumero(),
                u.getComplemento(),
                u.getBairro(),
                u.getCidade(),
                u.getUf()
        );
    }
}
