package org.example.portalinfra.repository;

import org.example.portalinfra.model.Reclamacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;


public interface ReclamacaoRepository
        extends JpaRepository<Reclamacao, Long>, JpaSpecificationExecutor<Reclamacao>  {
    long countByStatusIgnoreCase(String status);
    
    Page<Reclamacao> findByUsuarioIdOrderByDataCriacaoDesc(Long usuarioId,  Pageable pageable);

    Page<Reclamacao> findAllByOrderByDataCriacaoDesc(Pageable pageable);
  

    // Busca reclamações que ainda não possuem alguma das coordenadas
    List<Reclamacao> findByLatitudeIsNullOrLongitudeIsNull();
}
