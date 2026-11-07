
package org.example.portalinfra.config;

import org.example.portalinfra.service.JwtService;
import org.example.portalinfra.repository.UsuarioRepository;
import org.example.portalinfra.model.Usuario;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtCookieFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "JWT_TOKEN";
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

        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = null;

        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                token = cookie.getValue();
                break;
            }
        }

        if (token != null
                && SecurityContextHolder.getContext()
                        .getAuthentication() == null
                && jwtService.validarToken(token)) {

            try {
                Long usuarioId =
                        jwtService.extrairUsuarioId(token);

               Usuario usuario = usuarioRepository.findById(usuarioId)
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

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

            } catch (RuntimeException e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}

