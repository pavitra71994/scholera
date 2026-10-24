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

@Entity
@Table(name = "school_section", uniqueConstraints = {
        @UniqueConstraint(name = "uq_school_section_class_name", columnNames = {"class_id", "name"})
})
public class SchoolSection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_id", nullable = false)
    private SchoolClass schoolClass;

    @Column(nullable = false, length = 40)
    private String name;

    protected SchoolSection() {
    }

    public SchoolSection(SchoolClass schoolClass, String name) {
        this.schoolClass = schoolClass;
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public SchoolClass getSchoolClass() {
        return schoolClass;
    }

    public String getName() {
        return name;
    }
}
