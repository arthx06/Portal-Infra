package org.example.portalinfra.service;

import org.example.portalinfra.model.PasswordResetToken;
import org.example.portalinfra.model.Usuario;
import org.example.portalinfra.repository.PasswordResetTokenRepository;
import org.example.portalinfra.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UsuarioService(UsuarioRepository usuarioRepository,
                           PasswordResetTokenRepository tokenRepository,
                           PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario registerUsuario(Usuario usuario) {
        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            throw new RuntimeException("E-mail já cadastrado");
        }
        usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));
        if (usuario.getTipo() == null) {
            usuario.setTipo("COMUM");
        }
        return usuarioRepository.save(usuario);
    }

    public Usuario loginUsuario(String email, String rawSenha) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (!passwordEncoder.matches(rawSenha, usuario.getSenha())) {
            throw new RuntimeException("Senha inválida");
        }
        return usuario;
    }

    public String gerarTokenRecuperacao(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        String token = UUID.randomUUID().toString();
        tokenRepository.save(new PasswordResetToken(token, usuario, LocalDateTime.now().plusMinutes(30)));
        return token;
    }

    public void redefinirSenha(String token, String novaSenha) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token inválido"));
        if (resetToken.isExpirado()) {
            throw new RuntimeException("Token expirado");
        }
        Usuario usuario = resetToken.getUsuario();
        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);
    }
}