package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface SchoolSectionRepository extends JpaRepository<SchoolSection, Long> {
    boolean existsBySchoolClass_IdAndNameIgnoreCase(Long classId, String name);

    boolean existsByIdAndSchoolClass_Id(Long sectionId, Long classId);

    Optional<SchoolSection> findBySchoolClass_IdAndNameIgnoreCase(Long classId, String name);

    boolean existsByClassTeacher_Account_UsernameAndId(String username, Long sectionId);

    @EntityGraph(attributePaths = {"schoolClass", "classTeacher"})
    List<SchoolSection> findAllByClassTeacher_Account_UsernameOrderBySchoolClass_NameAscNameAsc(
            String username);

    void deleteByIdAndSchoolClass_Id(Long sectionId, Long classId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select section from SchoolSection section where section.id = :sectionId")
    Optional<SchoolSection> findByIdForUpdate(@Param("sectionId") Long sectionId);
}
