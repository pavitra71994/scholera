package com.schoolmanagement.repository;

import com.schoolmanagement.model.SchoolExamDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolExamDefinitionRepository extends JpaRepository<SchoolExamDefinition, Long> {
    List<SchoolExamDefinition> findAllByOrderByAcademicYearDescNameAsc();

    boolean existsByNameIgnoreCaseAndAcademicYear(String name, Integer academicYear);
}
