package com.schoolmanagement.school;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolExamRepository extends JpaRepository<SchoolExam, Long> {
    List<SchoolExam> findAllBySection_IdOrderByNameAscSubjectAsc(Long sectionId);
}
