package com.schoolmanagement;

import com.schoolmanagement.model.SchoolClass;
import com.schoolmanagement.model.SchoolSection;
import com.schoolmanagement.repository.AttendanceRecordRepository;
import com.schoolmanagement.repository.ExamMarkRepository;
import com.schoolmanagement.repository.SchoolClassRepository;
import com.schoolmanagement.repository.SchoolExamRepository;
import com.schoolmanagement.repository.SchoolExamSubjectRepository;
import com.schoolmanagement.repository.SchoolPersonRepository;
import com.schoolmanagement.repository.SchoolSectionRepository;
import com.schoolmanagement.repository.SchoolSectionSubjectRepository;
import com.schoolmanagement.security.AppUserRepository;
import com.schoolmanagement.security.Role;
import com.schoolmanagement.service.SchoolDemoDataSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:school_demo_seed_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "app.demo-data.full-seed-enabled=true",
        "app.demo-data.target=demo",
        "app.demo-data.academic-year=2026",
        "app.demo-data.attendance.days=1"
})
@ActiveProfiles({"demo-seed", "test"})
class SchoolDemoDataSeederIntegrationTest {
    @Autowired
    private SchoolDemoDataSeeder seeder;

    @Autowired
    private SchoolClassRepository classes;

    @Autowired
    private SchoolSectionRepository sections;

    @Autowired
    private SchoolPersonRepository people;

    @Autowired
    private SchoolSectionSubjectRepository sectionSubjects;

    @Autowired
    private SchoolExamRepository exams;

    @Autowired
    private SchoolExamSubjectRepository examSubjects;

    @Autowired
    private ExamMarkRepository marks;

    @Autowired
    private AttendanceRecordRepository attendance;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @Transactional
    void seedsTheCompleteDatasetWithMatchingAccountsAndIsIdempotent() {
        var classList = classes.findAllWithSections();
        var teacherList = people.findAllByAccount_RoleOrderByFullName(Role.TEACHER);
        var studentList = people.findAllByAccount_RoleOrderByFullName(Role.STUDENT);

        assertEquals(12, classList.size());
        assertEquals(50, teacherList.size());
        assertEquals(36, sections.count());
        assertTrue(studentList.size() >= 36 * 40);
        assertTrue(studentList.size() <= 36 * 50);
        assertTrue(passwordEncoder.matches(
                teacherList.get(0).getAccount().getUsername(),
                teacherList.get(0).getAccount().getPassword()));

        for (SchoolClass schoolClass : classList) {
            assertEquals(3, schoolClass.getSections().size());
            for (SchoolSection section : schoolClass.getSections()) {
                assertNotNull(section.getClassTeacher());
                var sectionStudents = people.findAllBySection_IdAndAccount_RoleOrderByFullName(
                        section.getId(), Role.STUDENT);
                assertTrue(sectionStudents.size() >= 40 && sectionStudents.size() <= 50);
                var assignments = sectionSubjects.findAllBySection_IdOrderBySubjectAsc(section.getId());
                assertTrue(assignments.stream().allMatch(subject -> subject.getTeacher() != null
                        && subject.getTeacher().getSubjectExpertise().stream()
                                .anyMatch(expertise -> expertise.equalsIgnoreCase(subject.getSubject()))));

                var sectionExams = exams.findAllBySection_Id(section.getId());
                assertEquals(4, sectionExams.size());
                for (var exam : sectionExams) {
                    var subjects = examSubjects.findAllByExam_IdOrderBySectionSubject_SubjectAsc(exam.getId());
                    assertEquals(assignments.size(), subjects.size());
                    for (var examSubject : subjects) {
                        var subjectMarks = marks.findAllByExamSubject_Id(examSubject.getId());
                        assertEquals(sectionStudents.size(), subjectMarks.size());
                        assertTrue(subjectMarks.stream().allMatch(mark ->
                                mark.getObtainedMarks().compareTo(examSubject.getMaximumMarks()) <= 0));
                    }
                }
                assertEquals(sectionStudents.size(),
                        attendance.findAllByStudent_Section_IdOrderByAttendanceDateDescIdDesc(section.getId()).size());
            }
        }

        long userCount = users.count();
        long attendanceCount = attendance.count();
        long markCount = marks.count();
        long examCount = exams.count();
        seeder.run(new DefaultApplicationArguments(new String[0]));

        assertEquals(userCount, users.count());
        assertEquals(attendanceCount, attendance.count());
        assertEquals(markCount, marks.count());
        assertEquals(examCount, exams.count());
    }
}
