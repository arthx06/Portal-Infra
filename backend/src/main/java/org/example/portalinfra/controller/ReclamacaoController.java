
package org.example.portalinfra.controller;

import jakarta.validation.Valid;

import org.example.portalinfra.dto.ReclamacaoRequest;
import org.example.portalinfra.dto.ReclamacaoResponse;
import org.example.portalinfra.service.ReclamacaoService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/reclamacoes")
public class ReclamacaoController {

    private final ReclamacaoService reclamacaoService;

    public ReclamacaoController(ReclamacaoService reclamacaoService) {
        this.reclamacaoService = reclamacaoService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> criar(
            @Valid @RequestPart("dados") ReclamacaoRequest dados,
            @RequestPart("foto") MultipartFile foto,
            @RequestParam("usuarioId") Long usuarioId) {

        ReclamacaoResponse resposta =
            reclamacaoService.criar(dados, foto, usuarioId);

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(resposta);
    }
}
