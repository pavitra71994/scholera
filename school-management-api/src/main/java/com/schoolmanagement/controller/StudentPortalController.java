package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentPortalController {
    private final SchoolPersonRepository people;
    private final ExamMarkRepository marks;
    private final AttendanceRecordRepository attendance;

    public StudentPortalController(
            SchoolPersonRepository people,
            ExamMarkRepository marks,
            AttendanceRecordRepository attendance) {
        this.people = people;
        this.marks = marks;
        this.attendance = attendance;
    }

    @GetMapping("/profile")
    @Transactional(readOnly = true)
    public StudentProfileResponse getProfile(Authentication authentication) {
        return profileResponse(currentStudent(authentication));
    }

    @PatchMapping("/profile")
    @Transactional
    public StudentProfileResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateStudentProfileRequest request) {
        SchoolPerson student = currentStudent(authentication);
        student.updateStudentEditableDetails(
                request.displayName().trim(),
                normalizeOptional(request.emergencyContact()));
        return profileResponse(student);
    }

    @GetMapping("/exam-history")
    @Transactional(readOnly = true)
    public List<ExamHistoryEntry> getExamHistory(Authentication authentication) {
        SchoolPerson student = currentStudent(authentication);
        return marks.findAllByStudent_IdOrderByExam_NameAscExam_SubjectAscIdAsc(student.getId()).stream()
                .map(mark -> {
                    SchoolExam exam = mark.getExam();
                    BigDecimal percentage = mark.getObtainedMarks()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(exam.getMaximumMarks(), 2, RoundingMode.HALF_UP);
                    return new ExamHistoryEntry(
                            exam.getName(),
                            exam.getSubject(),
                            mark.getObtainedMarks(),
                            exam.getMaximumMarks(),
                            percentage);
                })
                .toList();
    }

    @GetMapping("/attendance-history")
    @Transactional(readOnly = true)
    public AttendanceHistoryResponse getAttendanceHistory(Authentication authentication) {
        SchoolPerson student = currentStudent(authentication);
        List<AttendanceRecord> records = attendance.findAllByStudent_IdOrderByAttendanceDateDescIdDesc(student.getId());
        long present = records.stream().filter(row -> row.getStatus() == AttendanceStatus.PRESENT).count();
        long absent = records.stream().filter(row -> row.getStatus() == AttendanceStatus.ABSENT).count();
        long late = records.stream().filter(row -> row.getStatus() == AttendanceStatus.LATE).count();
        BigDecimal percentage = records.isEmpty()
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(present + late)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(records.size()), 2, RoundingMode.HALF_UP);
        List<AttendanceHistoryEntry> history = records.stream()
                .map(row -> new AttendanceHistoryEntry(row.getAttendanceDate(), row.getStatus()))
                .toList();
        return new AttendanceHistoryResponse(present, absent, late, records.size(), percentage, history);
    }

    @GetMapping("/toppers")
    @Transactional(readOnly = true)
    public ToppersResponse getToppers(Authentication authentication) {
        SchoolPerson student = currentStudent(authentication);
        SchoolSection section = student.getSection();
        if (section == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Your class section is not available.");
        }
        Long classId = section.getSchoolClass().getId();
        List<LeaderboardEntry> classToppers = topClassTotals(marks.findClassTotals(classId));
        List<LeaderboardEntry> sectionToppers = topSectionTotals(marks.findSectionTotals(section.getId()));
        List<LeaderboardEntry> subjectToppers = topSubjectTotals(marks.findClassSubjectTotals(classId));
        return new ToppersResponse(classToppers, sectionToppers, subjectToppers);
    }

    private SchoolPerson currentStudent(Authentication authentication) {
        return people.findByAccount_Username(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found."));
    }

    private StudentProfileResponse profileResponse(SchoolPerson student) {
        SchoolSection section = student.getSection();
        SchoolClass schoolClass = section == null ? null : section.getSchoolClass();
        return new StudentProfileResponse(
                student.getFullName(),
                student.getDateOfBirth(),
                student.getMotherName(),
                student.getFatherName(),
                student.getEmergencyContact(),
                student.getRollNumber(),
                schoolClass == null ? null : schoolClass.getName(),
                section == null ? null : section.getName());
    }

    private List<LeaderboardEntry> topSectionTotals(List<ExamMarkRepository.SectionLeaderboardTotal> totals) {
        if (totals.isEmpty()) return List.of();
        BigDecimal highest = totals.getFirst().getTotalMarks();
        return totals.stream()
                .filter(row -> row.getTotalMarks().compareTo(highest) == 0)
                .map(row -> new LeaderboardEntry(
                        row.getStudentName(), null, row.getSectionName(), null, row.getTotalMarks(), 1))
                .toList();
    }

    private List<LeaderboardEntry> topClassTotals(List<ExamMarkRepository.LeaderboardTotal> totals) {
        if (totals.isEmpty()) return List.of();
        BigDecimal highest = totals.getFirst().getTotalMarks();
        return totals.stream()
                .filter(row -> row.getTotalMarks().compareTo(highest) == 0)
                .map(row -> new LeaderboardEntry(
                        row.getStudentName(), row.getClassName(), null, null, row.getTotalMarks(), 1))
                .toList();
    }

    private List<LeaderboardEntry> topSubjectTotals(List<ExamMarkRepository.SubjectLeaderboardTotal> totals) {
        Map<String, List<ExamMarkRepository.SubjectLeaderboardTotal>> bySubject = totals.stream()
                .collect(Collectors.groupingBy(
                        ExamMarkRepository.SubjectLeaderboardTotal::getSubject,
                        TreeMap::new,
                        Collectors.toList()));
        List<LeaderboardEntry> result = new ArrayList<>();
        for (Map.Entry<String, List<ExamMarkRepository.SubjectLeaderboardTotal>> group : bySubject.entrySet()) {
            List<ExamMarkRepository.SubjectLeaderboardTotal> rows = group.getValue();
            BigDecimal highest = rows.getFirst().getTotalMarks();
            rows.stream()
                    .filter(row -> row.getTotalMarks().compareTo(highest) == 0)
                    .map(row -> new LeaderboardEntry(
                            row.getStudentName(),
                            row.getClassName(),
                            null,
                            row.getSubject(),
                            row.getTotalMarks(),
                            1))
                    .forEach(result::add);
        }
        return List.copyOf(result);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record StudentProfileResponse(
            String displayName,
            LocalDate dateOfBirth,
            String motherName,
            String fatherName,
            String emergencyContact,
            Integer rollNumber,
            String className,
            String sectionName) {
    }

    public record UpdateStudentProfileRequest(
            @NotBlank @Size(max = 160) String displayName,
            @Size(max = 40) String emergencyContact) {
    }

    public record ExamHistoryEntry(
            String examName,
            String subject,
            BigDecimal obtainedMarks,
            BigDecimal maximumMarks,
            BigDecimal percentage) {
    }

    public record AttendanceHistoryEntry(
            LocalDate date,
            AttendanceStatus status) {
    }

    public record AttendanceHistoryResponse(
            long presentCount,
            long absentCount,
            long lateCount,
            long recordedDays,
            BigDecimal attendancePercentage,
            List<AttendanceHistoryEntry> history) {
    }

    public record LeaderboardEntry(
            String studentName,
            String className,
            String sectionName,
            String subject,
            BigDecimal totalMarks,
            int rank) {
    }

    public record ToppersResponse(
            List<LeaderboardEntry> classToppers,
            List<LeaderboardEntry> sectionToppers,
            List<LeaderboardEntry> subjectToppers) {
    }
}
