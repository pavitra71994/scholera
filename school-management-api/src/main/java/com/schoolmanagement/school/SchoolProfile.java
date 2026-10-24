package com.schoolmanagement.school;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "school_profile")
public class SchoolProfile {
    @Id
    private Short id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 80)
    private String timezone;

    protected SchoolProfile() {
    }

    public Short getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getTimezone() {
        return timezone;
    }

    public void update(String name, String timezone) {
        this.name = name;
        this.timezone = timezone;
    }
}
