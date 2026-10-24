package com.schoolmanagement.school;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/classes")
public class SchoolClassController {
    private final SchoolClassRepository classes;
    private final SchoolSectionRepository sections;

    public SchoolClassController(SchoolClassRepository classes, SchoolSectionRepository sections) {
        this.classes = classes;
        this.sections = sections;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ClassResponse> getClasses() {
        return classes.findAllWithSections().stream()
                .map(schoolClass -> new ClassResponse(
                        schoolClass.getId(),
                        schoolClass.getName(),
                        schoolClass.getSections().stream()
                                .map(section -> new SectionResponse(section.getId(), section.getName()))
                                .toList()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ClassResponse createClass(@Valid @RequestBody CreateClassRequest request) {
        String name = request.name().trim();
        if (classes.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A class with this name already exists.");
        }
        SchoolClass saved = classes.save(new SchoolClass(name));
        return new ClassResponse(saved.getId(), saved.getName(), List.of());
    }

    @PostMapping("/{classId}/sections")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public SectionResponse createSection(
            @PathVariable Long classId,
            @Valid @RequestBody CreateSectionRequest request) {
        SchoolClass schoolClass = classes.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found."));
        String name = request.name().trim();
        if (sections.existsBySchoolClass_IdAndNameIgnoreCase(classId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A section with this name already exists in this class.");
        }
        SchoolSection saved = sections.save(new SchoolSection(schoolClass, name));
        return new SectionResponse(saved.getId(), saved.getName());
    }

    @DeleteMapping("/{classId}/sections/{sectionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void deleteSection(@PathVariable Long classId, @PathVariable Long sectionId) {
        if (!sections.existsByIdAndSchoolClass_Id(sectionId, classId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found in this class.");
        }
        sections.deleteByIdAndSchoolClass_Id(sectionId, classId);
    }

    public record CreateClassRequest(@NotBlank @Size(max = 100) String name) {
    }

    public record CreateSectionRequest(@NotBlank @Size(max = 40) String name) {
    }

    public record ClassResponse(Long id, String name, List<SectionResponse> sections) {
    }

    public record SectionResponse(Long id, String name) {
    }
}
