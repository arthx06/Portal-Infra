package org.example.portalinfra.repository;

import org.example.portalinfra.model.User;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    public void registerUser(User user) {
        System.out.println("User saved.");
    }

    // TO DO - SAVING TO DB

    // TO DO - CHECK EMAIL AND PASSWORD TO LOGIN
}
