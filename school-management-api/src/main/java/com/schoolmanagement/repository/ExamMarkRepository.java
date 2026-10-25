package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ExamMarkRepository extends JpaRepository<ExamMark, Long> {
    List<ExamMark> findAllByExamSubject_Id(Long examSubjectId);

    void deleteAllByExamSubject_Exam_Section_Id(Long sectionId);

    void deleteAllByExamSubject_Exam_Id(Long examId);

    void deleteAllByExamSubject_Id(Long examSubjectId);

    @EntityGraph(attributePaths = {"examSubject", "examSubject.exam", "examSubject.sectionSubject", "student"})
    List<ExamMark> findAllByExamSubject_Exam_Section_IdOrderByExamSubject_Exam_AcademicYearDescExamSubject_Exam_NameAscExamSubject_SectionSubject_SubjectAscStudent_FullNameAsc(
            Long sectionId);

    Optional<ExamMark> findByExamSubject_IdAndStudent_Id(Long examSubjectId, Long studentId);

    @EntityGraph(attributePaths = {"examSubject", "examSubject.exam", "examSubject.exam.section", "examSubject.exam.section.schoolClass", "examSubject.sectionSubject"})
    List<ExamMark> findAllByStudent_IdOrderByExamSubject_Exam_AcademicYearDescExamSubject_Exam_NameAscExamSubject_SectionSubject_SubjectAscIdAsc(
            Long studentId);

    @Query("""
            select student.id as studentId, sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            where exam.id = :examId
            group by student.id
            order by sum(mark.obtainedMarks) desc, student.id asc
            """)
    List<ExamResultTotal> findAllExamTotals(Long examId);

    @Query("""
            select student.id as studentId, sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            where schoolClass.id = :classId
              and exam.academicYear = :academicYear
              and exam.name = :examName
            group by student.id
            order by sum(mark.obtainedMarks) desc, student.id asc
            """)
    List<ExamResultTotal> findAllClassExamTotals(Long classId, Integer academicYear, String examName);

    @Query("""
            select student.id as studentId, sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            join exam.section section
            where section.id = :sectionId
              and exam.academicYear = :academicYear
            group by student.id
            order by sum(mark.obtainedMarks) desc, student.id asc
            """)
    List<ExamResultTotal> findAllSectionYearTotals(Long sectionId, Integer academicYear);

    @Query("""
            select student.id as studentId, sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            where schoolClass.id = :classId
              and exam.academicYear = :academicYear
            group by student.id
            order by sum(mark.obtainedMarks) desc, student.id asc
            """)
    List<ExamResultTotal> findAllClassYearTotals(Long classId, Integer academicYear);

    @Query("""
            select student.id as studentId, student.fullName as studentName,
                   schoolClass.id as classId, schoolClass.name as className, exam.academicYear as academicYear,
                   sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            group by student.id, student.fullName, schoolClass.id, schoolClass.name, exam.academicYear
            order by schoolClass.name asc, exam.academicYear desc, sum(mark.obtainedMarks) desc, student.fullName asc
            """)
    List<LeaderboardTotal> findAllClassTotals();

    @Query("""
            select student.id as studentId, student.fullName as studentName,
                   schoolClass.name as className, section.id as sectionId, section.name as sectionName,
                   exam.academicYear as academicYear,
                   sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            group by student.id, student.fullName, schoolClass.name, section.id, section.name, exam.academicYear
            order by schoolClass.name asc, section.name asc, exam.academicYear desc, sum(mark.obtainedMarks) desc, student.fullName asc
            """)
    List<SectionLeaderboardTotal> findAllSectionTotals();

    @Query("""
            select student.id as studentId, student.fullName as studentName,
                   schoolClass.id as classId, schoolClass.name as className, sectionSubject.subject as subject,
                   exam.academicYear as academicYear,
                   sum(mark.obtainedMarks) as totalMarks
            from ExamMark mark
            join mark.student student
            join mark.examSubject examSubject
            join examSubject.exam exam
            join exam.section section
            join section.schoolClass schoolClass
            join examSubject.sectionSubject sectionSubject
            group by student.id, student.fullName, schoolClass.id, schoolClass.name, sectionSubject.subject, exam.academicYear
            order by schoolClass.name asc, exam.academicYear desc, sectionSubject.subject asc, sum(mark.obtainedMarks) desc, student.fullName asc
            """)
    List<SubjectLeaderboardTotal> findAllClassSubjectTotals();

    interface LeaderboardTotal {
        Long getStudentId();
        String getStudentName();
        Long getClassId();
        String getClassName();
        Integer getAcademicYear();
        BigDecimal getTotalMarks();
    }

    interface ExamResultTotal {
        Long getStudentId();
        BigDecimal getTotalMarks();
    }

    interface SectionLeaderboardTotal {
        Long getStudentId();
        String getStudentName();
        String getClassName();
        Long getSectionId();
        String getSectionName();
        Integer getAcademicYear();
        BigDecimal getTotalMarks();
    }

    interface SubjectLeaderboardTotal {
        Long getStudentId();
        String getStudentName();
        Long getClassId();
        String getClassName();
        String getSubject();
        Integer getAcademicYear();
        BigDecimal getTotalMarks();
    }
}
