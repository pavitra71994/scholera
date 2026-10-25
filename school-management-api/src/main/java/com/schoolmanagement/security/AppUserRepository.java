package com.schoolmanagement.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByUsernameIgnoreCase(String username);

    List<AppUser> findAllByOrderByUsernameAsc();

    boolean existsByRole(Role role);
}
