package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;
import com.schoolmanagement.service.SchoolExamProvisioningService;

import com.schoolmanagement.security.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;

@RestController
@RequestMapping("/api/v1/exams")
@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
public class SchoolExamController {
    private final SchoolExamRepository exams;
    private final SchoolExamDefinitionRepository definitions;
    private final SchoolExamSubjectRepository subjects;
    private final ExamMarkRepository marks;
    private final SchoolSectionRepository sections;
    private final SchoolPersonRepository people;
    private final TeacherSectionAssignmentRepository assignments;
    private final SchoolSectionSubjectRepository sectionSubjects;
    private final SchoolExamProvisioningService examProvisioning;

    public SchoolExamController(
            SchoolExamRepository exams,
            SchoolExamDefinitionRepository definitions,
            SchoolExamSubjectRepository subjects,
            ExamMarkRepository marks,
            SchoolSectionRepository sections,
            SchoolPersonRepository people,
            TeacherSectionAssignmentRepository assignments,
            SchoolSectionSubjectRepository sectionSubjects,
            SchoolExamProvisioningService examProvisioning) {
        this.exams = exams;
        this.definitions = definitions;
        this.subjects = subjects;
        this.marks = marks;
        this.sections = sections;
        this.people = people;
        this.assignments = assignments;
        this.sectionSubjects = sectionSubjects;
        this.examProvisioning = examProvisioning;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ExamResponse> getExams(Authentication authentication, @RequestParam Long sectionId) {
        requireSectionAccess(sectionId, authentication);
        return exams.findAllBySection_IdOrderByAcademicYearDescNameAsc(sectionId).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/definitions")
    @Transactional(readOnly = true)
    public List<ExamDefinitionResponse> getDefinitions() {
        return definitions.findAllByOrderByAcademicYearDescNameAsc().stream()
                .map(definition -> new ExamDefinitionResponse(
                        definition.getId(), definition.getName(), definition.getAcademicYear()))
                .toList();
    }

    @PostMapping("/definitions")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ExamDefinitionResponse createDefinition(
            @Valid @RequestBody CreateExamDefinitionRequest request) {
        String name = request.name().trim();
        if (definitions.existsByNameIgnoreCaseAndAcademicYear(name, request.academicYear())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "An exam with this name already exists for the school and year.");
        }
        SchoolExamDefinition definition = definitions.save(
                new SchoolExamDefinition(name, request.academicYear()));
        examProvisioning.provisionDefinitionForAllSections(definition);
        return new ExamDefinitionResponse(definition.getId(), definition.getName(), definition.getAcademicYear());
    }

    @DeleteMapping("/definitions/{definitionId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteDefinition(@PathVariable Long definitionId) {
        SchoolExamDefinition definition = definitions.findById(definitionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School exam not found."));
        for (SchoolExam exam : exams.findAllByDefinition_Id(definitionId)) {
            marks.deleteAllByExamSubject_Exam_Id(exam.getId());
            subjects.deleteAllByExam_Id(exam.getId());
            exams.delete(exam);
        }
        definitions.delete(definition);
    }

    @DeleteMapping("/{examId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteExamFromSection(@PathVariable Long examId) {
        SchoolExam exam = exams.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found."));
        marks.deleteAllByExamSubject_Exam_Id(examId);
        subjects.deleteAllByExam_Id(examId);
        exams.delete(exam);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ExamResponse createExam(Authentication authentication, @Valid @RequestBody CreateExamRequest request) {
        requireSectionAccess(request.sectionId(), authentication);
        SchoolSection section = sections.findById(request.sectionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
        SchoolExamDefinition definition = definitions.findById(request.examDefinitionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School exam not found."));
        return toResponse(examProvisioning.provisionExam(section, definition));
    }

    @GetMapping("/sections/{sectionId}/subjects")
    @Transactional(readOnly = true)
    public List<SectionSubjectResponse> getSectionSubjects(
            Authentication authentication, @PathVariable Long sectionId) {
        requireSectionAccess(sectionId, authentication);
        return sectionSubjects.findAllBySection_IdOrderBySubjectAsc(sectionId).stream()
                .map(this::toSectionSubjectResponse)
                .toList();
    }

    @PostMapping("/sections/{sectionId}/subjects")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public SectionSubjectResponse createSectionSubject(
            Authentication authentication,
            @PathVariable Long sectionId,
            @Valid @RequestBody CreateExamSubjectRequest request) {
        requireSectionAccess(sectionId, authentication);
        String subjectName = request.subject().trim();
        if (sectionSubjects.existsBySection_IdAndSubjectIgnoreCase(sectionId, subjectName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This subject already exists for the section.");
        }
        SchoolSection section = sections.findById(sectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
        SchoolSectionSubject sectionSubject = sectionSubjects.save(new SchoolSectionSubject(
                section, subjectName, request.maximumMarks()));
        examProvisioning.addSectionSubjectToExistingExams(
                sectionSubject, exams.findAllBySection_Id(sectionId));
        return toSectionSubjectResponse(sectionSubject);
    }

    @PostMapping("/{examId}/subjects")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ExamSubjectResponse createSubject(
            Authentication authentication,
            @PathVariable Long examId,
            @Valid @RequestBody CreateExamSubjectRequest request) {
        SchoolExam exam = exams.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found."));
        requireSectionAccess(exam.getSection().getId(), authentication);
        String subjectName = request.subject().trim();
        SchoolSectionSubject sectionSubject = sectionSubjects
                .findBySection_IdAndSubjectIgnoreCase(exam.getSection().getId(), subjectName)
                .orElseGet(() -> sectionSubjects.save(new SchoolSectionSubject(
                        exam.getSection(), subjectName, request.maximumMarks())));
        SchoolExamSubject examSubject = subjects.findByExam_IdAndSectionSubject_Id(examId, sectionSubject.getId())
                .orElseGet(() -> subjects.save(new SchoolExamSubject(exam, sectionSubject, request.maximumMarks())));
        return toSubjectResponse(examSubject);
    }

    @DeleteMapping("/{examId}/subjects/{subjectId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteSubject(
            @PathVariable Long examId,
            @PathVariable Long subjectId) {
        SchoolExamSubject subject = subjects.findByIdAndExam_Id(subjectId, examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam subject not found."));
        marks.deleteAllByExamSubject_Id(subjectId);
        subjects.delete(subject);
    }

    @PostMapping("/subjects/{subjectId}/marks")
    @Transactional
    public List<MarkResponse> saveMarks(
            Authentication authentication,
            @PathVariable Long subjectId,
            @Valid @RequestBody SaveMarksRequest request) {
        SchoolExamSubject examSubject = subjects.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam subject not found."));
        SchoolExam exam = examSubject.getExam();
        requireSectionAccess(exam.getSection().getId(), authentication);
        List<SchoolPerson> students = people.findAllBySection_IdAndAccount_RoleOrderByFullName(
                exam.getSection().getId(), Role.STUDENT);
        var studentsById = students.stream().collect(java.util.stream.Collectors.toMap(
                SchoolPerson::getId, student -> student));
        var submittedIds = new HashSet<Long>();
        if (request.marks().size() != students.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submit marks for every student in the section.");
        }
        for (MarkEntry entry : request.marks()) {
            if (!submittedIds.add(entry.studentId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A student can only appear once in the marks register.");
            }
            SchoolPerson student = studentsById.get(entry.studentId());
            if (student == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Every student must belong to the exam section.");
            }
            if (entry.obtainedMarks().compareTo(examSubject.getMaximumMarks()) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A score cannot exceed the maximum marks.");
            }
            ExamMark mark = marks.findByExamSubject_IdAndStudent_Id(subjectId, entry.studentId())
                    .orElseGet(() -> new ExamMark(examSubject, student, entry.obtainedMarks()));
            mark.updateMarks(entry.obtainedMarks());
            marks.save(mark);
        }
        return marks.findAllByExamSubject_Id(subjectId).stream().map(this::toMarkResponse).toList();
    }

    private ExamResponse toResponse(SchoolExam exam) {
        return new ExamResponse(
                exam.getId(),
                exam.getSection().getId(),
                exam.getDefinition().getId(),
                exam.getName(),
                exam.getAcademicYear(),
                subjects.findAllByExam_IdOrderBySectionSubject_SubjectAsc(exam.getId()).stream()
                        .map(this::toSubjectResponse)
                        .toList());
    }

    private ExamSubjectResponse toSubjectResponse(SchoolExamSubject subject) {
        return new ExamSubjectResponse(
                subject.getId(),
                subject.getSubject(),
                subject.getMaximumMarks(),
                marks.findAllByExamSubject_Id(subject.getId()).stream().map(this::toMarkResponse).toList());
    }

    private SectionSubjectResponse toSectionSubjectResponse(SchoolSectionSubject subject) {
        return new SectionSubjectResponse(
                subject.getId(), subject.getSection().getId(), subject.getSubject(), subject.getDefaultMaximumMarks());
    }

    private MarkResponse toMarkResponse(ExamMark mark) {
        return new MarkResponse(mark.getStudent().getId(), mark.getStudent().getFullName(), mark.getObtainedMarks());
    }

    private void requireSectionAccess(Long sectionId, Authentication authentication) {
        if (!sections.existsById(sectionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found.");
        }
        if (authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_TEACHER"))
                && !assignments.existsByTeacher_Account_UsernameAndSection_Id(authentication.getName(), sectionId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This section is not assigned to you.");
        }
    }

    public record CreateExamRequest(
            @NotNull Long sectionId,
            @NotNull Long examDefinitionId) {
    }

    public record CreateExamDefinitionRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Min(2000) @Max(9999) Integer academicYear) {
    }

    public record CreateExamSubjectRequest(
            @NotBlank @Size(max = 100) String subject,
            @NotNull @DecimalMin(value = "0.01") @Digits(integer = 6, fraction = 2) BigDecimal maximumMarks) {
    }

    public record SaveMarksRequest(@NotEmpty List<@Valid MarkEntry> marks) {
    }

    public record MarkEntry(
            @NotNull Long studentId,
            @NotNull @DecimalMin(value = "0.00") @Digits(integer = 6, fraction = 2) BigDecimal obtainedMarks) {
    }

    public record ExamResponse(
            Long id,
            Long sectionId,
            Long examDefinitionId,
            String name,
            Integer academicYear,
            List<ExamSubjectResponse> subjects) {
    }

    public record ExamDefinitionResponse(Long id, String name, Integer academicYear) {
    }

    public record SectionSubjectResponse(
            Long id, Long sectionId, String subject, BigDecimal defaultMaximumMarks) {
    }

    public record ExamSubjectResponse(
            Long id,
            String subject,
            BigDecimal maximumMarks,
            List<MarkResponse> marks) {
    }

    public record MarkResponse(Long studentId, String fullName, BigDecimal obtainedMarks) {
    }
}
