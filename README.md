# Portal Infra

> Uma aplicação web para registro e compartilhamento de problemas relacionados à infraestrutura urbana.

## Sobre

O Portal Infra é um projeto acadêmico desenvolvido com o objetivo de facilitar o registro e a visualização de problemas de infraestrutura urbana.

A plataforma permite que usuários registrem ocorrências com informações como descrição, imagens, gravidade e localização, disponibilizando esses dados para consulta e interação.

O projeto está alinhado ao **ODS 11 — Cidades e Comunidades Sustentáveis**, buscando contribuir para uma melhor visualização das condições dos espaços públicos.

## Versão Atual

**Sprint 2 — Autenticação**

O sistema possui o fluxo de usuários implementado, incluindo cadastro, login e recuperação de senha.

### Funcionalidades Atuais

* [x] Cadastro de usuários
* [x] Login
* [x] Logout
* [x] Criptografia de senhas
* [x] Verificação de e-mail
* [x] Recuperação de senha
* [x] Redefinição de senha através de token
* [x] Persistência de usuários no PostgreSQL
* [x] Configuração de segurança com Spring Security
* [ ] Publicação de reclamações
* [ ] Upload de imagens
* [ ] Feed de reclamações
* [ ] Comentários e respostas
* [ ] Denúncias
* [ ] Mapa interativo
* [ ] Filtro por bairro

## Histórico de Sprints

### Sprint 1 — Estrutura Inicial

A estrutura inicial do projeto foi criada, estabelecendo o frontend, backend e a comunicação entre as partes da aplicação.

### Sprint 2 — Autenticação

O sistema de usuários foi implementado, incluindo cadastro, login, verificação de e-mail e recuperação de senha.

### Sprint 3 — Reclamações

Implementação do sistema de criação e visualização de reclamações.

### Sprint 4 — Mapa e Localização

Implementação do mapa interativo, marcadores e filtragem das ocorrências por localização.

### Sprint 5 — Interações

Implementação de comentários, respostas e sistema de denúncias.

## Roadmap

### Reclamações

* [ ] Criar reclamações
* [ ] Adicionar imagens
* [ ] Definir nível de gravidade
* [ ] Registrar localização
* [ ] Visualizar reclamações no feed

### Mapa

* [ ] Exibir reclamações no mapa
* [ ] Adicionar marcadores
* [ ] Filtrar por bairro
* [ ] Integrar Google Maps JavaScript API

### Interações

* [ ] Adicionar comentários
* [ ] Responder comentários
* [ ] Denunciar reclamações
* [ ] Denunciar comentários

## Tecnologias

* Java 21
* Spring Boot
* Spring Security
* Maven
* PostgreSQL
* HTML5
* CSS3
* JavaScript
* Google Maps JavaScript API
* Docker
* Render
* Git/GitHub

## Estrutura do Projeto

```text
arthx06-portal-infra/
├── index.html
├── login.html
├── reclamacoes.html
├── reclamacoes.css
├── redefinir-senha.html
├── style.css
│
└── backend/
    ├── DockerFile
    ├── pom.xml
    └── src/
        ├── main/
        │   ├── java/
        │   │   └── org/example/portalinfra/
        │   │       ├── PortalInfraApplication.java
        │   │       ├── config/
        │   │       │   └── SecurityConfig.java
        │   │       ├── controller/
        │   │       │   └── UsuarioController.java
        │   │       ├── model/
        │   │       │   ├── EmailVerification.java
        │   │       │   ├── PasswordResetToken.java
        │   │       │   └── Usuario.java
        │   │       ├── repository/
        │   │       │   ├── EmailVerificationRepository.java
        │   │       │   ├── PasswordResetTokenRepository.java
        │   │       │   └── UsuarioRepository.java
        │   │       └── service/
        │   │           ├── EmailService.java
        │   │           └── UsuarioService.java
        │   └── resources/
        │       └── application.properties
        │
        └── test/
            └── java/
                └── org/example/portalinfra/
                    └── PortalInfraApplicationTests.java
```

**`UsuarioController`** é responsável pelos endpoints relacionados aos usuários, incluindo as operações de cadastro, autenticação e recuperação de senha.

**`UsuarioService`** concentra as regras de negócio relacionadas aos usuários e ao processo de autenticação.

**`Usuario`** representa os usuários cadastrados no sistema.

**`EmailVerification`** representa os dados utilizados para o processo de verificação de e-mail.

**`PasswordResetToken`** representa os tokens utilizados na recuperação e redefinição de senha.

**`UsuarioRepository`** fornece a camada de acesso aos dados dos usuários.

**`EmailVerificationRepository`** gerencia a persistência dos dados de verificação de e-mail.

**`PasswordResetTokenRepository`** gerencia a persistência dos tokens de recuperação de senha.

**`EmailService`** é responsável pelo envio dos e-mails utilizados pelos fluxos de verificação e recuperação de senha.

**`SecurityConfig`** define as configurações de segurança e controle de acesso da aplicação utilizando Spring Security.

## Objetivo

O Portal Infra foi desenvolvido como projeto acadêmico da **Fatec Desenvolvimento de Software Multiplataforma**, aplicando conceitos de desenvolvimento web, APIs REST, autenticação, persistência de dados e integração com serviços externos.

O projeto busca unir esses conceitos técnicos a uma aplicação voltada à participação cidadã e à identificação de problemas de infraestrutura urbana.
