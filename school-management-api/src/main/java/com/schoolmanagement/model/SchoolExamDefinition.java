package com.schoolmanagement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "school_exam_definition", uniqueConstraints = {
        @UniqueConstraint(name = "uq_school_exam_definition_name_year", columnNames = {"name", "academic_year"})
})
public class SchoolExamDefinition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "academic_year", nullable = false)
    private Integer academicYear;

    protected SchoolExamDefinition() {
    }

    public SchoolExamDefinition(String name, Integer academicYear) {
        this.name = name;
        this.academicYear = academicYear;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Integer getAcademicYear() {
        return academicYear;
    }
}
