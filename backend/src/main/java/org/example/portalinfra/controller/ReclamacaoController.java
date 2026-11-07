
package org.example.portalinfra.controller;

import jakarta.validation.Valid;

import org.example.portalinfra.dto.ReclamacaoRequest;
import org.example.portalinfra.dto.ReclamacaoResponse;
import org.example.portalinfra.model.Reclamacao;
import org.example.portalinfra.repository.ReclamacaoRepository;
import org.example.portalinfra.service.ReclamacaoService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.server.ResponseStatusException;
import org.example.portalinfra.config.SessaoUtil;
import org.springframework.security.core.Authentication;



@RestController
@RequestMapping("/reclamacoes")
public class ReclamacaoController {

    private final ReclamacaoService reclamacaoService;
    private final ReclamacaoRepository reclamacaoRepository;

    public ReclamacaoController(ReclamacaoService reclamacaoService, ReclamacaoRepository reclamacaoRepository) {
        this.reclamacaoService = reclamacaoService;
        this.reclamacaoRepository = reclamacaoRepository;
    }

    @GetMapping("/contagem")
    public ResponseEntity<java.util.Map<String, Long>> contagem() {
        return ResponseEntity.ok(java.util.Map.of(
            "total", reclamacaoRepository.count(),
            "pendentes", reclamacaoRepository.countByStatusIgnoreCase("Pendente"),
            "resolvidas", reclamacaoRepository.countByStatusIgnoreCase("Resolvida")
        ));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> criar(
            @Valid @RequestPart("dados") ReclamacaoRequest dados,
            @RequestPart("foto") MultipartFile foto,
            Authentication auth) {

        ReclamacaoResponse resposta =
            reclamacaoService.criar(dados, foto, SessaoUtil.idLogado(auth));
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping
    public ResponseEntity<Page<ReclamacaoResponse>> listarTodas(
            @RequestParam(value = "titulo", required = false) String titulo,
            @RequestParam(value = "categoria", required = false) String categoria,
            @RequestParam(value = "bairro", required = false) String bairro,
            @RequestParam(value = "status", required = false) String status,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reclamacaoService.listarTodas(titulo, categoria, bairro, status, pageable));
    }

    
    @GetMapping("/minhas")
    public ResponseEntity<Page<ReclamacaoResponse>> listarMinhas(
            Authentication auth,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
            reclamacaoService.listarPorUsuario(SessaoUtil.idLogado(auth), pageable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarPeloUsuario(
            @PathVariable Long id, Authentication auth) {
        reclamacaoService.deletarPeloUsuario(id, SessaoUtil.idLogado(auth));
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> deletarPeloAdmin(
            @PathVariable Long id, Authentication auth) {
        reclamacaoService.deletarPeloAdmin(id, SessaoUtil.idLogado(auth));
        return ResponseEntity.noContent().build();
    }



    @PatchMapping("/admin/{id}/status")
    public ResponseEntity<ReclamacaoResponse> atualizarStatus(
            @PathVariable Long id,
            Authentication auth,
            @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(reclamacaoService.atualizarStatus(
            id, body.get("status"), SessaoUtil.idLogado(auth)));
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> editarReclamacao(
            @PathVariable Long id,
            Authentication auth,
            @RequestPart("dados") ReclamacaoRequest request,
            @RequestPart(value = "foto", required = false) MultipartFile novaFoto) {

        return ResponseEntity.ok(reclamacaoService.editarReclamacao(
            id, SessaoUtil.idLogado(auth), request, novaFoto));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ReclamacaoResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(reclamacaoService.buscarPorId(id));
    }

    @PostMapping("/admin/geocodificar-pendentes")
    public ResponseEntity<java.util.Map<String, Integer>> geocodificarPendentes(
            Authentication auth) {

        return ResponseEntity.ok(
                reclamacaoService.geocodificarReclamacoesPendentes(
                        SessaoUtil.idLogado(auth)
                )
        );
    }
}
