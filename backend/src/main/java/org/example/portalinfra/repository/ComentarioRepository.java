package org.example.portalinfra.repository;

import org.example.portalinfra.model.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ComentarioRepository extends JpaRepository<Comentario, Long> {
    List<Comentario> findByReclamacaoIdAndComentarioPaiIsNullOrderByDataCriacaoAsc(Long reclamacaoId);

    // O NOME DO ATRIBUTO É isResolucao, MAS O METODO PROCURA POR resolucao
    // ESSA LINHA DE ALGUMA FORMA MANTEM OO FRONT FUNCIONANDO SEM FICAR VOLTANDO A PAGINA DE LOGIN
    @Query("select c from Comentario c where c.isResolucao = true order by c.dataCriacao desc")
    List<Comentario> findByResolucaoTrueOrderByDataCriacaoDesc();
}
