
package org.example.portalinfra.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reclamacoes")
public class Reclamacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String titulo;

    @Column(nullable = false, length = 100)
    private String categoria;

    @Column(nullable = false, length = 1500)
    private String descricao;

    @Column(nullable = false, length = 255)
    private String endereco;

    @Column(nullable = false, length = 100)
    private String bairro;

    @Column(nullable = false, length = 20)
    private String gravidade;

    @Column(name = "foto_url", nullable = false, length = 1000)
    private String fotoUrl;

    @Column(nullable = false, length = 20)
    private String status = "Pendente";

    @Column(name = "data_criacao",
            nullable = false,
            updatable = false)
    private LocalDateTime dataCriacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    public Reclamacao() {
    }

    @PrePersist
    protected void antesDeSalvar() {
        if (dataCriacao == null) {
            dataCriacao = LocalDateTime.now();
        }

        if (status == null) {
            status = "Pendente";
        }
    }

    public Long getId() {
        return id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getGravidade() {
        return gravidade;
    }

    public void setGravidade(String gravidade) {
        this.gravidade = gravidade;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getDataCriacao() {
        return dataCriacao;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }
}
