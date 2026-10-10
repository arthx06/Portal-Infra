package org.example.portalinfra.repository;

import org.example.portalinfra.model.Reclamacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReclamacaoRepository
        extends JpaRepository<Reclamacao, Long> {

    List<Reclamacao> findByUsuarioIdOrderByDataCriacaoDesc(Long usuarioId);

    List<Reclamacao> findAllByOrderByDataCriacaoDesc();
}
