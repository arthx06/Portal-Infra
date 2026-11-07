
package org.example.portalinfra.model;

import jakarta.persistence.*;

@Entity
@Table(name = "reclamacao_fotos")
public class ReclamacaoFoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reclamacao_id", nullable = false)
    private Reclamacao reclamacao;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(nullable = false)
    private Integer ordem = 0;

    public ReclamacaoFoto() {
    }

    public Long getId() {
        return id;
    }

    public Reclamacao getReclamacao() {
        return reclamacao;
    }

    public void setReclamacao(Reclamacao reclamacao) {
        this.reclamacao = reclamacao;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Integer getOrdem() {
        return ordem;
    }

    public void setOrdem(Integer ordem) {
        this.ordem = ordem;
    }
}

