package org.example.portalinfra.controller;

import jakarta.validation.Valid;

import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.service.UsuarioService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import org.example.portalinfra.dto.AlterarEmailRequest;
import org.example.portalinfra.dto.AlterarTelefoneRequest;
import org.example.portalinfra.dto.PerfilResponse;
import org.example.portalinfra.dto.SolicitarTrocaEmailRequest;



@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(
            UsuarioService usuarioService
    ) {
        this.usuarioService = usuarioService;
    }

    // ==========================================
    // ENVIAR CÓDIGO
    // ==========================================
    
    @PostMapping("/enviar-codigo")
    public ResponseEntity<?> enviarCodigo(
            @RequestBody Map<String, String> body
    ) {

        try {

            usuarioService.enviarCodigoVerificacao(
                    body.get("email")
            );

            return ResponseEntity.ok(
                    Map.of(
                            "mensagem",
                            "Código enviado para o e-mail informado"
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "erro",
                            e.getMessage()
                    )
            );
        }
    }

    // ==========================================
    // CADASTRO
    // ==========================================

    @PostMapping("/registration")
    public ResponseEntity<?> registerUsuario(
            @Valid @RequestBody Usuario usuario,
            @RequestParam String codigo
    ) {

        try {

            Usuario salvo =
                    usuarioService.registerUsuario(
                            usuario,
                            codigo
                    );

            return ResponseEntity.ok(
                    Map.of(
                            "id",
                            salvo.getId(),

                            "nome",
                            salvo.getNome(),

                            "email",
                            salvo.getEmail()
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "erro",
                            e.getMessage()
                    )
            );
        }
    }

    // ==========================================
    // LOGIN
    // ==========================================

    @PostMapping("/login")
    public ResponseEntity<?> loginUsuario(
            @RequestBody Usuario usuario
    ) {

        try {

            Usuario logado =
                    usuarioService.loginUsuario(
                            usuario.getEmail(),
                            usuario.getSenha()
                    );

            return ResponseEntity.ok(
                    Map.of(
                            "id",
                            logado.getId(),

                            "nome",
                            logado.getNome(),

                            "email",
                            logado.getEmail(),

                            "tipo",
                            logado.getTipo()
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity.status(401).body(
                    Map.of(
                            "erro",
                            e.getMessage()
                    )
            );
        }
    }

    // ==========================================
    // RECUPERAR SENHA
    // ==========================================

    @PostMapping("/recuperar-senha")
    public ResponseEntity<?> recuperarSenha(
            @RequestBody Map<String, String> body
    ) {

        try {

            usuarioService.gerarTokenRecuperacao(
                    body.get("email")
            );

            return ResponseEntity.ok(
                    Map.of(
                            "mensagem",
                            "Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas."
                    )
            );

        } catch (RuntimeException e) {

            // Não revelamos se o e-mail existe.
            return ResponseEntity.ok(
                    Map.of(
                            "mensagem",
                            "Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas."
                    )
            );
        }
    }

    // ==========================================
    // REDEFINIR SENHA
    // ==========================================

    @PostMapping("/redefinir-senha")
    public ResponseEntity<?> redefinirSenha(
            @RequestBody Map<String, String> body
    ) {

        try {

            usuarioService.redefinirSenha(
                    body.get("token"),
                    body.get("novaSenha")
            );

            return ResponseEntity.ok(
                    Map.of(
                            "mensagem",
                            "Senha redefinida com sucesso"
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "erro",
                            e.getMessage()
                    )
            );
        }
    }


    // =============================================
    // MINHA CONTA: LEITURA
    // =============================================

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPerfil(@PathVariable Long id) {
        try {

            return ResponseEntity.ok(
                    PerfilResponse.de(usuarioService.buscarPorId(id))
            );
        } catch (RuntimeException e) {

            return ResponseEntity.status(404).body(
                    Map.of("Erro", e.getMessage())
            );
        }
    }


    // =============================================
    // MINHA CONTA: ALTERAR TELEFONE
    // =============================================

    @PatchMapping("/{id}/telefone")
    public ResponseEntity<?> alterarTelefone(
            @PathVariable Long id,
            @Valid @RequestBody AlterarTelefoneRequest body
    ) {
        try {
            return ResponseEntity.ok(
                    PerfilResponse.de(
                            usuarioService.alterarTelefone(id, body.telefone())
                    )
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erro", e.getMessage())
            );
        }
    }

    // =============================================
    // MINHA CONTA: ALTERAR E-MAIL (2 PASSOS)
    // =============================================

    @PostMapping("/{id}/email/enviar-codigo")
    public ResponseEntity<?> enviarCodigoTrocaEmail(
            @PathVariable Long id,
            @Valid @RequestBody SolicitarTrocaEmailRequest body
    ) {
        try {
            usuarioService.enviarCodigoTrocaEmail(id, body.novoEmail());

            return ResponseEntity.ok(
                    Map.of("mensagem", "Código enviado para o novo e-mail")
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erro", e.getMessage())
            );
        }
    }

    @PatchMapping("/{id}/email")
    public ResponseEntity<?> alterEmail(
            @PathVariable Long id,
            @Valid @RequestBody AlterarEmailRequest body
    ) {
        try {
            return ResponseEntity.ok(
                    PerfilResponse.de(
                            usuarioService.alterarEmail(
                                    id,
                                    body.novoEmail(),
                                    body.codigo(),
                                    body.senha()
                            )
                    )
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erro", e.getMessage())
            );
        }
    }
    
}