package com.schoolmanagement.school;

import com.schoolmanagement.security.AppUser;
import com.schoolmanagement.security.AppUserRepository;
import com.schoolmanagement.security.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/people")
@PreAuthorize("hasRole('ADMIN')")
public class SchoolPeopleController {
    private final SchoolPersonRepository people;
    private final AppUserRepository users;
    private final SchoolSectionRepository sections;
    private final PasswordEncoder passwordEncoder;

    public SchoolPeopleController(
            SchoolPersonRepository people,
            AppUserRepository users,
            SchoolSectionRepository sections,
            PasswordEncoder passwordEncoder) {
        this.people = people;
        this.users = users;
        this.sections = sections;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PersonResponse> getPeople(@RequestParam Role role) {
        if (role == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose student or teacher.");
        }
        return people.findAllByAccount_RoleOrderByFullName(role).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PersonResponse createPerson(@Valid @RequestBody CreatePersonRequest request) {
        if (request.role() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only student and teacher accounts can be created here.");
        }
        String username = request.username().trim();
        if (users.findByUsername(username).isPresent() || people.existsByAccount_UsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already in use.");
        }
        SchoolSection section = null;
        if (request.role() == Role.STUDENT) {
            if (request.sectionId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Students must be assigned to a section.");
            }
            section = sections.findById(request.sectionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
        } else if (request.sectionId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teachers cannot be assigned as students to a section.");
        }

        AppUser account = users.save(new AppUser(username, passwordEncoder.encode(request.password()), request.role()));
        return toResponse(people.save(new SchoolPerson(account, request.fullName().trim(), section)));
    }

    private PersonResponse toResponse(SchoolPerson person) {
        SchoolSection section = person.getSection();
        SchoolClass schoolClass = section == null ? null : section.getSchoolClass();
        return new PersonResponse(
                person.getId(),
                person.getFullName(),
                person.getAccount().getUsername(),
                person.getAccount().getRole(),
                section == null ? null : section.getId(),
                section == null ? null : section.getName(),
                schoolClass == null ? null : schoolClass.getName());
    }

    public record CreatePersonRequest(
            @NotBlank @Size(max = 160) String fullName,
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(min = 12, max = 100) String password,
            @NotNull Role role,
            Long sectionId) {
    }

    public record PersonResponse(
            Long id,
            String fullName,
            String username,
            Role role,
            Long sectionId,
            String sectionName,
            String className) {
    }
}
