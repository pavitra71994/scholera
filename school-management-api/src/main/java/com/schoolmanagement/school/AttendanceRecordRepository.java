package com.schoolmanagement.school;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findAllByAttendanceDateAndStudent_Section_Id(LocalDate date, Long sectionId);

    Optional<AttendanceRecord> findByStudent_IdAndAttendanceDate(Long studentId, LocalDate date);
}
