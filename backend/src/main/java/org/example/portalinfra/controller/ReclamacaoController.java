package org.example.portalinfra.controller;

import jakarta.validation.Valid;

import org.example.portalinfra.dto.ReclamacaoRequest;
import org.example.portalinfra.dto.ReclamacaoResponse;
import org.example.portalinfra.repository.ReclamacaoRepository;
import org.example.portalinfra.service.ReclamacaoService;
import org.example.portalinfra.config.SessaoUtil;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reclamacoes")
public class ReclamacaoController {

    private final ReclamacaoService reclamacaoService;
    private final ReclamacaoRepository reclamacaoRepository;

    public ReclamacaoController(ReclamacaoService reclamacaoService, ReclamacaoRepository reclamacaoRepository) {
        this.reclamacaoService = reclamacaoService;
        this.reclamacaoRepository = reclamacaoRepository;
    }

    // ==========================================
    // LEITURA E CONTAGEM (PÚBLICO)
    // ==========================================

    @GetMapping("/contagem")
    public ResponseEntity<?> contagem() {
        return ResponseEntity.ok(Map.of(
                "total", reclamacaoRepository.count(),
                "pendentes", reclamacaoRepository.countByStatusIgnoreCase("Pendente"),
                "resolvidas", reclamacaoRepository.countByStatusIgnoreCase("Resolvida")
        ));
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

    @GetMapping("/{id}")
    public ResponseEntity<ReclamacaoResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(reclamacaoService.buscarPorId(id));
    }

    // ==========================================
    // CRIAÇÃO E LEITURA (USUÁRIO)
    // ==========================================

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> criar(
            @Valid @RequestPart("dados") ReclamacaoRequest dados,
            @RequestPart("fotos") List<MultipartFile> fotos,
            Authentication auth) {

        ReclamacaoResponse resposta = reclamacaoService.criar(
                dados,
                fotos,
                SessaoUtil.idLogado(auth)
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    @GetMapping("/minhas")
    public ResponseEntity<Page<ReclamacaoResponse>> listarMinhas(
            Authentication auth,
            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(reclamacaoService.listarPorUsuario(SessaoUtil.idLogado(auth), pageable));
    }

    // ==========================================
    // EDIÇÃO (USUÁRIO E ADMIN)
    // ==========================================

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> editarReclamacao(
            @PathVariable Long id,
            Authentication auth,
            @RequestPart("dados") ReclamacaoRequest request,
            @RequestPart(value = "foto", required = false) MultipartFile novaFoto) {

        return ResponseEntity.ok(reclamacaoService.editarReclamacao(
                id, SessaoUtil.idLogado(auth), request, novaFoto));
    }

    @PatchMapping(value = "/admin/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> editarReclamacaoPeloAdmin(
            @PathVariable Long id,
            Authentication auth,
            @RequestPart("dados") ReclamacaoRequest request,
            @RequestPart(value = "foto", required = false) MultipartFile novaFoto) {

        return ResponseEntity.ok(reclamacaoService.editarReclamacaoPeloAdmin(
                id, SessaoUtil.idLogado(auth), request, novaFoto));
    }

    @PatchMapping(value = "/{reclamacaoId}/fotos/{fotoId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReclamacaoResponse> substituirFoto(
            @PathVariable Long reclamacaoId,
            @PathVariable Long fotoId,
            Authentication auth,
            @RequestPart("foto") MultipartFile novaFoto) {

        return ResponseEntity.ok(reclamacaoService.substituirFoto(
                reclamacaoId,
                fotoId,
                SessaoUtil.idLogado(auth),
                novaFoto
        ));
    }

    // ==========================================
    // EXCLUSÃO E MODERAÇÃO (USUÁRIO E ADMIN)
    // ==========================================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarPeloUsuario(@PathVariable Long id, Authentication auth) {
        reclamacaoService.deletarPeloUsuario(id, SessaoUtil.idLogado(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> deletarPeloAdmin(@PathVariable Long id, Authentication auth) {
        reclamacaoService.deletarPeloAdmin(id, SessaoUtil.idLogado(auth));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/{id}/status")
    public ResponseEntity<ReclamacaoResponse> atualizarStatus(
            @PathVariable Long id,
            Authentication auth,
            @RequestBody Map<String, String> body) {

        return ResponseEntity.ok(reclamacaoService.atualizarStatus(
                id, body.get("status"), SessaoUtil.idLogado(auth)));
    }

    @PostMapping("/admin/geocodificar-pendentes")
    public ResponseEntity<?> geocodificarPendentes(Authentication auth) {
        return ResponseEntity.ok(reclamacaoService.geocodificarReclamacoesPendentes(
                SessaoUtil.idLogado(auth)
        ));
    }
}