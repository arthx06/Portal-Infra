package org.example.portalinfra.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class EmailService {

    private static final Logger log =
            LoggerFactory.getLogger(EmailService.class);

    private static final String BREVO_URL =
            "https://api.brevo.com/v3/smtp/email";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${brevo.api-key}")
    private String apiKey;

    @Value("${brevo.sender-email}")
    private String remetenteEmail;

    @Value("${brevo.sender-name:Portal Infra}")
    private String remetenteNome;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public void enviarCodigoVerificacao(String email, String codigo) {

        String texto =
                "Olá!\n\n" +
                "Seu código de verificação do Portal Infra é:\n\n" +
                codigo + "\n\n" +
                "Esse código é válido por 10 minutos.\n\n" +
                "Se você não solicitou esse código, ignore este e-mail.";

        enviar(email, "Código de verificação - Portal Infra", texto);
    }

    public void enviarEmailRecuperacao(String email, String token) {

        String link = frontendUrl + "/redefinir-senha.html?token=" + token;

        String texto =
                "Olá!\n\n" +
                "Recebemos uma solicitação para redefinir sua senha.\n\n" +
                "Acesse o link abaixo para criar uma nova senha:\n\n" +
                link + "\n\n" +
                "Esse link é válido por 30 minutos.\n\n" +
                "Se você não solicitou a recuperação de senha, ignore este e-mail.";

        enviar(email, "Recuperação de senha - Portal Infra", texto);
    }

    // ==========================================
    // ENVIO PELA API DO BREVO (HTTPS)
    // ==========================================

    private void enviar(String destinatario, String assunto, String texto) {

        String json = "{"
                + "\"sender\":{\"name\":\"" + escapar(remetenteNome)
                + "\",\"email\":\"" + escapar(remetenteEmail) + "\"},"
                + "\"to\":[{\"email\":\"" + escapar(destinatario) + "\"}],"
                + "\"subject\":\"" + escapar(assunto) + "\","
                + "\"textContent\":\"" + escapar(texto) + "\""
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BREVO_URL))
                .timeout(Duration.ofSeconds(15))
                .header("api-key", apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        json, StandardCharsets.UTF_8))
                .build();

        try {

            HttpResponse<String> resposta = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (resposta.statusCode() < 200 || resposta.statusCode() >= 300) {
                log.error("Falha ao enviar e-mail. Status: {} Resposta: {}",
                        resposta.statusCode(), resposta.body());
                throw new RuntimeException(
                        "Não foi possível enviar o e-mail. Tente novamente mais tarde."
                );
            }

        } catch (IOException e) {
            log.error("Erro de conexão ao enviar e-mail", e);
            throw new RuntimeException(
                    "Não foi possível enviar o e-mail. Tente novamente mais tarde."
            );
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Envio de e-mail interrompido. Tente novamente."
            );
        }
    }

    // Escapa caracteres especiais para caber em uma string JSON.
    private String escapar(String valor) {

        StringBuilder sb = new StringBuilder();

        for (char c : valor.toCharArray()) {
            switch (c) {
                case '"'  -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }

        return sb.toString();
    }
}