package com.schoolmanagement.service;

import com.schoolmanagement.security.AppUser;
import com.schoolmanagement.security.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountCredentialsService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextRepository securityContextRepository;

    public AccountCredentialsService(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            SecurityContextRepository securityContextRepository) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.securityContextRepository = securityContextRepository;
    }

    @Transactional
    public AppUser update(AppUser account, String requestedUsername, String newPassword) {
        String username = requestedUsername.trim();
        users.findByUsernameIgnoreCase(username)
                .filter(existing -> !existing.getId().equals(account.getId()))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already in use.");
                });
        if (newPassword != null && newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password cannot be blank.");
        }

        account.updateCredentials(
                username,
                newPassword == null ? null : passwordEncoder.encode(newPassword));
        return users.save(account);
    }

    public void refreshSessionIfCurrent(
            AppUser updated,
            Authentication currentAuthentication,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (!(currentAuthentication.getPrincipal() instanceof AppUser current)
                || !current.getId().equals(updated.getId())) {
            return;
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                updated, null, updated.getAuthorities()));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
