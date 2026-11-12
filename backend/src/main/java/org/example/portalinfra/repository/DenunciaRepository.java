package org.example.portalinfra.repository;

import org.example.portalinfra.model.Denuncia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    boolean existsByUsuarioIdAndReclamacaoId(Long usuarioId, Long reclamacaoId);

    boolean existsByUsuarioIdAndComentarioId(Long usuarioId, Long comentarioId);

    List<Denuncia> findByReclamacaoIsNotNullOrderByDataCriacaoDesc();

    List<Denuncia> findByComentarioIsNotNullOrderByDataCriacaoDesc();
}