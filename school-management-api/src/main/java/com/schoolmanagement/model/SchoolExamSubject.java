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
import java.math.BigDecimal;

@Entity
@Table(name = "school_exam_subject")
public class SchoolExamSubject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_id", nullable = false)
    private SchoolExam exam;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_subject_id", nullable = false)
    private SchoolSectionSubject sectionSubject;

    @Column(name = "maximum_marks", nullable = false, precision = 8, scale = 2)
    private BigDecimal maximumMarks;

    protected SchoolExamSubject() {
    }

    public SchoolExamSubject(SchoolExam exam, SchoolSectionSubject sectionSubject, BigDecimal maximumMarks) {
        this.exam = exam;
        this.sectionSubject = sectionSubject;
        this.maximumMarks = maximumMarks;
    }

    public Long getId() {
        return id;
    }

    public SchoolExam getExam() {
        return exam;
    }

    public String getSubject() {
        return sectionSubject.getSubject();
    }

    public SchoolSectionSubject getSectionSubject() {
        return sectionSubject;
    }

    public BigDecimal getMaximumMarks() {
        return maximumMarks;
    }
}
