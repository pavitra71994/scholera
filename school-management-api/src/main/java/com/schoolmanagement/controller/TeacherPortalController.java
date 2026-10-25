package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;

import com.schoolmanagement.security.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherPortalController {
    private final SchoolPersonRepository people;
    private final TeacherSectionAssignmentRepository assignments;
    private final AttendanceRecordRepository attendance;
    private final ExamMarkRepository marks;

    public TeacherPortalController(
            SchoolPersonRepository people,
            TeacherSectionAssignmentRepository assignments,
            AttendanceRecordRepository attendance,
            ExamMarkRepository marks) {
        this.people = people;
        this.assignments = assignments;
        this.attendance = attendance;
        this.marks = marks;
    }

    @GetMapping("/profile")
    @Transactional(readOnly = true)
    public TeacherProfileResponse getProfile(Authentication authentication) {
        SchoolPerson teacher = currentTeacher(authentication);
        return new TeacherProfileResponse(
                teacher.getFullName(),
                teacher.getAccount().getUsername(),
                teacher.getTeacherPhone(),
                assignedSections(authentication.getName()));
    }

    @PatchMapping("/profile")
    @Transactional
    public TeacherProfileResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateTeacherProfileRequest request) {
        SchoolPerson teacher = currentTeacher(authentication);
        String phone = request.phone() == null || request.phone().isBlank() ? null : request.phone().trim();
        teacher.updateTeacherEditableDetails(request.displayName().trim(), phone);
        return getProfile(authentication);
    }

    @GetMapping("/sections")
    @Transactional(readOnly = true)
    public List<SectionResponse> getSections(Authentication authentication) {
        return assignedSections(authentication.getName());
    }

    @GetMapping("/sections/{sectionId}/students")
    @Transactional(readOnly = true)
    public List<RosterStudentResponse> getRoster(Authentication authentication, @PathVariable Long sectionId) {
        requireAssigned(authentication, sectionId);
        return people.findAllBySection_IdAndAccount_RoleOrderByFullName(sectionId, Role.STUDENT).stream()
                .map(student -> new RosterStudentResponse(student.getId(), student.getFullName(), student.getRollNumber()))
                .toList();
    }

    @GetMapping("/sections/{sectionId}/progress")
    @Transactional(readOnly = true)
    public SectionProgressResponse getProgress(Authentication authentication, @PathVariable Long sectionId) {
        requireAssigned(authentication, sectionId);
        List<SchoolPerson> students = people.findAllBySection_IdAndAccount_RoleOrderByFullName(sectionId, Role.STUDENT);
        Map<Long, MutableStudentProgress> progress = new LinkedHashMap<>();
        for (SchoolPerson student : students) {
            progress.put(student.getId(), new MutableStudentProgress(student.getId(), student.getFullName()));
        }

        for (AttendanceRecord record : attendance.findAllByStudent_Section_IdOrderByAttendanceDateDescIdDesc(sectionId)) {
            MutableStudentProgress row = progress.get(record.getStudent().getId());
            if (row == null) continue;
            row.recordedAttendance++;
            if (record.getStatus() == AttendanceStatus.PRESENT) row.presentAttendance++;
            if (record.getStatus() == AttendanceStatus.LATE) row.lateAttendance++;
        }
        for (ExamMark mark : marks.findAllByExamSubject_Exam_Section_IdOrderByExamSubject_Exam_AcademicYearDescExamSubject_Exam_NameAscExamSubject_SectionSubject_SubjectAscStudent_FullNameAsc(sectionId)) {
            MutableStudentProgress row = progress.get(mark.getStudent().getId());
            if (row != null) {
                SchoolExamSubject subject = mark.getExamSubject();
                row.examMarks.add(new StudentExamMarkResponse(
                        subject.getExam().getName(),
                        subject.getSubject(),
                        subject.getExam().getAcademicYear(),
                        mark.getObtainedMarks(),
                        subject.getMaximumMarks()));
            }
        }
        List<StudentProgressResponse> studentsResponse = progress.values().stream()
                .map(row -> new StudentProgressResponse(
                        row.studentId,
                        row.studentName,
                        row.recordedAttendance,
                        percentage(row.presentAttendance + row.lateAttendance, row.recordedAttendance),
                        List.copyOf(row.examMarks)))
                .toList();
        return new SectionProgressResponse(sectionId, studentsResponse);
    }

    private List<SectionResponse> assignedSections(String username) {
        return assignments
                .findAllByTeacher_Account_UsernameOrderBySection_SchoolClass_NameAscSection_NameAsc(username)
                .stream()
                .map(assignment -> sectionResponse(assignment.getSection()))
                .toList();
    }

    private SectionResponse sectionResponse(SchoolSection section) {
        return new SectionResponse(
                section.getId(),
                section.getName(),
                section.getSchoolClass().getId(),
                section.getSchoolClass().getName());
    }

    private SchoolPerson currentTeacher(Authentication authentication) {
        SchoolPerson teacher = people.findByAccount_Username(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher profile not found."));
        if (teacher.getAccount().getRole() != Role.TEACHER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher access is required.");
        }
        return teacher;
    }

    private void requireAssigned(Authentication authentication, Long sectionId) {
        if (!assignments.existsByTeacher_Account_UsernameAndSection_Id(authentication.getName(), sectionId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This section is not assigned to you.");
        }
    }

    private BigDecimal percentage(long present, long recorded) {
        return recorded == 0
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(present)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(recorded), 2, RoundingMode.HALF_UP);
    }

    public record UpdateTeacherProfileRequest(
            @NotBlank @Size(max = 160) String displayName,
            @Size(max = 40) String phone) {
    }

    public record TeacherProfileResponse(
            String displayName,
            String username,
            String phone,
            List<SectionResponse> sections) {
    }

    public record SectionResponse(Long id, String name, Long classId, String className) {
    }

    public record RosterStudentResponse(Long id, String fullName, Integer rollNumber) {
    }

    public record SectionProgressResponse(Long sectionId, List<StudentProgressResponse> students) {
    }

    public record StudentProgressResponse(
            Long studentId,
            String studentName,
            long recordedAttendance,
            BigDecimal attendancePercentage,
            List<StudentExamMarkResponse> marks) {
    }

    public record StudentExamMarkResponse(
            String examName,
            String subject,
            Integer academicYear,
            BigDecimal obtainedMarks,
            BigDecimal maximumMarks) {
    }

    private static final class MutableStudentProgress {
        private final Long studentId;
        private final String studentName;
        private long recordedAttendance;
        private long presentAttendance;
        private long lateAttendance;
        private final List<StudentExamMarkResponse> examMarks = new ArrayList<>();

        private MutableStudentProgress(Long studentId, String studentName) {
            this.studentId = studentId;
            this.studentName = studentName;
        }
    }
}
