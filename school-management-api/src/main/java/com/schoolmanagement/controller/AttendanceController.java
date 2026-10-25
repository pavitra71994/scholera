package com.schoolmanagement.controller;

import com.schoolmanagement.model.*;
import com.schoolmanagement.repository.*;

import com.schoolmanagement.security.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
public class AttendanceController {
    private final SchoolPersonRepository people;
    private final SchoolSectionRepository sections;
    private final AttendanceRecordRepository records;
    private final TeacherSectionAssignmentRepository assignments;

    public AttendanceController(
            SchoolPersonRepository people,
            SchoolSectionRepository sections,
            AttendanceRecordRepository records,
            TeacherSectionAssignmentRepository assignments) {
        this.people = people;
        this.sections = sections;
        this.records = records;
        this.assignments = assignments;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getAttendance(
            Authentication authentication,
            @RequestParam Long sectionId,
            @RequestParam LocalDate date) {
        requireSectionAccess(sectionId, authentication);
        var saved = records.findAllByAttendanceDateAndStudent_Section_Id(date, sectionId).stream()
                .collect(java.util.stream.Collectors.toMap(record -> record.getStudent().getId(), AttendanceRecord::getStatus));
        return people.findAllBySection_IdAndAccount_RoleOrderByFullName(sectionId, Role.STUDENT).stream()
                .map(student -> new StudentAttendanceResponse(student.getId(), student.getFullName(), saved.get(student.getId())))
                .toList();
    }

    @PostMapping
    @Transactional
    public List<StudentAttendanceResponse> saveAttendance(
            Authentication authentication,
            @Valid @RequestBody AttendanceRequest request) {
        requireSectionAccess(request.sectionId(), authentication);
        var students = people.findAllBySection_IdAndAccount_RoleOrderByFullName(request.sectionId(), Role.STUDENT);
        var studentById = students.stream().collect(java.util.stream.Collectors.toMap(SchoolPerson::getId, student -> student));
        var submittedIds = new HashSet<Long>();
        if (request.records().size() != students.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submit attendance for every student in the section.");
        }
        for (AttendanceEntry entry : request.records()) {
            if (!submittedIds.add(entry.studentId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A student can only appear once in an attendance register.");
            }
            SchoolPerson student = studentById.get(entry.studentId());
            if (student == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Every student must belong to the selected section.");
            }
            AttendanceRecord record = records.findByStudent_IdAndAttendanceDate(entry.studentId(), request.date())
                    .orElseGet(() -> new AttendanceRecord(student, request.date(), entry.status()));
            record.updateStatus(entry.status());
            records.save(record);
        }
        return getAttendance(authentication, request.sectionId(), request.date());
    }

    @GetMapping("/history")
    @Transactional(readOnly = true)
    public List<AttendanceHistoryResponse> getAttendanceHistory(
            Authentication authentication,
            @RequestParam Long sectionId) {
        requireSectionAccess(sectionId, authentication);
        return records.findTop100ByStudent_Section_IdOrderByAttendanceDateDescIdDesc(sectionId).stream()
                .map(record -> new AttendanceHistoryResponse(
                        record.getAttendanceDate(),
                        record.getStudent().getId(),
                        record.getStudent().getFullName(),
                        record.getStatus()))
                .toList();
    }

    private void requireSectionAccess(Long sectionId, Authentication authentication) {
        if (!sections.existsById(sectionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found.");
        }
        if (authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_TEACHER"))
                && !assignments.existsByTeacher_Account_UsernameAndSection_Id(authentication.getName(), sectionId)
                && !sections.existsByClassTeacher_Account_UsernameAndId(authentication.getName(), sectionId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attendance access is not assigned for this section.");
        }
    }

    public record AttendanceRequest(
            @NotNull Long sectionId,
            @NotNull LocalDate date,
            @NotEmpty List<@Valid AttendanceEntry> records) {
    }

    public record AttendanceEntry(@NotNull Long studentId, @NotNull AttendanceStatus status) {
    }

    public record StudentAttendanceResponse(Long studentId, String fullName, AttendanceStatus status) {
    }

    public record AttendanceHistoryResponse(
            LocalDate date,
            Long studentId,
            String fullName,
            AttendanceStatus status) {
    }
}
