package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface SchoolSectionRepository extends JpaRepository<SchoolSection, Long> {
    boolean existsBySchoolClass_IdAndNameIgnoreCase(Long classId, String name);

    boolean existsByIdAndSchoolClass_Id(Long sectionId, Long classId);

    void deleteByIdAndSchoolClass_Id(Long sectionId, Long classId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select section from SchoolSection section where section.id = :sectionId")
    Optional<SchoolSection> findByIdForUpdate(@Param("sectionId") Long sectionId);
}
