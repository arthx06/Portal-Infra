package org.example.portalinfra.repository;

import org.example.portalinfra.model.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository
        extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByEmailAndCodigo(
            String email,
            String codigo
    );

    void deleteByEmail(String email);
}
