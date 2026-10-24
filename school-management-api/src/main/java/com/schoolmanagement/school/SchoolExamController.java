package com.schoolmanagement.school;

import com.schoolmanagement.security.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
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
@PreAuthorize("hasRole('ADMIN')")
public class SchoolExamController {
    private final SchoolExamRepository exams;
    private final ExamMarkRepository marks;
    private final SchoolSectionRepository sections;
    private final SchoolPersonRepository people;

    public SchoolExamController(
            SchoolExamRepository exams,
            ExamMarkRepository marks,
            SchoolSectionRepository sections,
            SchoolPersonRepository people) {
        this.exams = exams;
        this.marks = marks;
        this.sections = sections;
        this.people = people;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ExamResponse> getExams(@RequestParam Long sectionId) {
        requireSection(sectionId);
        return exams.findAllBySection_IdOrderByNameAscSubjectAsc(sectionId).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ExamResponse createExam(@Valid @RequestBody CreateExamRequest request) {
        SchoolSection section = sections.findById(request.sectionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
        SchoolExam exam = exams.save(new SchoolExam(
                section, request.name().trim(), request.subject().trim(), request.maximumMarks()));
        return toResponse(exam);
    }

    @PostMapping("/{examId}/marks")
    @Transactional
    public List<MarkResponse> saveMarks(
            @PathVariable Long examId,
            @Valid @RequestBody SaveMarksRequest request) {
        SchoolExam exam = exams.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found."));
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
            if (entry.obtainedMarks().compareTo(exam.getMaximumMarks()) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A score cannot exceed the maximum marks.");
            }
            ExamMark mark = marks.findByExam_IdAndStudent_Id(examId, entry.studentId())
                    .orElseGet(() -> new ExamMark(exam, student, entry.obtainedMarks()));
            mark.updateMarks(entry.obtainedMarks());
            marks.save(mark);
        }
        return marks.findAllByExam_Id(examId).stream().map(this::toMarkResponse).toList();
    }

    private ExamResponse toResponse(SchoolExam exam) {
        return new ExamResponse(
                exam.getId(),
                exam.getSection().getId(),
                exam.getName(),
                exam.getSubject(),
                exam.getMaximumMarks(),
                marks.findAllByExam_Id(exam.getId()).stream().map(this::toMarkResponse).toList());
    }

    private MarkResponse toMarkResponse(ExamMark mark) {
        return new MarkResponse(mark.getStudent().getId(), mark.getStudent().getFullName(), mark.getObtainedMarks());
    }

    private void requireSection(Long sectionId) {
        if (!sections.existsById(sectionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found.");
        }
    }

    public record CreateExamRequest(
            @NotNull Long sectionId,
            @NotBlank @Size(max = 100) String name,
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
            String name,
            String subject,
            BigDecimal maximumMarks,
            List<MarkResponse> marks) {
    }

    public record MarkResponse(Long studentId, String fullName, BigDecimal obtainedMarks) {
    }
}
