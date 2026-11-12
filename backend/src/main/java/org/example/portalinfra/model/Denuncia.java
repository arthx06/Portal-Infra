package org.example.portalinfra.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "denuncias")
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario; // Usuário que fez a denúncia

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reclamacao_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Reclamacao reclamacao; // Null se a denúncia for de um comentário

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comentario_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Comentario comentario; // Null se a denúncia for de uma reclamação

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolvido_por_id")
    private Usuario resolvidoPor; // Administrador que concluiu a moderação

    @Column(nullable = false)
    private String tipo; // Ex: DISCURSO_DE_ODIO

    @Column(length = 1000)
    private String descricao; // Opcional

    @Column(nullable = false)
    private String status = "PENDENTE"; // PENDENTE ou CONCLUIDA

    @Column(name = "data_criacao", updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_resolucao")
    private LocalDateTime dataResolucao;

    @Column(name = "acao_tomada")
    private String acaoTomada;

    @PrePersist
    protected void onCreate() {
        this.dataCriacao = LocalDateTime.now();
        if (this.status == null) {
            this.status = "PENDENTE";
        }
    }

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Reclamacao getReclamacao() {
        return reclamacao;
    }

    public void setReclamacao(Reclamacao reclamacao) {
        this.reclamacao = reclamacao;
    }

    public Comentario getComentario() {
        return comentario;
    }

    public void setComentario(Comentario comentario) {
        this.comentario = comentario;
    }

    public Usuario getResolvidoPor() {
        return resolvidoPor;
    }

    public void setResolvidoPor(Usuario resolvidoPor) {
        this.resolvidoPor = resolvidoPor;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
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

    public LocalDateTime getDataResolucao() {
        return dataResolucao;
    }

    public void setDataResolucao(LocalDateTime dataResolucao) {
        this.dataResolucao = dataResolucao;
    }

    public String getAcaoTomada() {
        return acaoTomada;
    }

    public void setAcaoTomada(String acaoTomada) {
        this.acaoTomada = acaoTomada;
    }
}