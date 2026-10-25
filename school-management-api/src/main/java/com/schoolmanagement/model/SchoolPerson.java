package com.schoolmanagement.model;

import com.schoolmanagement.security.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "school_person")
public class SchoolPerson {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "app_user_id", nullable = false, unique = true)
    private AppUser account;

    @Column(nullable = false, length = 160)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "mother_name", length = 160)
    private String motherName;

    @Column(name = "father_name", length = 160)
    private String fatherName;

    @Column(name = "emergency_contact", length = 40)
    private String emergencyContact;

    @Column(name = "roll_number")
    private Integer rollNumber;

    @Column(name = "teacher_phone", length = 40)
    private String teacherPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private SchoolSection section;

    protected SchoolPerson() {
    }

    public SchoolPerson(
            AppUser account,
            String fullName,
            SchoolSection section,
            LocalDate dateOfBirth,
            String motherName,
            String fatherName,
            String emergencyContact,
            Integer rollNumber) {
        this.account = account;
        this.fullName = fullName;
        this.section = section;
        this.dateOfBirth = dateOfBirth;
        this.motherName = motherName;
        this.fatherName = fatherName;
        this.emergencyContact = emergencyContact;
        this.rollNumber = rollNumber;
    }

    public Long getId() {
        return id;
    }

    public AppUser getAccount() {
        return account;
    }

    public String getFullName() {
        return fullName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public String getMotherName() {
        return motherName;
    }

    public String getFatherName() {
        return fatherName;
    }

    public String getEmergencyContact() {
        return emergencyContact;
    }

    public Integer getRollNumber() {
        return rollNumber;
    }

    public String getTeacherPhone() {
        return teacherPhone;
    }

    public SchoolSection getSection() {
        return section;
    }

    public void updateStudentEmergencyContact(String emergencyContact) {
        this.emergencyContact = emergencyContact;
    }

    public void updateTeacherEditableDetails(String fullName, String phone) {
        this.fullName = fullName;
        this.teacherPhone = phone;
    }
}
