package com.schoolmanagement.model;

import com.schoolmanagement.security.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "teacher_salary", precision = 10, scale = 2)
    private BigDecimal teacherSalary;

    @Column(name = "teacher_degree", length = 160)
    private String teacherDegree;

    @ElementCollection
    @CollectionTable(
            name = "teacher_subject_expertise",
            joinColumns = @JoinColumn(name = "teacher_id"))
    @Column(name = "subject", nullable = false, length = 100)
    private List<String> subjectExpertise = new ArrayList<>();

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

    public BigDecimal getTeacherSalary() {
        return teacherSalary;
    }

    public String getTeacherDegree() {
        return teacherDegree;
    }

    public List<String> getSubjectExpertise() {
        return subjectExpertise;
    }

    public SchoolSection getSection() {
        return section;
    }

    public void updateStudentEmergencyContact(String emergencyContact) {
        this.emergencyContact = emergencyContact;
    }

    public void updateStudentDetails(
            String fullName,
            LocalDate dateOfBirth,
            String motherName,
            String fatherName,
            String emergencyContact,
            SchoolSection section,
            Integer rollNumber) {
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
        this.motherName = motherName;
        this.fatherName = fatherName;
        this.emergencyContact = emergencyContact;
        this.section = section;
        this.rollNumber = rollNumber;
    }

    public void updateTeacherEditableDetails(String fullName, String phone) {
        this.fullName = fullName;
        this.teacherPhone = phone;
    }

    public void updateTeacherEmploymentDetails(
            BigDecimal salary,
            String degree,
            List<String> subjectExpertise) {
        this.teacherSalary = salary;
        this.teacherDegree = degree;
        this.subjectExpertise.clear();
        this.subjectExpertise.addAll(subjectExpertise);
    }
}
