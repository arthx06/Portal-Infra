package org.example.portalinfra.config;

import org.example.portalinfra.service.JwtService;
import org.example.portalinfra.repository.UsuarioRepository;
import org.example.portalinfra.model.Usuario;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Autentica a requisição por JWT.
 * Ordem: 1) header "Authorization: Bearer <token>" (funciona no Safari);
 *        2) cookie JWT_TOKEN (fallback).
 */
@Component
public class JwtCookieFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "JWT_TOKEN";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtCookieFilter(
            JwtService jwtService,
            UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = extrairToken(request);

        if (token != null
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            try {
                Long usuarioId = jwtService.extrairUsuarioId(token);

                Usuario usuario = usuarioRepository.findById(usuarioId)
                        .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

                // Conta desativada não autentica, mesmo com token ainda válido.
                if (usuario.isEstaAtivo()) {

                    String autoridade =
                            "ADMIN".equalsIgnoreCase(usuario.getTipo())
                                    ? "ROLE_ADMIN"
                                    : "ROLE_COMUM";

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    usuarioId,
                                    null,
                                    List.of(new SimpleGrantedAuthority(autoridade))
                            );

                    SecurityContextHolder.getContext()
                            .setAuthentication(authentication);
                }

            } catch (RuntimeException e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    // Devolve o primeiro token VÁLIDO encontrado (header primeiro, depois cookies).
    private String extrairToken(HttpServletRequest request) {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length()).trim();

            if (!token.isEmpty() && jwtService.validarToken(token)) {
                return token;
            }
        }

        Cookie[] cookies = request.getCookies();

        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (COOKIE_NAME.equals(cookie.getName())
                        && jwtService.validarToken(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }
}
