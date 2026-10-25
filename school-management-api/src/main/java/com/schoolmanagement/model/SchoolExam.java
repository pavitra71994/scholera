package com.schoolmanagement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "school_exam", uniqueConstraints = {
        @UniqueConstraint(name = "uq_school_exam_section_name_year", columnNames = {"section_id", "name", "academic_year"})
})
public class SchoolExam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private SchoolSection section;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_definition_id", nullable = false)
    private SchoolExamDefinition definition;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "academic_year", nullable = false)
    private Integer academicYear;

    @OneToMany(mappedBy = "exam")
    private List<SchoolExamSubject> subjects = new ArrayList<>();

    protected SchoolExam() {
    }

    public SchoolExam(SchoolSection section, SchoolExamDefinition definition) {
        this.section = section;
        this.definition = definition;
        this.name = definition.getName();
        this.academicYear = definition.getAcademicYear();
    }

    public Long getId() {
        return id;
    }

    public SchoolSection getSection() {
        return section;
    }

    public SchoolExamDefinition getDefinition() {
        return definition;
    }

    public String getName() {
        return name;
    }

    public Integer getAcademicYear() {
        return academicYear;
    }

    public List<SchoolExamSubject> getSubjects() {
        return subjects;
    }
}
