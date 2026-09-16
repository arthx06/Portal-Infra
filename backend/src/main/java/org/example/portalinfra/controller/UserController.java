package org.example.portalinfra.controller;

import org.example.portalinfra.model.User;
import org.example.portalinfra.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/registration")
    public void registerUser(@RequestBody User user) {
        userService.registerUser(user);
    }

    @PostMapping("/login")
    public void loginUser(@RequestBody User user) {
        // TO DO - LOGIN
    }
}
