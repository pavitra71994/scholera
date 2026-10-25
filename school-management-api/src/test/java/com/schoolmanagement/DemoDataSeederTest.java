package com.schoolmanagement;

import com.schoolmanagement.repository.AttendanceRecordRepository;
import com.schoolmanagement.repository.ExamMarkRepository;
import com.schoolmanagement.repository.SchoolClassRepository;
import com.schoolmanagement.repository.SchoolExamDefinitionRepository;
import com.schoolmanagement.repository.SchoolExamRepository;
import com.schoolmanagement.repository.SchoolExamSubjectRepository;
import com.schoolmanagement.repository.SchoolPersonRepository;
import com.schoolmanagement.repository.SchoolSectionRepository;
import com.schoolmanagement.repository.SchoolSectionSubjectRepository;
import com.schoolmanagement.security.AppUserRepository;
import com.schoolmanagement.security.Role;
import com.schoolmanagement.service.DemoDataSeeder;
import org.springframework.boot.DefaultApplicationArguments;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@TestPropertySource(properties = {
        "app.bootstrap-admin.username=demo-test-admin",
        "app.bootstrap-admin.password=demo-test-admin-password",
        "app.demo-data.enabled=true",
        "app.demo-data.student-password=demo-test-student-password",
        "spring.datasource.url=jdbc:h2:mem:demo_data_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class DemoDataSeederTest {
    @Autowired
    private AppUserRepository users;

    @Autowired
    private SchoolClassRepository classes;

    @Autowired
    private SchoolSectionRepository sections;

    @Autowired
    private SchoolPersonRepository people;

    @Autowired
    private AttendanceRecordRepository attendance;

    @Autowired
    private SchoolExamDefinitionRepository definitions;

    @Autowired
    private SchoolExamRepository exams;

    @Autowired
    private SchoolSectionSubjectRepository sectionSubjects;

    @Autowired
    private SchoolExamSubjectRepository examSubjects;

    @Autowired
    private ExamMarkRepository marks;

    @Autowired
    private DemoDataSeeder demoDataSeeder;

    @Test
    void seedsTheExpectedSchoolDemoDatasetAndDoesNotDuplicateIt() {
        demoDataSeeder.run(new DefaultApplicationArguments(new String[0]));
        assertEquals(151, users.count());
        assertEquals(1, users.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN)
                .count());
        assertEquals(5, classes.count());
        assertEquals(15, sections.count());
        assertEquals(150, people.count());
        assertEquals(1_500, attendance.count());
        assertEquals(5, definitions.count());
        assertEquals(75, exams.count());
        assertEquals(75, sectionSubjects.count());
        assertEquals(375, examSubjects.count());
        assertEquals(3_750, marks.count());
    }
}
