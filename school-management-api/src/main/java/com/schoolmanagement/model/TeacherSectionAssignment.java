package com.schoolmanagement.model;

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
@Table(name = "teacher_section_assignment", uniqueConstraints = {
        @UniqueConstraint(name = "uq_teacher_section_assignment", columnNames = {"teacher_id", "section_id"})
})
public class TeacherSectionAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private SchoolPerson teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private SchoolSection section;

    protected TeacherSectionAssignment() {
    }

    public TeacherSectionAssignment(SchoolPerson teacher, SchoolSection section) {
        this.teacher = teacher;
        this.section = section;
    }

    public SchoolPerson getTeacher() {
        return teacher;
    }

    public SchoolSection getSection() {
        return section;
    }
}
