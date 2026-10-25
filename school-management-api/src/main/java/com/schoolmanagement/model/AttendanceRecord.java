package com.schoolmanagement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDate;

@Entity
@Table(name = "attendance_record", uniqueConstraints = {
        @UniqueConstraint(name = "uq_attendance_student_date", columnNames = {"student_id", "attendance_date"})
})
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private SchoolPerson student;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    protected AttendanceRecord() {
    }

    public AttendanceRecord(SchoolPerson student, LocalDate attendanceDate, AttendanceStatus status) {
        this.student = student;
        this.attendanceDate = attendanceDate;
        this.status = status;
    }

    public void updateStatus(AttendanceStatus status) {
        this.status = status;
    }

    public SchoolPerson getStudent() {
        return student;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }
}
