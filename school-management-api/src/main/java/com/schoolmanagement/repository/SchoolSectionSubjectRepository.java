package com.schoolmanagement.repository;

import com.schoolmanagement.model.SchoolSectionSubject;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchoolSectionSubjectRepository extends JpaRepository<SchoolSectionSubject, Long> {
    List<SchoolSectionSubject> findAllBySection_IdOrderBySubjectAsc(Long sectionId);

    List<SchoolSectionSubject> findAllByTeacher_IdOrderBySubjectAsc(Long teacherId);

    boolean existsBySection_IdAndSubjectIgnoreCase(Long sectionId, String subject);

    Optional<SchoolSectionSubject> findBySection_IdAndSubjectIgnoreCase(Long sectionId, String subject);

    Optional<SchoolSectionSubject> findByIdAndSection_Id(Long id, Long sectionId);

    boolean existsByTeacher_Account_UsernameAndSection_Id(String username, Long sectionId);

    boolean existsByTeacher_Account_UsernameAndSection_IdAndSubjectIgnoreCase(
            String username, Long sectionId, String subject);

    @EntityGraph(attributePaths = {"section", "section.schoolClass"})
    List<SchoolSectionSubject> findAllByTeacher_Account_UsernameOrderBySection_SchoolClass_NameAscSection_NameAscSubjectAsc(
            String username);
}
