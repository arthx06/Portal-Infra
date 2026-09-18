package org.example.portalinfra.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification")
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, length = 6)
    private String codigo;

    @Column(nullable = false)
    private LocalDateTime expiraEm;

    @Column(nullable = false)
    private LocalDateTime criadoEm;

    public EmailVerification() {
    }

    public EmailVerification(
            String email,
            String codigo,
            LocalDateTime expiraEm
    ) {
        this.email = email;
        this.codigo = codigo;
        this.expiraEm = expiraEm;
        this.criadoEm = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getCodigo() {
        return codigo;
    }

    public LocalDateTime getExpiraEm() {
        return expiraEm;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public boolean isExpirado() {
        return LocalDateTime.now().isAfter(expiraEm);
    }
}