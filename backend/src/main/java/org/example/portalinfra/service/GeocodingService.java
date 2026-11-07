
package org.example.portalinfra.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

@Service
public class GeocodingService {

    private final RestClient restClient;
    private final String apiKey;

    public GeocodingService(
            @Value("${google.geocoding.api-key:}") String apiKey) {

        this.apiKey = apiKey;

        this.restClient = RestClient.builder()
                .baseUrl("https://geocode.googleapis.com")
                .build();
    }

    public record Coordenadas(
            double latitude,
            double longitude) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Resposta(List<Resultado> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Resultado(Local location) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Local(
            double latitude,
            double longitude) {
    }

    public Optional<Coordenadas> buscar(
            String endereco,
            String bairro) {

        if (apiKey == null || apiKey.isBlank()
                || endereco == null || endereco.isBlank()) {
            return Optional.empty();
        }

        StringBuilder consulta = new StringBuilder(endereco.trim());

        if (bairro != null && !bairro.isBlank()
                && !"Outro".equalsIgnoreCase(bairro.trim())) {
            consulta.append(", ").append(bairro.trim());
        }

        consulta.append(", São Paulo, SP, Brasil");

        try {
            Resposta resposta = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v4/geocode/address/{address}")
                            .build(consulta.toString()))
                    .header("X-Goog-Api-Key", apiKey)
                    .retrieve()
                    .body(Resposta.class);

            if (resposta == null
                    || resposta.results() == null
                    || resposta.results().isEmpty()) {
                return Optional.empty();
            }

            Local local = resposta.results().get(0).location();

            if (local == null) {
                return Optional.empty();
            }

            double latitude = local.latitude();
            double longitude = local.longitude();

            // Limita os resultados à região da Grande São Paulo.
            if (latitude < -24.10 || latitude > -23.20
                    || longitude < -47.00 || longitude > -46.20) {
                return Optional.empty();
            }

            return Optional.of(
                    new Coordenadas(latitude, longitude));

        } catch (Exception e) {
            System.err.println(
                    "Erro na geocodificação: "
                    + e.getClass().getSimpleName());

            return Optional.empty();
        }
    }
}
