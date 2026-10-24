package com.schoolmanagement.school;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolSectionRepository extends JpaRepository<SchoolSection, Long> {
    boolean existsBySchoolClass_IdAndNameIgnoreCase(Long classId, String name);

    boolean existsByIdAndSchoolClass_Id(Long sectionId, Long classId);

    void deleteByIdAndSchoolClass_Id(Long sectionId, Long classId);
}
