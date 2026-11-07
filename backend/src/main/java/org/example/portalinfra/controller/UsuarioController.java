package org.example.portalinfra.controller;


import org.example.portalinfra.service.JwtService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

import java.time.Duration;


import jakarta.validation.Valid;

import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.service.UsuarioService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import org.example.portalinfra.dto.AlterarEmailRequest;
import org.example.portalinfra.dto.AlterarSenhaRequest;
import org.example.portalinfra.dto.AlterarTelefoneRequest;
import org.example.portalinfra.dto.PerfilResponse;
import org.example.portalinfra.dto.SolicitarTrocaEmailRequest;
import org.example.portalinfra.dto.AtualizarPerfilRequest;
import org.example.portalinfra.config.SessaoUtil;
import org.springframework.security.core.Authentication;


@RestController
@RequestMapping("/usuarios")
public class UsuarioController {


        private final UsuarioService usuarioService;
        private final JwtService jwtService;

        @Value("${google.maps.api-key}")
        private String googleMapsApiKey;

        public UsuarioController(
                UsuarioService usuarioService,
                JwtService jwtService
        ) {
                this.usuarioService = usuarioService;
                this.jwtService = jwtService;
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

    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastrarUsuario(
            @Valid @RequestBody Usuario usuario,
            @RequestParam String codigo
    ) {

        try {
                System.out.println("CADASTRO >> cep=" + usuario.getCep()
        + " | tel=" + usuario.getTelefone()
        + " | cidade=" + usuario.getCidade());
            Usuario salvo =
                    usuarioService.cadastrarUsuario(
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
                        Usuario logado = usuarioService.loginUsuario(
                                usuario.getEmail(),
                                usuario.getSenha()
                        );

                        // Gera o JWT usando o ID do usuário autenticado
                        String token = jwtService.gerarToken(logado.getId());

                        // Cria o cookie que será enviado pelo navegador
                        ResponseCookie cookie = ResponseCookie
                                .from("JWT_TOKEN", token)
                                .httpOnly(true)
                                .secure(true)
                                .sameSite("None")
                                .path("/")
                                .maxAge(Duration.ofHours(1))
                                .build();

                        return ResponseEntity.ok()
                                .header(
                                        HttpHeaders.SET_COOKIE,
                                        cookie.toString()
                                )
                                .body(Map.of(
                                        "id", logado.getId(),
                                        "nome", logado.getNome(),
                                        "email", logado.getEmail(),
                                        "tipo", logado.getTipo()
                                ));

                } catch (RuntimeException e) {
                        return ResponseEntity.status(401).body(
                                Map.of("erro", e.getMessage())
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

        @PatchMapping("/me/senha")
        public ResponseEntity<?> alterarSenha(
                Authentication auth,
                @Valid @RequestBody AlterarSenhaRequest body) {
        try {
                Long id = SessaoUtil.idLogado(auth);
                usuarioService.alterarSenha(id, body.senhaAtual(), body.novaSenha());
                return ResponseEntity.ok(Map.of("mensagem", "Senha alterada com sucesso."));
        } catch (RuntimeException e) {
                return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
        }
       
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
       

        @GetMapping("/me")
        public ResponseEntity<?> buscarPerfil(Authentication auth) {
        try {
                Long id = SessaoUtil.idLogado(auth);
                return ResponseEntity.ok(PerfilResponse.de(usuarioService.buscarPorId(id)));
        } catch (RuntimeException e) {
                return ResponseEntity.status(404).body(Map.of("erro", e.getMessage()));
        }
        }

        @PutMapping("/me/perfil")
        public ResponseEntity<PerfilResponse> atualizarPerfil(
                Authentication auth,
                @Valid @RequestBody AtualizarPerfilRequest request) {

        Long id = SessaoUtil.idLogado(auth);
        return ResponseEntity.ok(usuarioService.atualizarPerfil(id, request));
        }

        @PatchMapping("/me/telefone")
        public ResponseEntity<?> alterarTelefone(
                Authentication auth,
                @Valid @RequestBody AlterarTelefoneRequest body) {
        try {
                Long id = SessaoUtil.idLogado(auth);
                return ResponseEntity.ok(
                PerfilResponse.de(usuarioService.alterarTelefone(id, body.telefone())));
        } catch (RuntimeException e) {
                return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
        }

        @PostMapping("/me/email/enviar-codigo")
        public ResponseEntity<?> enviarCodigoTrocaEmail(
                Authentication auth,
                @Valid @RequestBody SolicitarTrocaEmailRequest body) {
        try {
                Long id = SessaoUtil.idLogado(auth);
                usuarioService.enviarCodigoTrocaEmail(id, body.novoEmail());
                return ResponseEntity.ok(Map.of("mensagem", "Código enviado para o novo e-mail"));
        } catch (RuntimeException e) {
                return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
        }

        @PatchMapping("/me/email")
        public ResponseEntity<?> alterEmail(
                Authentication auth,
                @Valid @RequestBody AlterarEmailRequest body) {
        try {
                Long id = SessaoUtil.idLogado(auth);
                return ResponseEntity.ok(PerfilResponse.de(
                usuarioService.alterarEmail(id, body.novoEmail(), body.codigo(), body.senha())));
        } catch (RuntimeException e) {
                return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
        }

        @PatchMapping("/me/desativar")
        public ResponseEntity<?> desativarConta(
                Authentication auth,
                @RequestBody Map<String, String> body) {
        try {
                Long id = SessaoUtil.idLogado(auth);
                usuarioService.desativarConta(id, body.get("senha"));

                // já encerra a sessão: apaga o cookie
                ResponseCookie apagar = ResponseCookie.from("JWT_TOKEN", "")
                .httpOnly(true).secure(true).sameSite("None")
                .path("/").maxAge(0).build();

                return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, apagar.toString())
                .body(Map.of("mensagem", "Conta desativada com sucesso."));
        } catch (RuntimeException e) {
                return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
        }
        
     
        @GetMapping("/sessao")
        public ResponseEntity<?> verificarSessao(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Long id) {

                Usuario usuario = usuarioService.buscarPorId(id);

                return ResponseEntity.ok(Map.of(
                "autenticado", true,
                "id", usuario.getId(),
                "nome", usuario.getNome(),
                "email", usuario.getEmail(),
                "tipo", usuario.getTipo()
                ));
        }

        return ResponseEntity.ok(Map.of("autenticado", false));
        }


        @PostMapping("/logout")
        public ResponseEntity<?> logout() {
        ResponseCookie raiz = ResponseCookie.from("JWT_TOKEN", "")
                .httpOnly(true).secure(true).sameSite("None")
                .path("/").maxAge(0).build();

        ResponseCookie antigo = ResponseCookie.from("JWT_TOKEN", "")
                .httpOnly(true).secure(true).sameSite("None")
                .path("/usuarios").maxAge(0).build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, raiz.toString())
                .header(HttpHeaders.SET_COOKIE, antigo.toString())
                .body(Map.of("mensagem", "Sessão encerrada"));
        }


    // =============================================
    // MINHA CONTA: ALTERAR TELEFONE
    // =============================================

   
    
    // =============================================
    // MINHA CONTA: ALTERAR E-MAIL (2 PASSOS)
    // =============================================

   

        @GetMapping("/config/maps")
        public ResponseEntity<?> getMapsConfig() {
        return ResponseEntity.ok(
                Map.of("apiKey", googleMapsApiKey)
        );
        }



    // =============================================
    // PING PARA MANTER O SERVIDOR ATIVO
    // =============================================


        @GetMapping("/ping")
        public ResponseEntity<String> ping() {
            return ResponseEntity.ok("O servidor está ativo!");
        }

}