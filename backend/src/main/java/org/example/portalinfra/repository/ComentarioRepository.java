package org.example.portalinfra.repository;

import org.example.portalinfra.model.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComentarioRepository extends JpaRepository<Comentario, Long> {
    List<Comentario> findByReclamacaoIdAndComentarioPaiIsNullOrderByDataCriacaoAsc(Long reclamacaoId);

    List<Comentario> findByResolucaoTrueOrderByDataCriacaoDesc();
}
