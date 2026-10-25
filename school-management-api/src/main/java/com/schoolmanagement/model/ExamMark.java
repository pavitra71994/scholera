package com.schoolmanagement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;

@Entity
@Table(name = "exam_mark", uniqueConstraints = {
        @UniqueConstraint(name = "uq_exam_mark_exam_student", columnNames = {"exam_id", "student_id"})
})
public class ExamMark {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_id", nullable = false)
    private SchoolExam exam;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private SchoolPerson student;

    @Column(name = "obtained_marks", nullable = false, precision = 8, scale = 2)
    private BigDecimal obtainedMarks;

    protected ExamMark() {
    }

    public ExamMark(SchoolExam exam, SchoolPerson student, BigDecimal obtainedMarks) {
        this.exam = exam;
        this.student = student;
        this.obtainedMarks = obtainedMarks;
    }

    public void updateMarks(BigDecimal obtainedMarks) {
        this.obtainedMarks = obtainedMarks;
    }

    public SchoolPerson getStudent() {
        return student;
    }

    public SchoolExam getExam() {
        return exam;
    }

    public BigDecimal getObtainedMarks() {
        return obtainedMarks;
    }
}
