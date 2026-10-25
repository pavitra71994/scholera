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
@Table(name = "school_section_subject", uniqueConstraints = {
        @UniqueConstraint(name = "uq_school_section_subject_name", columnNames = {"section_id", "subject"})
})
public class SchoolSectionSubject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private SchoolSection section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private SchoolPerson teacher;

    @Column(nullable = false, length = 100)
    private String subject;

    @Column(name = "default_maximum_marks", nullable = false, precision = 8, scale = 2)
    private BigDecimal defaultMaximumMarks;

    protected SchoolSectionSubject() {
    }

    public SchoolSectionSubject(SchoolSection section, String subject, BigDecimal defaultMaximumMarks) {
        this.section = section;
        this.subject = subject;
        this.defaultMaximumMarks = defaultMaximumMarks;
    }

    public Long getId() {
        return id;
    }

    public SchoolSection getSection() {
        return section;
    }

    public SchoolPerson getTeacher() {
        return teacher;
    }

    public void assignTeacher(SchoolPerson teacher) {
        this.teacher = teacher;
    }

    public String getSubject() {
        return subject;
    }

    public BigDecimal getDefaultMaximumMarks() {
        return defaultMaximumMarks;
    }
}
