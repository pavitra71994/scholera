package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ExamMarkRepository extends JpaRepository<ExamMark, Long> {
    List<ExamMark> findAllByExam_Id(Long examId);

    @EntityGraph(attributePaths = {"exam", "student"})
    List<ExamMark> findAllByExam_Section_IdOrderByExam_NameAscExam_SubjectAscStudent_FullNameAsc(Long sectionId);

    Optional<ExamMark> findByExam_IdAndStudent_Id(Long examId, Long studentId);

    @EntityGraph(attributePaths = {"exam", "exam.section", "exam.section.schoolClass"})
    List<ExamMark> findAllByStudent_IdOrderByExam_NameAscExam_SubjectAscIdAsc(Long studentId);

    @Query("""
            select student.id as studentId, student.fullName as studentName,
                   schoolClass.name as className, sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            where schoolClass.id = :classId
            group by student.id, student.fullName, schoolClass.name
            order by sum(mark.obtainedMarks) desc, student.fullName asc
            """)
    List<LeaderboardTotal> findClassTotals(@Param("classId") Long classId);

    @Query("""
            select student.id as studentId, student.fullName as studentName,
                   section.name as sectionName, sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.exam exam
            join exam.section section
            where section.id = :sectionId
            group by student.id, student.fullName, section.name
            order by sum(mark.obtainedMarks) desc, student.fullName asc
            """)
    List<SectionLeaderboardTotal> findSectionTotals(@Param("sectionId") Long sectionId);

    @Query("""
            select student.id as studentId, student.fullName as studentName,
                   schoolClass.name as className, exam.subject as subject,
                   sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            where schoolClass.id = :classId
            group by student.id, student.fullName, schoolClass.name, exam.subject
            order by exam.subject asc, sum(mark.obtainedMarks) desc, student.fullName asc
            """)
    List<SubjectLeaderboardTotal> findClassSubjectTotals(@Param("classId") Long classId);

    interface LeaderboardTotal {
        Long getStudentId();
        String getStudentName();
        String getClassName();
        BigDecimal getTotalMarks();
    }

    interface SectionLeaderboardTotal {
        Long getStudentId();
        String getStudentName();
        String getSectionName();
        BigDecimal getTotalMarks();
    }

    interface SubjectLeaderboardTotal {
        Long getStudentId();
        String getStudentName();
        String getClassName();
        String getSubject();
        BigDecimal getTotalMarks();
    }
}
