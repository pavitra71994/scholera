package com.schoolmanagement.repository;

import com.schoolmanagement.model.SchoolExamSubject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchoolExamSubjectRepository extends JpaRepository<SchoolExamSubject, Long> {
    List<SchoolExamSubject> findAllByExam_IdOrderBySectionSubject_SubjectAsc(Long examId);

    void deleteAllByExam_Section_Id(Long sectionId);

    Optional<SchoolExamSubject> findByIdAndExam_Id(Long subjectId, Long examId);

    Optional<SchoolExamSubject> findByExam_IdAndSectionSubject_Id(Long examId, Long sectionSubjectId);

    boolean existsByExam_IdAndSectionSubject_SubjectIgnoreCase(Long examId, String subject);
}
