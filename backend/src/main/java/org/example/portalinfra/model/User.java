package org.example.portalinfra.model;

public class User {
    private Long id;
    private String name;
    private String email;
    private String password;
    private Boolean accountStatus;

    public User(Long id, String name, String email,  String password, Boolean accountStatus) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.accountStatus = accountStatus;
    }

}
