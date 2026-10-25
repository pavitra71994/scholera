package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DateTimeException;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/v1/school")
public class SchoolProfileController {
    private static final short SINGLE_SCHOOL_ID = 1;
    private final SchoolProfileRepository profiles;

    public SchoolProfileController(SchoolProfileRepository profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    public SchoolProfileResponse getProfile() {
        return profiles.findById(SINGLE_SCHOOL_ID)
                .map(profile -> new SchoolProfileResponse(profile.getName(), profile.getTimezone()))
                .orElseThrow(() -> new IllegalStateException("School profile has not been initialized."));
    }

    @PatchMapping
    @PreAuthorize("hasRole('ADMIN')")
    public SchoolProfileResponse updateProfile(@Valid @RequestBody UpdateSchoolRequest request) {
        SchoolProfile profile = profiles.findById(SINGLE_SCHOOL_ID)
                .orElseThrow(() -> new IllegalStateException("School profile has not been initialized."));
        profile.update(request.name().trim(), request.timezone().trim());
        SchoolProfile saved = profiles.save(profile);
        return new SchoolProfileResponse(saved.getName(), saved.getTimezone());
    }

    public record UpdateSchoolRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Size(max = 80) String timezone) {
        @AssertTrue(message = "Timezone must be a valid IANA timezone.")
        public boolean isTimezoneValid() {
            try {
                if (timezone == null) {
                    return false;
                }
                ZoneId.of(timezone);
                return true;
            } catch (DateTimeException exception) {
                return false;
            }
        }
    }

    public record SchoolProfileResponse(String name, String timezone) {
    }
}
