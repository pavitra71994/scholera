package com.schoolmanagement.controller;

import com.schoolmanagement.security.AppUser;
import com.schoolmanagement.security.AppUserRepository;
import com.schoolmanagement.service.AccountCredentialsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account")
public class AccountCredentialsController {
    private final AppUserRepository users;
    private final AccountCredentialsService credentials;

    public AccountCredentialsController(
            AppUserRepository users,
            AccountCredentialsService credentials) {
        this.users = users;
        this.credentials = credentials;
    }

    @PatchMapping("/credentials")
    @Transactional
    public AccountCredentialsResponse updateCredentials(
            Authentication authentication,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse,
            @Valid @RequestBody UpdateCredentialsRequest request) {
        AppUser account = users.findByUsername(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Account not found."));
        AppUser updated = credentials.update(account, request.username(), request.newPassword());
        credentials.refreshSessionIfCurrent(updated, authentication, servletRequest, servletResponse);

        return toResponse(updated);
    }

    private AccountCredentialsResponse toResponse(AppUser account) {
        return new AccountCredentialsResponse(account.getUsername(), account.getRole().name());
    }

    public record UpdateCredentialsRequest(
            @NotBlank @Size(max = 100) String username,
            String newPassword) {
    }

    public record AccountCredentialsResponse(String username, String role) {
    }
}
