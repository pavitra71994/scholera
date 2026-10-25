package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;

import com.schoolmanagement.security.AppUser;
import com.schoolmanagement.security.AppUserRepository;
import com.schoolmanagement.security.Role;
import com.schoolmanagement.service.AccountCredentialsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/people")
@PreAuthorize("hasRole('ADMIN')")
public class SchoolPeopleController {
    private final SchoolPersonRepository people;
    private final AppUserRepository users;
    private final SchoolSectionRepository sections;
    private final TeacherSectionAssignmentRepository assignments;
    private final SchoolSectionSubjectRepository sectionSubjects;
    private final PasswordEncoder passwordEncoder;
    private final AccountCredentialsService credentials;

    public SchoolPeopleController(
            SchoolPersonRepository people,
            AppUserRepository users,
            SchoolSectionRepository sections,
            TeacherSectionAssignmentRepository assignments,
            SchoolSectionSubjectRepository sectionSubjects,
            PasswordEncoder passwordEncoder,
            AccountCredentialsService credentials) {
        this.people = people;
        this.users = users;
        this.sections = sections;
        this.assignments = assignments;
        this.sectionSubjects = sectionSubjects;
        this.passwordEncoder = passwordEncoder;
        this.credentials = credentials;
    }

    @GetMapping("/accounts")
    @Transactional(readOnly = true)
    public List<AdminAccountResponse> getAccounts() {
        return users.findAllByOrderByUsernameAsc().stream()
                .map(account -> new AdminAccountResponse(
                        account.getId(), account.getUsername(), account.getRole()))
                .toList();
    }

    @PatchMapping("/accounts/{accountId}/credentials")
    @Transactional
    public AdminAccountResponse updateAccountCredentials(
            @PathVariable Long accountId,
            Authentication authentication,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse,
            @Valid @RequestBody AccountCredentialsController.UpdateCredentialsRequest request) {
        AppUser account = users.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found."));
        AppUser updated = credentials.update(account, request.username(), request.newPassword());
        credentials.refreshSessionIfCurrent(updated, authentication, servletRequest, servletResponse);
        return new AdminAccountResponse(updated.getId(), updated.getUsername(), updated.getRole());
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

    @PutMapping("/{personId}/teacher-sections")
    @Transactional
    public PersonResponse updateTeacherSections(
            @PathVariable Long personId,
            @Valid @RequestBody TeacherSectionsRequest request) {
        SchoolPerson teacher = people.findById(personId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found."));
        if (teacher.getAccount().getRole() != Role.TEACHER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only teacher accounts can be assigned sections.");
        }
        List<SchoolSection> assigned = validatedSections(request.sectionIds());
        assignments.deleteAllByTeacher_Id(teacher.getId());
        assignments.saveAll(assigned.stream()
                .map(section -> new TeacherSectionAssignment(teacher, section))
                .toList());
        return toResponse(teacher);
    }

    @PatchMapping("/{personId}/teacher-details")
    @Transactional
    public PersonResponse updateTeacherDetails(
            @PathVariable Long personId,
            @Valid @RequestBody TeacherDetailsRequest request) {
        SchoolPerson teacher = requireTeacher(personId);
        if (request.fullName() != null && request.fullName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher name cannot be blank.");
        }
        List<String> expertise = normalizedExpertise(request.subjectExpertise());
        boolean breaksAssignment = sectionSubjects.findAllByTeacher_IdOrderBySubjectAsc(teacher.getId()).stream()
                .anyMatch(subject -> expertise.stream().noneMatch(item -> item.equalsIgnoreCase(subject.getSubject())));
        if (breaksAssignment) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Remove or reassign subjects before changing this teacher's expertise.");
        }
        teacher.updateTeacherEmploymentDetails(
                request.salary(),
                trimmedOrNull(request.degree()),
                expertise);
        teacher.updateTeacherEditableDetails(
                request.fullName() == null ? teacher.getFullName() : request.fullName().trim(),
                trimmedOrNull(request.phone()));
        return toResponse(teacher);
    }

    @PatchMapping("/{personId}/student-details")
    @Transactional
    public PersonResponse updateStudentDetails(
            @PathVariable Long personId,
            @Valid @RequestBody StudentDetailsRequest request) {
        SchoolPerson student = people.findById(personId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found."));
        if (student.getAccount().getRole() != Role.STUDENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only student accounts have student details.");
        }
        SchoolSection targetSection = sections.findByIdForUpdate(request.sectionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
        Integer rollNumber = student.getSection() != null
                && student.getSection().getId().equals(targetSection.getId())
                && student.getRollNumber() != null
                ? student.getRollNumber()
                : people.findMaxRollNumberBySectionId(targetSection.getId()) + 1;
        student.updateStudentDetails(
                request.fullName().trim(),
                request.dateOfBirth(),
                request.motherName().trim(),
                request.fatherName().trim(),
                trimmedOrNull(request.emergencyContact()),
                targetSection,
                rollNumber);
        return toResponse(student);
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
        Integer rollNumber = null;
        List<SchoolSection> teacherSections = List.of();
        List<String> teacherExpertise = List.of();
        if (request.role() == Role.STUDENT) {
            if (request.sectionIds() != null && !request.sectionIds().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher section assignments are only for teachers.");
            }
            if (request.sectionId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Students must be assigned to a section.");
            }
            if (request.dateOfBirth() == null || request.dateOfBirth().isAfter(LocalDate.now())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid date of birth is required for students.");
            }
            if (request.motherName() == null || request.motherName().isBlank()
                    || request.fatherName() == null || request.fatherName().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mother and father names are required for students.");
            }
            section = sections.findByIdForUpdate(request.sectionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
            rollNumber = people.findMaxRollNumberBySectionId(section.getId()) + 1;
        } else {
            if (request.sectionId() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use section assignments for teachers.");
            }
            teacherSections = validatedSections(request.sectionIds());
            teacherExpertise = normalizedExpertise(request.subjectExpertise());
        }

        AppUser account = users.save(new AppUser(username, passwordEncoder.encode(request.password()), request.role()));
        SchoolPerson person = people.save(new SchoolPerson(
                account,
                request.fullName().trim(),
                section,
                request.role() == Role.STUDENT ? request.dateOfBirth() : null,
                trimmedOrNull(request.motherName()),
                trimmedOrNull(request.fatherName()),
                trimmedOrNull(request.emergencyContact()),
                rollNumber));
        if (request.role() == Role.TEACHER) {
            person.updateTeacherEmploymentDetails(
                    request.salary(),
                    trimmedOrNull(request.degree()),
                    teacherExpertise);
        }
        if (request.role() == Role.TEACHER && !teacherSections.isEmpty()) {
            assignments.saveAll(teacherSections.stream()
                    .map(assignedSection -> new TeacherSectionAssignment(person, assignedSection))
                    .toList());
        }
        return toResponse(person);
    }

    private List<SchoolSection> validatedSections(List<Long> sectionIds) {
        if (sectionIds == null || sectionIds.isEmpty()) return List.of();
        Set<Long> uniqueIds = new HashSet<>(sectionIds);
        if (uniqueIds.size() != sectionIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A section can only be assigned once.");
        }
        List<SchoolSection> found = sections.findAllById(uniqueIds);
        if (found.size() != uniqueIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Every assigned section must exist.");
        }
        return found;
    }

    private String trimmedOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private SchoolPerson requireTeacher(Long personId) {
        SchoolPerson teacher = people.findById(personId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found."));
        if (teacher.getAccount().getRole() != Role.TEACHER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only teacher accounts have employment details.");
        }
        return teacher;
    }

    private List<String> normalizedExpertise(List<String> values) {
        if (values == null) return List.of();
        java.util.Map<String, String> unique = new java.util.LinkedHashMap<>();
        for (String value : values) {
            if (value == null || value.isBlank()) continue;
            String subject = value.trim();
            unique.putIfAbsent(subject.toLowerCase(Locale.ROOT), subject);
        }
        return List.copyOf(unique.values());
    }

    private PersonResponse toResponse(SchoolPerson person) {
        SchoolSection section = person.getSection();
        SchoolClass schoolClass = section == null ? null : section.getSchoolClass();
        List<AssignedSectionResponse> assignedSections = person.getAccount().getRole() == Role.TEACHER
                ? assignments.findAllByTeacher_Account_UsernameOrderBySection_SchoolClass_NameAscSection_NameAsc(
                        person.getAccount().getUsername()).stream()
                        .map(assignment -> new AssignedSectionResponse(
                                assignment.getSection().getId(),
                                assignment.getSection().getName(),
                                assignment.getSection().getSchoolClass().getId(),
                                assignment.getSection().getSchoolClass().getName()))
                        .toList()
                : List.of();
        return new PersonResponse(
                person.getId(),
                person.getFullName(),
                person.getAccount().getUsername(),
                person.getAccount().getRole(),
                section == null ? null : section.getId(),
                section == null ? null : section.getName(),
                schoolClass == null ? null : schoolClass.getName(),
                person.getRollNumber(),
                assignedSections,
                person.getTeacherSalary(),
                person.getTeacherDegree(),
                List.copyOf(person.getSubjectExpertise()),
                person.getDateOfBirth(),
                person.getMotherName(),
                person.getFatherName(),
                person.getEmergencyContact(),
                person.getTeacherPhone());
    }

    public record CreatePersonRequest(
            @NotBlank @Size(max = 160) String fullName,
            @NotBlank @Size(max = 100) String username,
            @NotBlank String password,
            @NotNull Role role,
            Long sectionId,
            @Past LocalDate dateOfBirth,
            @Size(max = 160) String motherName,
            @Size(max = 160) String fatherName,
            @Size(max = 40) String emergencyContact,
            List<Long> sectionIds,
            @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal salary,
            @Size(max = 160) String degree,
            @Size(max = 50) List<@NotBlank @Size(max = 100) String> subjectExpertise) {
    }

    public record TeacherSectionsRequest(List<Long> sectionIds) {
    }

    public record TeacherDetailsRequest(
            @Size(max = 160) String fullName,
            @Size(max = 40) String phone,
            @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal salary,
            @Size(max = 160) String degree,
            @Size(max = 50) List<@NotBlank @Size(max = 100) String> subjectExpertise) {
    }

    public record StudentDetailsRequest(
            @NotBlank @Size(max = 160) String fullName,
            @NotNull @Past LocalDate dateOfBirth,
            @NotBlank @Size(max = 160) String motherName,
            @NotBlank @Size(max = 160) String fatherName,
            @Size(max = 40) String emergencyContact,
            @NotNull Long sectionId) {
    }

    public record PersonResponse(
            Long id,
            String fullName,
            String username,
            Role role,
            Long sectionId,
            String sectionName,
            String className,
            Integer rollNumber,
            List<AssignedSectionResponse> assignedSections,
            BigDecimal salary,
            String degree,
            List<String> subjectExpertise,
            LocalDate dateOfBirth,
            String motherName,
            String fatherName,
            String emergencyContact,
            String phone) {
    }

    public record AssignedSectionResponse(Long id, String name, Long classId, String className) {
    }

    public record AdminAccountResponse(Long id, String username, Role role) {
    }
}
