package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;
import com.schoolmanagement.security.Role;
import com.schoolmanagement.service.SchoolExamProvisioningService;

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
import org.springframework.web.bind.annotation.PutMapping;
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
    private final SchoolPersonRepository people;
    private final SchoolSectionSubjectRepository sectionSubjects;
    private final TeacherSectionAssignmentRepository assignments;
    private final SchoolExamProvisioningService examProvisioning;
    private final SchoolExamRepository exams;
    private final SchoolExamSubjectRepository examSubjects;
    private final ExamMarkRepository marks;

    public SchoolClassController(
            SchoolClassRepository classes,
            SchoolSectionRepository sections,
            SchoolPersonRepository people,
            SchoolSectionSubjectRepository sectionSubjects,
            TeacherSectionAssignmentRepository assignments,
            SchoolExamProvisioningService examProvisioning,
            SchoolExamRepository exams,
            SchoolExamSubjectRepository examSubjects,
            ExamMarkRepository marks) {
        this.classes = classes;
        this.sections = sections;
        this.people = people;
        this.sectionSubjects = sectionSubjects;
        this.assignments = assignments;
        this.examProvisioning = examProvisioning;
        this.exams = exams;
        this.examSubjects = examSubjects;
        this.marks = marks;
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

    @GetMapping("/{classId}/directory")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ClassDirectoryResponse getClassDirectory(@PathVariable Long classId) {
        SchoolClass schoolClass = classes.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found."));
        List<ClassSectionDirectoryResponse> sectionDetails = schoolClass.getSections().stream()
                .map(section -> new ClassSectionDirectoryResponse(
                        section.getId(),
                        section.getName(),
                        section.getClassTeacher() == null ? null : new ClassTeacherResponse(
                                section.getClassTeacher().getId(),
                                section.getClassTeacher().getFullName()),
                        people.findAllBySection_IdAndAccount_RoleOrderByFullName(section.getId(), Role.STUDENT).stream()
                                .map(student -> new ClassStudentResponse(
                                        student.getId(), student.getFullName(), student.getRollNumber()))
                                .toList(),
                        assignments.findAllBySection_IdOrderByTeacher_FullNameAsc(section.getId()).stream()
                                .map(assignment -> new ClassTeacherResponse(
                                        assignment.getTeacher().getId(),
                                        assignment.getTeacher().getFullName()))
                                .toList(),
                        sectionSubjects.findAllBySection_IdOrderBySubjectAsc(section.getId()).stream()
                                .map(subject -> new ClassSubjectResponse(
                                        subject.getId(),
                                        subject.getSubject(),
                                        subject.getTeacher() == null ? null : new ClassTeacherResponse(
                                                subject.getTeacher().getId(),
                                                subject.getTeacher().getFullName())))
                                .toList()))
                .toList();
        return new ClassDirectoryResponse(
                schoolClass.getId(),
                schoolClass.getName(),
                sectionDetails);
    }

    @PutMapping("/{classId}/sections/{sectionId}/class-teacher")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void assignClassTeacher(
            @PathVariable Long classId,
            @PathVariable Long sectionId,
            @RequestBody TeacherAssignmentRequest request) {
        if (!sections.existsByIdAndSchoolClass_Id(sectionId, classId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found in this class.");
        }
        SchoolSection section = sections.findById(sectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
        section.assignClassTeacher(request.teacherId() == null ? null : findTeacher(request.teacherId()));
    }

    @PutMapping("/{classId}/sections/{sectionId}/subjects/{subjectId}/teacher")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void assignSubjectTeacher(
            @PathVariable Long classId,
            @PathVariable Long sectionId,
            @PathVariable Long subjectId,
            @RequestBody TeacherAssignmentRequest request) {
        if (!sections.existsByIdAndSchoolClass_Id(sectionId, classId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found in this class.");
        }
        SchoolSectionSubject subject = sectionSubjects.findByIdAndSection_Id(subjectId, sectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section subject not found."));
        SchoolPerson teacher = request.teacherId() == null ? null : findTeacher(request.teacherId());
        if (teacher != null && teacher.getSubjectExpertise().stream()
                .noneMatch(expertise -> expertise.equalsIgnoreCase(subject.getSubject()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Choose a teacher whose subject expertise matches this subject.");
        }
        subject.assignTeacher(teacher);
    }

    private SchoolPerson findTeacher(Long teacherId) {
        SchoolPerson teacher = people.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher not found."));
        if (teacher.getAccount().getRole() != Role.TEACHER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only teacher accounts can be assigned.");
        }
        return teacher;
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
        examProvisioning.provisionAllDefinitions(saved);
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
        marks.deleteAllByExamSubject_Exam_Section_Id(sectionId);
        examSubjects.deleteAllByExam_Section_Id(sectionId);
        exams.deleteAllBySection_Id(sectionId);
        sections.deleteByIdAndSchoolClass_Id(sectionId, classId);
    }

    public record CreateClassRequest(@NotBlank @Size(max = 100) String name) {
    }

    public record CreateSectionRequest(@NotBlank @Size(max = 40) String name) {
    }

    public record TeacherAssignmentRequest(Long teacherId) {
    }

    public record ClassResponse(Long id, String name, List<SectionResponse> sections) {
    }

    public record SectionResponse(Long id, String name) {
    }

    public record ClassDirectoryResponse(
            Long id,
            String name,
            List<ClassSectionDirectoryResponse> sections) {
    }

    public record ClassSectionDirectoryResponse(
            Long id,
            String name,
            ClassTeacherResponse classTeacher,
            List<ClassStudentResponse> students,
            List<ClassTeacherResponse> teachers,
            List<ClassSubjectResponse> subjects) {
    }

    public record ClassStudentResponse(Long id, String fullName, Integer rollNumber) {
    }

    public record ClassTeacherResponse(Long id, String fullName) {
    }

    public record ClassSubjectResponse(Long id, String subject, ClassTeacherResponse teacher) {
    }
}
