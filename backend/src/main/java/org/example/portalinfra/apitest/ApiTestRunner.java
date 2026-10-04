package org.example.portalinfra.apitest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Só roda com o profile "apitest". Os códigos chegam por e-mail: digite no console.
@Component
@Profile("apitest")
public class ApiTestRunner implements CommandLineRunner {

    private final ApplicationContext context;
    private final String baseUrl;
    private final Scanner teclado = new Scanner(System.in);
    private final HttpClient client = HttpClient.newHttpClient();

    public ApiTestRunner(
            ApplicationContext context,
            @Value("${API_URL:https://portal-infra-backend.onrender.com}") String baseUrl
    ) {
        this.context = context;
        this.baseUrl = baseUrl;
    }

    @Override
    public void run(String... args) {

        try {

            // 1. Criar usuário
            String email = ler("E-mail do novo usuário");
            enviar("POST", "/usuarios/enviar-codigo", "{\"email\":\"" + email + "\"}");

            String codigo = ler("Código recebido");
            String criado = enviar("POST", "/usuarios/registration?codigo=" + codigo,
                    "{\"nome\":\"Teste\",\"email\":\"" + email + "\",\"senha\":\"123456\"}");

            Matcher m = Pattern.compile("\"id\":(\\d+)").matcher(criado);
            if (!m.find()) return;
            String id = m.group(1);

            // 2. Trocar telefone
            enviar("PATCH", "/usuarios/" + id + "/telefone",
                    "{\"telefone\":\"(11) 91234-5678\"}");

            // 3. Trocar e-mail
            String novo = ler("Novo e-mail");
            enviar("POST", "/usuarios/" + id + "/email/enviar-codigo",
                    "{\"novoEmail\":\"" + novo + "\"}");

            String codigoNovo = ler("Código recebido no novo e-mail");
            enviar("PATCH", "/usuarios/" + id + "/email",
                    "{\"novoEmail\":\"" + novo + "\",\"codigo\":\"" + codigoNovo
                            + "\",\"senha\":\"123456\"}");

            // 4. Conferir o resultado
            enviar("GET", "/usuarios/" + id, null);

        } catch (Exception e) {
            System.out.println("[API-TEST] Erro: " + e);
        } finally {
            System.exit(SpringApplication.exit(context, () -> 0));
        }
    }

    private String ler(String pergunta) {
        System.out.print("\n[API-TEST] " + pergunta + ": ");
        return teclado.nextLine().trim();
    }

    // Faz a chamada, imprime "MÉTODO caminho -> status corpo" e devolve o corpo.
    private String enviar(String metodo, String caminho, String json) throws Exception {

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + caminho))
                .timeout(Duration.ofSeconds(90))
                .header("Content-Type", "application/json")
                .method(metodo, json == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> r = client.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("[API-TEST] " + metodo + " " + caminho + " -> "
                + r.statusCode() + " " + r.body());

        return r.body();
    }
}