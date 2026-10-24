package com.schoolmanagement.school;

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
@Table(name = "school_exam", uniqueConstraints = {
        @UniqueConstraint(name = "uq_school_exam_section_name_subject", columnNames = {"section_id", "name", "subject"})
})
public class SchoolExam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private SchoolSection section;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String subject;

    @Column(name = "maximum_marks", nullable = false, precision = 8, scale = 2)
    private BigDecimal maximumMarks;

    protected SchoolExam() {
    }

    public SchoolExam(SchoolSection section, String name, String subject, BigDecimal maximumMarks) {
        this.section = section;
        this.name = name;
        this.subject = subject;
        this.maximumMarks = maximumMarks;
    }

    public Long getId() {
        return id;
    }

    public SchoolSection getSection() {
        return section;
    }

    public String getName() {
        return name;
    }

    public String getSubject() {
        return subject;
    }

    public BigDecimal getMaximumMarks() {
        return maximumMarks;
    }
}
