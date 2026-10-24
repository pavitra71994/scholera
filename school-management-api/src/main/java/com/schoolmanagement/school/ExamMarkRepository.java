package com.schoolmanagement.school;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamMarkRepository extends JpaRepository<ExamMark, Long> {
    List<ExamMark> findAllByExam_Id(Long examId);

    Optional<ExamMark> findByExam_IdAndStudent_Id(Long examId, Long studentId);
}
