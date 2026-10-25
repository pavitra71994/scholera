package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;

import jakarta.validation.Valid;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
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
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public StudentProfileResponse getProfile(Authentication authentication) {
        return profileResponse(currentStudent(authentication));
    }

    @PatchMapping("/profile")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional
    public StudentProfileResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateStudentProfileRequest request) {
            SchoolPerson student = currentStudent(authentication);
            student.updateStudentEmergencyContact(normalizeOptional(request.emergencyContact()));
            return profileResponse(student);
    }

    @GetMapping("/exam-history")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public List<ExamHistoryEntry> getExamHistory(Authentication authentication) {
        SchoolPerson student = currentStudent(authentication);
        return marks.findAllByStudent_IdOrderByExamSubject_Exam_AcademicYearDescExamSubject_Exam_NameAscExamSubject_SectionSubject_SubjectAscIdAsc(student.getId()).stream()
                .map(mark -> {
                    SchoolExam exam = mark.getExamSubject().getExam();
                    BigDecimal percentage = mark.getObtainedMarks()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(mark.getExamSubject().getMaximumMarks(), 2, RoundingMode.HALF_UP);
                    return new ExamHistoryEntry(
                            exam.getName(),
                            mark.getExamSubject().getSubject(),
                            exam.getAcademicYear(),
                            mark.getObtainedMarks(),
                            mark.getExamSubject().getMaximumMarks(),
                            percentage);
                })
                .toList();
    }

    @GetMapping("/exam-results")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public List<ExamResultResponse> getExamResults(Authentication authentication) {
        SchoolPerson student = currentStudent(authentication);
        Map<Long, List<ExamMark>> marksByExam = new LinkedHashMap<>();
        for (ExamMark mark : marks.findAllByStudent_IdOrderByExamSubject_Exam_AcademicYearDescExamSubject_Exam_NameAscExamSubject_SectionSubject_SubjectAscIdAsc(student.getId())) {
            marksByExam.computeIfAbsent(mark.getExamSubject().getExam().getId(), ignored -> new ArrayList<>()).add(mark);
        }

        return marksByExam.values().stream().map(examMarks -> {
            SchoolExam exam = examMarks.get(0).getExamSubject().getExam();
            SchoolSection section = exam.getSection();
            SchoolClass schoolClass = section.getSchoolClass();
            List<ExamMarkRepository.ExamResultTotal> sectionTotals = marks.findAllExamTotals(exam.getId());
            List<ExamMarkRepository.ExamResultTotal> classTotals = marks.findAllClassExamTotals(
                    schoolClass.getId(), exam.getAcademicYear(), exam.getName());
            List<ExamSubjectResult> subjectResults = examMarks.stream()
                    .map(mark -> {
                        BigDecimal maximum = mark.getExamSubject().getMaximumMarks();
                        BigDecimal percentage = mark.getObtainedMarks()
                                .multiply(BigDecimal.valueOf(100))
                                .divide(maximum, 2, RoundingMode.HALF_UP);
                        return new ExamSubjectResult(
                                mark.getExamSubject().getSubject(),
                                mark.getObtainedMarks(),
                                maximum,
                                percentage);
                    })
                    .toList();
            BigDecimal obtained = subjectResults.stream()
                    .map(ExamSubjectResult::obtainedMarks)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal maximum = subjectResults.stream()
                    .map(ExamSubjectResult::maximumMarks)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal percentage = maximum.signum() == 0
                    ? BigDecimal.ZERO.setScale(2)
                    : obtained.multiply(BigDecimal.valueOf(100)).divide(maximum, 2, RoundingMode.HALF_UP);
            return new ExamResultResponse(
                    exam.getId(),
                    exam.getName(),
                    exam.getAcademicYear(),
                    obtained,
                    maximum,
                    percentage,
                    rankFor(sectionTotals, student.getId()),
                    rankFor(classTotals, student.getId()),
                    subjectResults);
        }).toList();
    }

    @GetMapping("/attendance-history")
    @PreAuthorize("hasRole('STUDENT')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Transactional(readOnly = true)
    public ToppersResponse getToppers(Authentication authentication) {
        Long currentStudentId = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_STUDENT"))
                ? currentStudent(authentication).getId()
                : null;
        List<LeaderboardEntry> classToppers = rankedClassTotals(marks.findAllClassTotals(), currentStudentId);
        List<LeaderboardEntry> sectionToppers = rankedSectionTotals(marks.findAllSectionTotals(), currentStudentId);
        List<LeaderboardEntry> subjectToppers = rankedSubjectTotals(marks.findAllClassSubjectTotals(), currentStudentId);
        return new ToppersResponse(classToppers, sectionToppers, subjectToppers);
    }

    private int rankFor(List<ExamMarkRepository.ExamResultTotal> totals, Long studentId) {
        BigDecimal previousMarks = null;
        int position = 0;
        int rank = 0;
        for (ExamMarkRepository.ExamResultTotal row : totals) {
            position++;
            if (previousMarks == null || row.getTotalMarks().compareTo(previousMarks) != 0) {
                previousMarks = row.getTotalMarks();
                rank = position;
            }
            if (row.getStudentId().equals(studentId)) return rank;
        }
        return 0;
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

    private List<LeaderboardEntry> rankedClassTotals(
            List<ExamMarkRepository.LeaderboardTotal> totals,
            Long currentStudentId) {
        List<LeaderboardEntry> result = new ArrayList<>();
        Long groupId = null;
        Integer currentYear = null;
        BigDecimal previousMarks = null;
        int position = 0;
        int rank = 0;
        for (ExamMarkRepository.LeaderboardTotal row : totals) {
            if (!row.getClassId().equals(groupId) || !row.getAcademicYear().equals(currentYear)) {
                groupId = row.getClassId();
                currentYear = row.getAcademicYear();
                previousMarks = null;
                position = 0;
                rank = 0;
            }
            position++;
            if (previousMarks == null || row.getTotalMarks().compareTo(previousMarks) != 0) {
                previousMarks = row.getTotalMarks();
                rank = position;
            }
            result.add(new LeaderboardEntry(
                    row.getStudentName(), row.getClassName(), null, null, row.getAcademicYear(), row.getTotalMarks(), rank,
                    row.getStudentId().equals(currentStudentId)));
        }
        return result;
    }

    private List<LeaderboardEntry> rankedSectionTotals(
            List<ExamMarkRepository.SectionLeaderboardTotal> totals,
            Long currentStudentId) {
        List<LeaderboardEntry> result = new ArrayList<>();
        Long groupId = null;
        Integer currentYear = null;
        BigDecimal previousMarks = null;
        int position = 0;
        int rank = 0;
        for (ExamMarkRepository.SectionLeaderboardTotal row : totals) {
            if (!row.getSectionId().equals(groupId) || !row.getAcademicYear().equals(currentYear)) {
                groupId = row.getSectionId();
                currentYear = row.getAcademicYear();
                previousMarks = null;
                position = 0;
                rank = 0;
            }
            position++;
            if (previousMarks == null || row.getTotalMarks().compareTo(previousMarks) != 0) {
                previousMarks = row.getTotalMarks();
                rank = position;
            }
            result.add(new LeaderboardEntry(
                    row.getStudentName(), row.getClassName(), row.getSectionName(), null, row.getAcademicYear(),
                    row.getTotalMarks(), rank, row.getStudentId().equals(currentStudentId)));
        }
        return result;
    }

    private List<LeaderboardEntry> rankedSubjectTotals(
            List<ExamMarkRepository.SubjectLeaderboardTotal> totals,
            Long currentStudentId) {
        List<LeaderboardEntry> result = new ArrayList<>();
        String groupKey = null;
        BigDecimal previousMarks = null;
        int position = 0;
        int rank = 0;
        for (ExamMarkRepository.SubjectLeaderboardTotal row : totals) {
            String rowGroupKey = row.getClassId() + "\u0000" + row.getSubject() + "\u0000" + row.getAcademicYear();
            if (!rowGroupKey.equals(groupKey)) {
                groupKey = rowGroupKey;
                previousMarks = null;
                position = 0;
                rank = 0;
            }
            position++;
            if (previousMarks == null || row.getTotalMarks().compareTo(previousMarks) != 0) {
                previousMarks = row.getTotalMarks();
                rank = position;
            }
            result.add(new LeaderboardEntry(
                    row.getStudentName(), row.getClassName(), null, row.getSubject(), row.getAcademicYear(),
                    row.getTotalMarks(), rank,
                    row.getStudentId().equals(currentStudentId)));
        }
        return result;
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
            @Size(max = 40) String emergencyContact) {
    }

    public record ExamHistoryEntry(
            String examName,
            String subject,
            Integer academicYear,
            BigDecimal obtainedMarks,
            BigDecimal maximumMarks,
            BigDecimal percentage) {
    }

    public record ExamSubjectResult(
            String subject,
            BigDecimal obtainedMarks,
            BigDecimal maximumMarks,
            BigDecimal percentage) {
    }

    public record ExamResultResponse(
            Long examId,
            String examName,
            Integer academicYear,
            BigDecimal totalMarks,
            BigDecimal maximumMarks,
            BigDecimal percentage,
            int sectionRank,
            int classRank,
            List<ExamSubjectResult> subjects) {
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
            Integer academicYear,
            BigDecimal totalMarks,
            int rank,
            boolean currentStudent) {
    }

    public record ToppersResponse(
            List<LeaderboardEntry> classToppers,
            List<LeaderboardEntry> sectionToppers,
            List<LeaderboardEntry> subjectToppers) {
    }
}
