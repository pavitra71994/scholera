package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchoolExamRepository extends JpaRepository<SchoolExam, Long> {
    List<SchoolExam> findAllBySection_IdOrderByAcademicYearDescNameAsc(Long sectionId);

    List<SchoolExam> findAllBySection_Id(Long sectionId);

    List<SchoolExam> findAllByDefinition_Id(Long definitionId);

    void deleteAllBySection_Id(Long sectionId);

    List<SchoolExam> findAllBySection_SchoolClass_IdOrderByAcademicYearDescNameAsc(Long classId);

    Optional<SchoolExam> findBySection_IdAndDefinition_Id(Long sectionId, Long definitionId);

    boolean existsBySection_IdAndNameIgnoreCaseAndAcademicYear(Long sectionId, String name, Integer academicYear);
}
