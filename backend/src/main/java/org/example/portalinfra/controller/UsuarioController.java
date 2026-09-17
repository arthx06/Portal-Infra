package org.example.portalinfra.controller;

import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @Autowired
    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/registration")
    public ResponseEntity<?> registerUsuario(@RequestBody Usuario usuario) {
        try {
            Usuario salvo = usuarioService.registerUsuario(usuario);
            return ResponseEntity.ok(Map.of("id", salvo.getId(), "email", salvo.getEmail()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUsuario(@RequestBody Usuario usuario) {
        try {
            Usuario logado = usuarioService.loginUsuario(usuario.getEmail(), usuario.getSenha());
            return ResponseEntity.ok(Map.of(
                    "id", logado.getId(),
                    "nome", logado.getNome(),
                    "email", logado.getEmail(),
                    "tipo", logado.getTipo()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("erro", e.getMessage()));
        }
    }

    @PostMapping("/recuperar-senha")
    public ResponseEntity<?> recuperarSenha(@RequestBody Map<String, String> body) {
        try {
            String token = usuarioService.gerarTokenRecuperacao(body.get("email"));
            return ResponseEntity.ok(Map.of("mensagem", "Token gerado", "token", token));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }

    @PostMapping("/redefinir-senha")
    public ResponseEntity<?> redefinirSenha(@RequestBody Map<String, String> body) {
        try {
            usuarioService.redefinirSenha(body.get("token"), body.get("novaSenha"));
            return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida com sucesso"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }
}
