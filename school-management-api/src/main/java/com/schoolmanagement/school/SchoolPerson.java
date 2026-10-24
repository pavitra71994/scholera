package com.schoolmanagement.school;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private SchoolSection section;

    protected SchoolPerson() {
    }

    public SchoolPerson(AppUser account, String fullName, SchoolSection section) {
        this.account = account;
        this.fullName = fullName;
        this.section = section;
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

    public SchoolSection getSection() {
        return section;
    }
}
