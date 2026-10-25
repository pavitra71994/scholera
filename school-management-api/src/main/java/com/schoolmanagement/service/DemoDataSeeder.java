package com.schoolmanagement.service;

import com.schoolmanagement.model.AttendanceRecord;
import com.schoolmanagement.model.AttendanceStatus;
import com.schoolmanagement.model.ExamMark;
import com.schoolmanagement.model.SchoolClass;
import com.schoolmanagement.model.SchoolExam;
import com.schoolmanagement.model.SchoolExamDefinition;
import com.schoolmanagement.model.SchoolExamSubject;
import com.schoolmanagement.model.SchoolPerson;
import com.schoolmanagement.model.SchoolSection;
import com.schoolmanagement.model.SchoolSectionSubject;
import com.schoolmanagement.repository.AttendanceRecordRepository;
import com.schoolmanagement.repository.ExamMarkRepository;
import com.schoolmanagement.repository.SchoolClassRepository;
import com.schoolmanagement.repository.SchoolExamDefinitionRepository;
import com.schoolmanagement.repository.SchoolExamRepository;
import com.schoolmanagement.repository.SchoolExamSubjectRepository;
import com.schoolmanagement.repository.SchoolPersonRepository;
import com.schoolmanagement.repository.SchoolSectionRepository;
import com.schoolmanagement.repository.SchoolSectionSubjectRepository;
import com.schoolmanagement.security.AppUser;
import com.schoolmanagement.security.AppUserRepository;
import com.schoolmanagement.security.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
    private static final String[] SECTION_NAMES = {"A", "B", "C"};
    private static final String[] EXAM_NAMES = {"Term 1", "Term 2", "Term 3", "Mid Year", "Final Year"};
    private static final String[] SUBJECT_NAMES = {"Hindi", "English", "Science", "Maths", "Social Studies"};
    private static final AttendanceStatus[] ATTENDANCE_STATUSES = AttendanceStatus.values();
    private static final int STUDENTS_PER_SECTION = 10;
    private static final int ATTENDANCE_DAYS = 10;
    private static final long RANDOM_SEED = 20261025L;
    private static final String FIRST_STUDENT_USERNAME = "demo-class-1-a-student-01";

    private final SchoolClassRepository classes;
    private final SchoolSectionRepository sections;
    private final AppUserRepository users;
    private final SchoolPersonRepository people;
    private final AttendanceRecordRepository attendance;
    private final SchoolExamDefinitionRepository definitions;
    private final SchoolExamRepository exams;
    private final SchoolSectionSubjectRepository sectionSubjects;
    private final SchoolExamSubjectRepository examSubjects;
    private final ExamMarkRepository marks;
    private final SchoolExamProvisioningService examProvisioning;
    private final PasswordEncoder passwordEncoder;
    private final String studentPassword;

    public DemoDataSeeder(
            SchoolClassRepository classes,
            SchoolSectionRepository sections,
            AppUserRepository users,
            SchoolPersonRepository people,
            AttendanceRecordRepository attendance,
            SchoolExamDefinitionRepository definitions,
            SchoolExamRepository exams,
            SchoolSectionSubjectRepository sectionSubjects,
            SchoolExamSubjectRepository examSubjects,
            ExamMarkRepository marks,
            SchoolExamProvisioningService examProvisioning,
            PasswordEncoder passwordEncoder,
            @Value("${app.demo-data.student-password:}") String studentPassword) {
        this.classes = classes;
        this.sections = sections;
        this.users = users;
        this.people = people;
        this.attendance = attendance;
        this.definitions = definitions;
        this.exams = exams;
        this.sectionSubjects = sectionSubjects;
        this.examSubjects = examSubjects;
        this.marks = marks;
        this.examProvisioning = examProvisioning;
        this.passwordEncoder = passwordEncoder;
        this.studentPassword = studentPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (studentPassword.isBlank()) {
            throw new IllegalStateException(
                    "Set APP_DEMO_STUDENT_PASSWORD when APP_DEMO_DATA_ENABLED=true.");
        }
        if (users.findByUsername(FIRST_STUDENT_USERNAME).isPresent()) {
            return;
        }
        if (classes.count() != 0) {
            throw new IllegalStateException(
                    "Demo data can only be seeded when the school has no classes. Use a fresh database.");
        }

        Random random = new Random(RANDOM_SEED);
        List<SchoolSection> allSections = new ArrayList<>();
        List<SchoolPerson> allStudents = new ArrayList<>();
        String encodedStudentPassword = passwordEncoder.encode(studentPassword);

        for (int classNumber = 1; classNumber <= 5; classNumber++) {
            SchoolClass schoolClass = classes.save(new SchoolClass("Class " + classNumber));
            for (String sectionName : SECTION_NAMES) {
                SchoolSection section = sections.save(new SchoolSection(schoolClass, sectionName));
                allSections.add(section);
                for (int rollNumber = 1; rollNumber <= STUDENTS_PER_SECTION; rollNumber++) {
                    String username = studentUsername(classNumber, sectionName, rollNumber);
                    AppUser account = users.save(new AppUser(
                            username, encodedStudentPassword, Role.STUDENT));
                    SchoolPerson student = people.save(new SchoolPerson(
                            account,
                            String.format("Student %02d - Class %d%s", rollNumber, classNumber, sectionName),
                            section,
                            LocalDate.of(2010 + classNumber, (rollNumber % 12) + 1, (rollNumber % 27) + 1),
                            "Parent " + rollNumber,
                            "Guardian " + rollNumber,
                            null,
                            rollNumber));
                    allStudents.add(student);
                }
            }
        }

        int academicYear = Year.now().getValue();
        List<SchoolExamDefinition> schoolExams = new ArrayList<>();
        for (String examName : EXAM_NAMES) {
            schoolExams.add(definitions.save(new SchoolExamDefinition(examName, academicYear)));
        }
        schoolExams.forEach(examProvisioning::provisionDefinitionForAllSections);

        for (SchoolSection section : allSections) {
            for (String subjectName : SUBJECT_NAMES) {
                SchoolSectionSubject subject = sectionSubjects.save(new SchoolSectionSubject(
                        section, subjectName, BigDecimal.valueOf(100)));
                examProvisioning.addSectionSubjectToExistingExams(
                        subject, exams.findAllBySection_Id(section.getId()));
            }

            List<SchoolPerson> sectionStudents = allStudents.stream()
                    .filter(student -> student.getSection().getId().equals(section.getId()))
                    .toList();
            for (SchoolExam exam : exams.findAllBySection_Id(section.getId())) {
                List<SchoolExamSubject> subjectsForExam =
                        examSubjects.findAllByExam_IdOrderBySectionSubject_SubjectAsc(exam.getId());
                for (SchoolExamSubject examSubject : subjectsForExam) {
                    for (SchoolPerson student : sectionStudents) {
                        int score = 35 + random.nextInt(66);
                        marks.save(new ExamMark(
                                examSubject, student, BigDecimal.valueOf(score).setScale(2)));
                    }
                }
            }
        }

        LocalDate today = LocalDate.now();
        for (SchoolPerson student : allStudents) {
            for (int daysAgo = 1; daysAgo <= ATTENDANCE_DAYS; daysAgo++) {
                attendance.save(new AttendanceRecord(
                        student,
                        today.minusDays(daysAgo),
                        ATTENDANCE_STATUSES[random.nextInt(ATTENDANCE_STATUSES.length)]));
            }
        }
    }

    private String studentUsername(int classNumber, String sectionName, int rollNumber) {
        return String.format("demo-class-%d-%s-student-%02d",
                classNumber, sectionName.toLowerCase(), rollNumber);
    }
}
