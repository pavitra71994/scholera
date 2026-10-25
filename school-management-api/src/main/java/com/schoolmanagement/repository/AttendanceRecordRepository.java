package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findAllByAttendanceDateAndStudent_Section_Id(LocalDate date, Long sectionId);

    Optional<AttendanceRecord> findByStudent_IdAndAttendanceDate(Long studentId, LocalDate date);

    List<AttendanceRecord> findAllByStudent_IdOrderByAttendanceDateDescIdDesc(Long studentId);

    @EntityGraph(attributePaths = "student")
    List<AttendanceRecord> findTop100ByStudent_Section_IdOrderByAttendanceDateDescIdDesc(Long sectionId);

    @EntityGraph(attributePaths = "student")
    List<AttendanceRecord> findAllByStudent_Section_IdOrderByAttendanceDateDescIdDesc(Long sectionId);
}
