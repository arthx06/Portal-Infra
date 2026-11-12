package org.example.portalinfra.controller;

import org.example.portalinfra.config.SessaoUtil;
import org.example.portalinfra.dto.ComentarioRequest;
import org.example.portalinfra.dto.ComentarioResponse;
import org.example.portalinfra.service.ComentarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/comentarios")
public class ComentarioController {

    private final ComentarioService comentarioService;

    public ComentarioController(ComentarioService comentarioService) {
        this.comentarioService = comentarioService;
    }

    // Rota 1: caso o front envie o ID na URL (/comentarios/reclamacao/{reclamacaoId})
    @PostMapping(value = "/reclamacao/{reclamacaoId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComentarioResponse> criarNaReclamacao(
            @PathVariable Long reclamacaoId,
            Authentication auth,
            @RequestPart("dados") ComentarioRequest request,
            @RequestPart(value = "foto", required = false) MultipartFile foto) {

        Long usuarioId = SessaoUtil.idLogado(auth);
        ComentarioResponse response = comentarioService.criar(usuarioId, reclamacaoId, request, foto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Rota 2: caso o front envie o reclamacaoId como parâmetro no FormData (/comentarios)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComentarioResponse> criar(
            @RequestParam("reclamacaoId") Long reclamacaoId,
            Authentication auth,
            @RequestPart("dados") ComentarioRequest request,
            @RequestPart(value = "foto", required = false) MultipartFile foto) {

        Long usuarioId = SessaoUtil.idLogado(auth);
        ComentarioResponse response = comentarioService.criar(usuarioId, reclamacaoId, request, foto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/reclamacao/{reclamacaoId}")
    public ResponseEntity<List<ComentarioResponse>> listarPorReclamacao(@PathVariable Long reclamacaoId) {
        return ResponseEntity.ok(comentarioService.listarPorReclamacao(reclamacaoId));
    }

    @GetMapping("/admin/resolucoes")
    public ResponseEntity<List>> listarSugestoesResolucao(Authentication auth) {
        Long adminId = SessaoUtil.idLogado(auth);
        return ResponseEntity.ok(comentarioService.listarSugestoesResolucaoParaAdmin(adminId));
    }

    // ==========================================
    // EDITAR COMENTÁRIO (USUÁRIO E ADMIN)
    // ==========================================

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComentarioResponse> editarComentario(
            @PathVariable Long id,
            Authentication auth,
            @RequestParam("texto") String novoTexto,
            @RequestParam(value = "isResolucao", required = false) Boolean isResolucao,
            @RequestParam(value = "removerFoto", defaultValue = "false") boolean removerFoto,
            @RequestPart(value = "foto", required = false) MultipartFile novaFoto) {

        Long usuarioId = SessaoUtil.idLogado(auth);
        return ResponseEntity.ok(comentarioService.editarComentario(
                id, usuarioId, novoTexto, isResolucao, novaFoto, removerFoto));
    }

    @PatchMapping(value = "/admin/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComentarioResponse> editarComentarioPeloAdmin(
            @PathVariable Long id,
            Authentication auth,
            @RequestParam("texto") String novoTexto,
            @RequestParam(value = "isResolucao", required = false) Boolean isResolucao,
            @RequestParam(value = "removerFoto", defaultValue = "false") boolean removerFoto,
            @RequestPart(value = "foto", required = false) MultipartFile novaFoto) {

        Long adminId = SessaoUtil.idLogado(auth);
        return ResponseEntity.ok(comentarioService.editarComentarioPeloAdmin(
                id, adminId, novoTexto, isResolucao, novaFoto, removerFoto));
    }

    // ==========================================
    // EXCLUIR COMENTÁRIO (USUÁRIO E ADMIN)
    // ==========================================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarPeloUsuario(@PathVariable Long id, Authentication auth) {
        Long usuarioId = SessaoUtil.idLogado(auth);
        comentarioService.deletarPeloUsuario(id, usuarioId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> deletarComentarioPeloAdmin(@PathVariable Long id, Authentication auth) {
        Long adminId = SessaoUtil.idLogado(auth);
        comentarioService.deletarComentarioPeloAdmin(id, adminId);
        return ResponseEntity.noContent().build();
    }
}