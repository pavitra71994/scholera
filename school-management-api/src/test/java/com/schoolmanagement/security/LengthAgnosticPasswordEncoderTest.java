package com.schoolmanagement.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LengthAgnosticPasswordEncoderTest {
    private final LengthAgnosticPasswordEncoder encoder = new LengthAgnosticPasswordEncoder();

    @Test
    void encodesShortAndLongPasswords() {
        String shortPassword = encoder.encode("x");
        String longPassword = "long-password-".repeat(100);

        assertTrue(encoder.matches("x", shortPassword));
        assertTrue(encoder.matches(longPassword, encoder.encode(longPassword)));
        assertFalse(encoder.matches("different", shortPassword));
    }

    @Test
    void continuesToMatchExistingBcryptHashes() {
        String password = "existing-account-password";
        String existingHash = new BCryptPasswordEncoder().encode(password);

        assertTrue(encoder.matches(password, existingHash));
        assertFalse(encoder.matches("wrong-password", existingHash));
    }
}
