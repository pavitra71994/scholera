package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import com.schoolmanagement.security.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SchoolPersonRepository extends JpaRepository<SchoolPerson, Long> {
    List<SchoolPerson> findAllByAccount_RoleOrderByFullName(Role role);

    List<SchoolPerson> findAllBySection_IdAndAccount_RoleOrderByFullName(Long sectionId, Role role);

    boolean existsByAccount_UsernameIgnoreCase(String username);

    Optional<SchoolPerson> findByAccount_Username(String username);

    @Query("select coalesce(max(person.rollNumber), 0) from SchoolPerson person where person.section.id = :sectionId")
    Integer findMaxRollNumberBySectionId(@Param("sectionId") Long sectionId);
}
