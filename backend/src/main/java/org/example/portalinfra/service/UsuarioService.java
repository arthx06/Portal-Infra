package org.example.portalinfra.service;

import org.example.portalinfra.model.EmailVerification;
import org.example.portalinfra.model.PasswordResetToken;
import org.example.portalinfra.model.Usuario;

import org.example.portalinfra.repository.EmailVerificationRepository;
import org.example.portalinfra.repository.PasswordResetTokenRepository;
import org.example.portalinfra.repository.UsuarioRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    private static boolean vazio(String s) {
    return s == null || s.isBlank();
}
    @Autowired
    public UsuarioService(
            UsuarioRepository usuarioRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailVerificationRepository emailVerificationRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // ==========================================
    // ENVIAR CÓDIGO DE VERIFICAÇÃO
    // ==========================================
    @Transactional
    public void enviarCodigoVerificacao(String email) {

        if (email == null || email.isBlank()) {
            throw new RuntimeException(
                    "E-mail é obrigatório"
            );
        }

        email = email.trim().toLowerCase();

        if (usuarioRepository.existsByEmail(email)) {
            throw new RuntimeException(
                    "E-mail já cadastrado"
            );
        }

        String codigo = String.format(
                "%06d",
                secureRandom.nextInt(1_000_000)
        );

        // Se já havia um código para esse e-mail,
        // substitui pelo novo.
        emailVerificationRepository.deleteByEmail(email);

        EmailVerification verificacao =
                new EmailVerification(
                        email,
                        codigo,
                        LocalDateTime.now().plusMinutes(10)
                );

        emailVerificationRepository.save(verificacao);

        emailService.enviarCodigoVerificacao(
                email,
                codigo
        );
    }

    // ==========================================
    // CADASTRO
    // ==========================================

    @Transactional
    public Usuario registerUsuario(
            Usuario usuario,
            String codigo
    ) {

        String email =
                usuario.getEmail().trim().toLowerCase();

        if (usuarioRepository.existsByEmail(email)) {
            throw new RuntimeException(
                    "E-mail já cadastrado"
            );
        }
        if (vazio(usuario.getTelefone()) || vazio(usuario.getCep())
                || vazio(usuario.getLogradouro()) || vazio(usuario.getNumero())
                || vazio(usuario.getBairro()) || vazio(usuario.getCidade())
                || vazio(usuario.getUf())) {
        throw new RuntimeException("Telefone e endereço completo são obrigatórios");
        }

        usuario.setUf(usuario.getUf().trim().toUpperCase());

        EmailVerification verificacao =
                emailVerificationRepository
                        .findByEmailAndCodigo(
                                email,
                                codigo
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Código de verificação inválido"
                                )
                        );

        if (verificacao.isExpirado()) {

            emailVerificationRepository.delete(
                    verificacao
            );

            throw new RuntimeException(
                    "Código de verificação expirado"
            );
        }

        usuario.setEmail(email);

        usuario.setSenha(
                passwordEncoder.encode(
                        usuario.getSenha()
                )
        );

        // O tipo é definido pelo backend.
        usuario.setTipo("COMUM");

        Usuario salvo =
                usuarioRepository.save(usuario);

        // Impede reutilização do código.
        emailVerificationRepository.delete(
                verificacao
        );

        return salvo;
    }

    // ==========================================
    // LOGIN
    // ==========================================

    public Usuario loginUsuario(
            String email,
            String rawSenha
    ) {

        email = email.trim().toLowerCase();

        Usuario usuario =
                usuarioRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "E-mail ou senha inválidos"
                                )
                        );

        if (!passwordEncoder.matches(
                rawSenha,
                usuario.getSenha()
        )) {
            throw new RuntimeException(
                    "E-mail ou senha inválidos"
            );
        }

        return usuario;
    }

    // ==========================================
    // RECUPERAÇÃO DE SENHA
    // ==========================================

    @Transactional
    public void gerarTokenRecuperacao(
            String email
    ) {

        email = email.trim().toLowerCase();

        Usuario usuario =
                usuarioRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Não foi possível realizar a recuperação"
                                )
                        );

        // Remove tokens antigos.
        tokenRepository.deleteByUsuario(
                usuario
        );

        String token =
                UUID.randomUUID().toString();

        PasswordResetToken resetToken =
                new PasswordResetToken(
                        token,
                        usuario,
                        LocalDateTime.now()
                                .plusMinutes(30)
                );

        tokenRepository.save(resetToken);

        // O token vai somente para o e-mail.
        emailService.enviarEmailRecuperacao(
                email,
                token
        );
    }

    // ==========================================
    // REDEFINIR SENHA
    // ==========================================

    @Transactional
    public void redefinirSenha(
            String token,
            String novaSenha
    ) {

        if (novaSenha == null ||
                novaSenha.length() < 6) {

            throw new RuntimeException(
                    "A senha deve ter no mínimo 6 caracteres"
            );
        }

        PasswordResetToken resetToken =
                tokenRepository
                        .findByToken(token)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Token inválido"
                                )
                        );

        if (resetToken.isExpirado()) {

            tokenRepository.delete(
                    resetToken
            );

            throw new RuntimeException(
                    "Token expirado"
            );
        }

        Usuario usuario =
                resetToken.getUsuario();

        usuario.setSenha(
                passwordEncoder.encode(
                        novaSenha
                )
        );

        usuarioRepository.save(usuario);

        // Token de recuperação é de uso único.
        tokenRepository.delete(
                resetToken
        );
    }


    // ============================================
    // MINHA CONTA
    // ============================================

    @Transactional(readOnly = true)
    public Usuario buscarPorId(Long id) {
        return usuarioRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Usuário não encontrado!")
                );
    }

    @Transactional
    public Usuario alterarTelefone(Long id, String telefone) {
        Usuario usuario = buscarPorId(id);

        // Considera somente os dígitos, desconsidera () e =
        String digitos = telefone == null
                ? ""
                : telefone.replaceAll("\\D", "");

        // Garante que somente números de telefone celular serão aceitos
        if (!digitos.matches("[1-9]{2}9\\d{8}")) {
            throw new RuntimeException(
                    "Telefone inválido. Informe um número de telefone celular com DDD (11 Dígitos)."
            );
        }

        usuario.setTelefone(digitos);

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public void enviarCodigoTrocaEmail(Long id, String novoEmail) {

        // Verifica se o usuário já existe
        buscarPorId(id);

        // Valida duplicidade, gera o código e envia para o novo email
        enviarCodigoVerificacao(novoEmail);
    }

    @Transactional
    public Usuario alterarEmail(
            Long id,
            String novoEmail,
            String codigo,
            String senha
    ) {
        Usuario usuario = buscarPorId(id);

        if (!passwordEncoder.matches(senha, usuario.getSenha())) {
            throw new RuntimeException("Senha incorreta!");
        }

        String email = novoEmail.trim().toLowerCase();

        if (usuarioRepository.existsByEmail(email)) {
            throw new RuntimeException("O e-mail informado já está cadastrado!");
        }

        EmailVerification verificacao =
                emailVerificationRepository
                        .findByEmailAndCodigo(email, codigo)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Código de verificação inválido!"
                                )
                        );

        if (verificacao.isExpirado()) {
            throw new RuntimeException("Código de verificação expirado!");
        }

        usuario.setEmail(email);

        Usuario salvo = usuarioRepository.save(usuario);

        // Apaga o código de verificação para impedir que ele seja reutilizado
        emailVerificationRepository.delete(verificacao);

        return salvo;
    }

}