
package org.example.portalinfra.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtCookieFilter jwtCookieFilter;

    public SecurityConfig(JwtCookieFilter jwtCookieFilter) {
        this.jwtCookieFilter = jwtCookieFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http
    ) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(cors ->
                cors.configurationSource(corsConfigurationSource())
            )

            .sessionManagement(sm ->
                sm.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // Documentação
                .requestMatchers(
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()

                // Endpoints públicos de autenticação
             .requestMatchers(
                "/usuarios/login",
                "/usuarios/cadastro",
                "/usuarios/enviar-codigo",
                "/usuarios/recuperar-senha",
                "/usuarios/redefinir-senha",
                "/usuarios/config/maps",
                "/usuarios/sessao",
                "/usuarios/logout",
                     "/usuarios/ping"
            ).permitAll()

                // Preflight CORS
                .requestMatchers(
                    HttpMethod.OPTIONS, "/**"
                ).permitAll()

                .requestMatchers(HttpMethod.GET,
                        "/reclamacoes", "/reclamacoes/contagem",
                        "/comentarios/reclamacao/**"
                ).permitAll()
                // Todo o restante exige autenticação
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e.authenticationEntryPoint(
            (req, res, ex) -> res.sendError(401, "Não autenticado")))
            // Valida o cookie JWT antes da autenticação padrão
            .addFilterBefore(
                jwtCookieFilter,
                UsernamePasswordAuthenticationFilter.class
            );
            

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "https://arthx06.github.io"
        ));

        configuration.setAllowedMethods(List.of(
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of(
            "Content-Type",
            "Authorization",
            "X-XSRF-TOKEN"
        ));

        // Necessário para permitir cookies nas requisições CORS
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
