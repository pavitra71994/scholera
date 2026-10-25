package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeacherSectionAssignmentRepository extends JpaRepository<TeacherSectionAssignment, Long> {
    @EntityGraph(attributePaths = {"section", "section.schoolClass"})
    List<TeacherSectionAssignment> findAllByTeacher_Account_UsernameOrderBySection_SchoolClass_NameAscSection_NameAsc(
            String username);

    @EntityGraph(attributePaths = {"teacher"})
    List<TeacherSectionAssignment> findAllBySection_IdOrderByTeacher_FullNameAsc(Long sectionId);

    boolean existsByTeacher_Account_UsernameAndSection_Id(String username, Long sectionId);

    void deleteAllByTeacher_Id(Long teacherId);
}
