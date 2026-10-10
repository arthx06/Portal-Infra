package org.example.portalinfra.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    @Column(nullable = false)
    private String nome;

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail inválido")
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    @Column(nullable = false)
    private String senha;

    @Pattern(regexp = "\\d{10,11}", message = "Telefone inválido")
    @Column(length = 11)
    private String telefone;

    @Pattern(regexp = "\\d{5}-?\\d{3}", message = "CEP inválido")
    @Column(length = 9)
    private String cep;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;


    @Size(max = 255, message = "Rua muito longa")
    private String logradouro;

    @Size(max = 20, message = "Número muito longo")
    @Column(length = 20)
    private String numero;

    @Size(max = 100, message = "Complemento muito longo")
    @Column(length = 100)
    private String complemento;

    @Size(max = 100, message = "Bairro muito longo")
    @Column(length = 100)
    private String bairro;

    @Size(max = 100, message = "Cidade muito longa")
    @Column(length = 100)
    private String cidade;

    @Size(min = 2, max = 2, message = "UF deve ter 2 letras")
    @Column(length = 2)
    private String uf;

    @Column(nullable = false)
    private String tipo;

    @Column(name = "esta_ativo", nullable = false, columnDefinition = "boolean default true")
    private boolean estaAtivo = true;

    public Usuario() {}

    public Usuario(Long id, String nome, String email, String telefone, String senha, String tipo) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.telefone = telefone;
        this.senha = senha;
        this.tipo = tipo;
    }

    public Long getId() { return id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }

    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public boolean isEstaAtivo() { return estaAtivo; }
    public void setEstaAtivo(boolean estaAtivo) { this.estaAtivo = estaAtivo; }
    
    public LocalDate getDataNascimento() {
    return dataNascimento;
    }

    public void setDataNascimento(LocalDate dataNascimento) {
        this.dataNascimento = dataNascimento;
    }
}