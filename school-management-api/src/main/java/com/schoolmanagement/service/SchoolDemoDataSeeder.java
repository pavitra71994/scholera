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
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Profile("demo-seed")
@ConditionalOnProperty(name = "app.demo-data.full-seed-enabled", havingValue = "true")
public class SchoolDemoDataSeeder implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(SchoolDemoDataSeeder.class);
    private static final long RANDOM_SEED = 20261025L;
    private static final int TEACHER_COUNT = 50;
    private static final int MIN_STUDENTS_PER_SECTION = 40;
    private static final int MAX_STUDENTS_PER_SECTION = 50;
    private static final int BATCH_SIZE = 500;
    private static final List<String> SECTIONS = List.of("A", "B", "C");
    private static final List<String> EXAMS = List.of("Unit Test 1", "Mid-Term", "Unit Test 2", "Final Examination");
    private static final List<String> SUBJECT_CATALOG = List.of(
            "English", "Hindi", "Mathematics", "EVS", "Computer Science", "Science",
            "Social Science", "Sanskrit", "Physics", "Chemistry", "Biology", "History",
            "Geography", "Political Science", "Accountancy", "Business Studies", "Economics",
            "Entrepreneurship", "Sociology");
    private static final List<String> TEACHER_FIRST_NAMES = List.of(
            "Aarav", "Aditi", "Akash", "Ananya", "Arjun", "Bhavna", "Chirag", "Deepa", "Dev", "Diya",
            "Farhan", "Gauri", "Harsh", "Isha", "Jatin", "Kavya", "Kiran", "Lakshmi", "Manav", "Meera",
            "Mihir", "Nandini", "Neel", "Nisha", "Om", "Pallavi", "Pranav", "Rhea", "Rohan", "Saanvi",
            "Sahil", "Shreya", "Tanmay", "Tara", "Uday", "Vaishnavi", "Varun", "Vidya", "Yash", "Zoya",
            "Abhay", "Amrita", "Bharat", "Charu", "Esha", "Gopal", "Irfan", "Jyoti", "Nikhil", "Pooja");
    private static final List<String> STUDENT_FIRST_NAMES = List.of(
            "Aarohi", "Aarush", "Aashi", "Aayush", "Aditya", "Ahana", "Akhil", "Amaya", "Aman", "Anika",
            "Anil", "Anvi", "Arnav", "Avani", "Bhavya", "Dhruv", "Eshan", "Gauri", "Ishaan", "Jiya",
            "Kabir", "Kashvi", "Krish", "Mahi", "Mira", "Nakul", "Navya", "Nikhil", "Pari", "Prisha",
            "Rahul", "Riya", "Rudra", "Sana", "Shaurya", "Siya", "Tanish", "Uma", "Ved", "Zara");
    private static final List<String> MIDDLE_NAMES = List.of(
            "Aarav", "Asha", "Dev", "Ish", "Jai", "Kiran", "Mohan", "Neel", "Om", "Raj",
            "Ravi", "Sai", "Shree", "Tej", "Vijay", "Anand", "Deep", "Har", "Nitya", "Pran");
    private static final List<String> SURNAMES = List.of(
            "Bose", "Chatterjee", "Das", "Desai", "Gupta", "Iyer", "Jain", "Joshi", "Kapoor", "Khan",
            "Kumar", "Mehta", "Menon", "Mishra", "Mukherjee", "Nair", "Naidu", "Patel", "Rao", "Reddy",
            "Saxena", "Shah", "Sharma", "Singh", "Sinha", "Thakur", "Varma", "Verma", "Yadav", "Kulkarni");
    private static final List<String> DEGREES = List.of("B.Ed.", "M.Ed.", "B.Sc., B.Ed.", "M.Sc., B.Ed.", "M.A., B.Ed.");

    private final SchoolClassRepository classes;
    private final SchoolSectionRepository sections;
    private final AppUserRepository users;
    private final SchoolPersonRepository people;
    private final AttendanceRecordRepository attendance;
    private final SchoolExamDefinitionRepository examDefinitions;
    private final SchoolExamRepository exams;
    private final SchoolSectionSubjectRepository sectionSubjects;
    private final SchoolExamSubjectRepository examSubjects;
    private final ExamMarkRepository marks;
    private final SchoolExamProvisioningService examProvisioning;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;
    private final Environment environment;
    private final DataSource dataSource;
    private final String target;
    private final String academicYearSetting;
    private final int attendanceDays;
    private final String attendanceStartDate;
    private final String attendanceEndDate;
    private final String schoolHolidays;

    public SchoolDemoDataSeeder(
            SchoolClassRepository classes,
            SchoolSectionRepository sections,
            AppUserRepository users,
            SchoolPersonRepository people,
            AttendanceRecordRepository attendance,
            SchoolExamDefinitionRepository examDefinitions,
            SchoolExamRepository exams,
            SchoolSectionSubjectRepository sectionSubjects,
            SchoolExamSubjectRepository examSubjects,
            ExamMarkRepository marks,
            SchoolExamProvisioningService examProvisioning,
            PasswordEncoder passwordEncoder,
            EntityManager entityManager,
            Environment environment,
            DataSource dataSource,
            @Value("${app.demo-data.target:}") String target,
            @Value("${app.demo-data.academic-year:}") String academicYearSetting,
            @Value("${app.demo-data.attendance.days:30}") int attendanceDays,
            @Value("${app.demo-data.attendance.start-date:}") String attendanceStartDate,
            @Value("${app.demo-data.attendance.end-date:}") String attendanceEndDate,
            @Value("${app.demo-data.attendance.school-holidays:}") String schoolHolidays) {
        this.classes = classes;
        this.sections = sections;
        this.users = users;
        this.people = people;
        this.attendance = attendance;
        this.examDefinitions = examDefinitions;
        this.exams = exams;
        this.sectionSubjects = sectionSubjects;
        this.examSubjects = examSubjects;
        this.marks = marks;
        this.examProvisioning = examProvisioning;
        this.passwordEncoder = passwordEncoder;
        this.entityManager = entityManager;
        this.environment = environment;
        this.dataSource = dataSource;
        this.target = target;
        this.academicYearSetting = academicYearSetting;
        this.attendanceDays = attendanceDays;
        this.attendanceStartDate = attendanceStartDate;
        this.attendanceEndDate = attendanceEndDate;
        this.schoolHolidays = schoolHolidays;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        verifyDemoDatabase();
        SeedReport report = seed();
        logger.info("School demo seed completed: {}", report);
    }

    private SeedReport seed() {
        attendanceBuffer.clear();
        marksBuffer.clear();
        int academicYear = academicYearSetting.isBlank()
                ? Year.now().getValue()
                : Integer.parseInt(academicYearSetting);
        Random random = new Random(RANDOM_SEED);
        List<LocalDate> schoolDays = attendanceDates();
        List<SchoolSection> seedSections = new ArrayList<>(36);
        Map<Long, Integer> classNumberBySection = new HashMap<>();
        Map<Long, Integer> sectionIndexBySection = new HashMap<>();
        Map<String, List<SchoolPerson>> expertsBySubject = createTeachers();
        Map<Long, List<SchoolPerson>> studentsBySection = new LinkedHashMap<>();
        int createdStudents = 0;
        int createdAttendance = 0;
        int createdMarks = 0;
        int attendanceRecordCount = 0;
        int markCount = 0;
        int subjectTeacherAssignments = 0;
        int classTeacherAssignments = 0;

        for (int classNumber = 1; classNumber <= 12; classNumber++) {
            String className = "Class " + classNumber;
            SchoolClass schoolClass = classes.findByNameIgnoreCase(className)
                    .orElseGet(() -> classes.save(new SchoolClass(className)));
            for (int sectionIndex = 0; sectionIndex < SECTIONS.size(); sectionIndex++) {
                String sectionName = SECTIONS.get(sectionIndex);
                SchoolSection section = sections.findBySchoolClass_IdAndNameIgnoreCase(
                                schoolClass.getId(), sectionName)
                        .orElseGet(() -> sections.save(new SchoolSection(schoolClass, sectionName)));
                seedSections.add(section);
                classNumberBySection.put(section.getId(), classNumber);
                sectionIndexBySection.put(section.getId(), sectionIndex);

                if (section.getClassTeacher() == null) {
                    section.assignClassTeacher(teacherForIndex((classNumber - 1) * SECTIONS.size() + sectionIndex));
                } else if (section.getClassTeacher().getAccount().getRole() != Role.TEACHER) {
                    throw new IllegalStateException(
                            "Section " + classNumber + sectionName + " has a non-teacher class teacher.");
                }
                classTeacherAssignments++;

                List<String> subjects = subjectsFor(classNumber, sectionIndex);
                Map<String, SchoolSectionSubject> subjectRecords = ensureSectionSubjects(section, subjects);
                for (String subject : subjects) {
                    SchoolSectionSubject subjectRecord = subjectRecords.get(subject);
                    if (subjectRecord.getTeacher() == null) {
                        SchoolPerson teacher = chooseExpert(expertsBySubject.get(subject), random);
                        subjectRecord.assignTeacher(teacher);
                    } else if (subjectRecord.getTeacher().getSubjectExpertise().stream()
                            .noneMatch(expertise -> expertise.equalsIgnoreCase(subject))) {
                        throw new IllegalStateException(
                                "Existing subject teacher does not have expertise in " + subject + ".");
                    }
                    subjectTeacherAssignments++;
                }

                List<SchoolPerson> students = people.findAllBySection_IdAndAccount_RoleOrderByFullName(
                        section.getId(), Role.STUDENT);
                int targetCount = MIN_STUDENTS_PER_SECTION
                        + new Random(RANDOM_SEED + classNumber * 100L + sectionIndex).nextInt(11);
                if (students.size() > MAX_STUDENTS_PER_SECTION) {
                    throw new IllegalStateException("Section " + classNumber + sectionName
                            + " already has more than " + MAX_STUDENTS_PER_SECTION + " students.");
                }
                if (students.size() < targetCount) {
                    createdStudents += createStudents(
                            section,
                            classNumber,
                            sectionIndex,
                            students.size(),
                            people.findMaxRollNumberBySectionId(section.getId()),
                            academicYear,
                            targetCount);
                    students = people.findAllBySection_IdAndAccount_RoleOrderByFullName(
                            section.getId(), Role.STUDENT);
                }
                studentsBySection.put(section.getId(), students);
                if (students.size() < MIN_STUDENTS_PER_SECTION || students.size() > MAX_STUDENTS_PER_SECTION) {
                    throw new IllegalStateException("Section " + classNumber + sectionName
                            + " must contain between " + MIN_STUDENTS_PER_SECTION + " and "
                            + MAX_STUDENTS_PER_SECTION + " students after seeding.");
                }
            }
        }
        entityManager.flush();

        List<SchoolExamDefinition> definitions = ensureExamDefinitions(academicYear);
        Map<Long, List<SchoolExam>> examsBySection = new HashMap<>();
        for (SchoolSection section : seedSections) {
            List<SchoolExam> sectionExams = new ArrayList<>(definitions.size());
            for (SchoolExamDefinition definition : definitions) {
                SchoolExam exam = examProvisioning.provisionExam(section, definition);
                sectionExams.add(exam);
                for (SchoolSectionSubject sectionSubject :
                        sectionSubjects.findAllBySection_IdOrderBySubjectAsc(section.getId())) {
                    if (!examSubjects.existsByExam_IdAndSectionSubject_Id(exam.getId(), sectionSubject.getId())) {
                        examSubjects.save(new SchoolExamSubject(
                                exam, sectionSubject, sectionSubject.getDefaultMaximumMarks()));
                    }
                }
            }
            examsBySection.put(section.getId(), sectionExams);
        }

        for (SchoolSection section : seedSections) {
            int classNumber = classNumberBySection.get(section.getId());
            int sectionIndex = sectionIndexBySection.get(section.getId());
            List<SchoolPerson> students = studentsBySection.get(section.getId());
            Set<String> existingAttendanceKeys = attendance.findAllByStudent_Section_IdOrderByAttendanceDateDescIdDesc(
                            section.getId()).stream()
                    .map(record -> attendanceKey(record.getStudent().getId(), record.getAttendanceDate()))
                    .collect(Collectors.toCollection(HashSet::new));
            for (SchoolPerson student : students) {
                for (LocalDate date : schoolDays) {
                    if (existingAttendanceKeys.add(attendanceKey(student.getId(), date))) {
                        attendanceBuffer.add(new AttendanceRecord(student, date,
                                attendanceStatus(classNumber, sectionIndex, student.getRollNumber(), date)));
                        createdAttendance++;
                        flushAttendanceBufferIfFull();
                    }
                }
            }
            attendanceRecordCount += existingAttendanceKeys.size();

            for (SchoolExam exam : examsBySection.get(section.getId())) {
                for (SchoolExamSubject examSubject :
                        examSubjects.findAllByExam_IdOrderBySectionSubject_SubjectAsc(exam.getId())) {
                    String subjectName = examSubject.getSubject();
                    BigDecimal maximumMarks = examSubject.getMaximumMarks();
                    Set<Long> markedStudentIds = marks.findAllByExamSubject_Id(examSubject.getId()).stream()
                            .map(mark -> mark.getStudent().getId())
                            .collect(Collectors.toCollection(HashSet::new));
                    for (SchoolPerson student : students) {
                        if (markedStudentIds.add(student.getId())) {
                            marksBuffer.add(new ExamMark(
                                    examSubject,
                                    student,
                                    score(classNumber, sectionIndex, student.getRollNumber(),
                                            exam.getName(), subjectName, maximumMarks)));
                            createdMarks++;
                            flushMarksBufferIfFull();
                        }
                    }
                    markCount += markedStudentIds.size();
                }
            }
        }
        flushBuffers();

        int studentCount = studentsBySection.values().stream().mapToInt(List::size).sum();
        return new SeedReport(
                12,
                seedSections.size(),
                TEACHER_COUNT,
                studentCount,
                createdStudents,
                classTeacherAssignments,
                subjectTeacherAssignments,
                definitions.size(),
                seedSections.stream().mapToInt(section -> examsBySection.get(section.getId()).size()).sum(),
                attendanceRecordCount,
                markCount,
                createdAttendance,
                createdMarks,
                academicYear);
    }

    private final List<AttendanceRecord> attendanceBuffer = new ArrayList<>(BATCH_SIZE);
    private final List<ExamMark> marksBuffer = new ArrayList<>(BATCH_SIZE);

    private Map<String, List<SchoolPerson>> createTeachers() {
        Map<String, List<SchoolPerson>> teachersBySubject = new LinkedHashMap<>();
        SUBJECT_CATALOG.forEach(subject -> teachersBySubject.put(subject, new ArrayList<>()));
        Set<String> generatedUsernames = new HashSet<>();
        for (int index = 0; index < TEACHER_COUNT; index++) {
            String firstName = TEACHER_FIRST_NAMES.get(index);
            String middleName = MIDDLE_NAMES.get(index % MIDDLE_NAMES.size());
            String surname = SURNAMES.get((index * 7) % SURNAMES.size());
            String username = usernameFor(firstName, middleName, surname);
            if (!generatedUsernames.add(username)) {
                throw new IllegalStateException("Generated duplicate teacher username: " + username);
            }
            String fullName = firstName + " " + middleName + " " + surname;
            AppUser account = users.findByUsernameIgnoreCase(username).orElse(null);
            SchoolPerson teacher;
            boolean newTeacher = account == null;
            if (account != null) {
                teacher = people.findByAccount_Username(username)
                        .orElseThrow(() -> new IllegalStateException(
                                "Existing account conflicts with generated teacher username " + username + "."));
                if (!account.getUsername().equals(username)
                        || account.getRole() != Role.TEACHER
                        || !teacher.getFullName().equals(fullName)) {
                    throw new IllegalStateException(
                            "Existing account conflicts with generated teacher username " + username + ".");
                }
                List<String> requiredExpertise = expertiseForTeacher(index);
                if (teacher.getTeacherSalary() == null || teacher.getTeacherDegree() == null
                        || !teacher.getSubjectExpertise().containsAll(requiredExpertise)) {
                    throw new IllegalStateException(
                            "Existing generated teacher has incomplete employment details: " + username + ".");
                }
            } else {
                account = users.save(new AppUser(username, passwordEncoder.encode(username), Role.TEACHER));
                teacher = people.save(new SchoolPerson(
                        account, fullName, null, null, null, null, null, null));
            }
            List<String> expertise = expertiseForTeacher(index);
            if (newTeacher) {
                teacher.updateTeacherEmploymentDetails(
                        BigDecimal.valueOf(35000 + ((index * 1379) % 35001)).setScale(2),
                        DEGREES.get(index % DEGREES.size()),
                        expertise);
            }
            expertise.forEach(subject -> teachersBySubject.get(subject).add(teacher));
        }
        return teachersBySubject;
    }

    private SchoolPerson teacherForIndex(int index) {
        int teacherIndex = Math.floorMod(index, TEACHER_COUNT);
        String username = usernameFor(
                TEACHER_FIRST_NAMES.get(teacherIndex),
                MIDDLE_NAMES.get(teacherIndex % MIDDLE_NAMES.size()),
                SURNAMES.get((teacherIndex * 7) % SURNAMES.size()));
        return people.findByAccount_Username(username)
                .orElseThrow(() -> new IllegalStateException("Seeded teacher profile is missing: " + username));
    }

    private List<String> expertiseForTeacher(int teacherIndex) {
        int subjectIndex = teacherIndex % SUBJECT_CATALOG.size();
        List<String> result = new ArrayList<>();
        result.add(SUBJECT_CATALOG.get(subjectIndex));
        if (teacherIndex % 3 == 0) {
            result.add(SUBJECT_CATALOG.get((subjectIndex + 1) % SUBJECT_CATALOG.size()));
        }
        return result;
    }

    private Map<String, SchoolSectionSubject> ensureSectionSubjects(
            SchoolSection section, List<String> subjectNames) {
        Map<String, SchoolSectionSubject> result = new LinkedHashMap<>();
        for (String subjectName : subjectNames) {
            SchoolSectionSubject subject = sectionSubjects
                    .findBySection_IdAndSubjectIgnoreCase(section.getId(), subjectName)
                    .orElseGet(() -> sectionSubjects.save(new SchoolSectionSubject(
                            section, subjectName, BigDecimal.valueOf(100))));
            result.put(subjectName, subject);
        }
        return result;
    }

    private SchoolPerson chooseExpert(List<SchoolPerson> experts, Random random) {
        if (experts == null || experts.isEmpty()) {
            throw new IllegalStateException("No seeded teacher has the required subject expertise.");
        }
        return experts.get(random.nextInt(experts.size()));
    }

    private int createStudents(
            SchoolSection section,
            int classNumber,
            int sectionIndex,
            int currentCount,
            int maxRollNumber,
            int academicYear,
            int targetCount) {
        int created = 0;
        for (int studentIndex = currentCount + 1; studentIndex <= targetCount; studentIndex++) {
            int rollNumber = ++maxRollNumber;
            int ordinal = classNumber * 1000 + sectionIndex * 100 + rollNumber;
            String firstName = STUDENT_FIRST_NAMES.get(ordinal % STUDENT_FIRST_NAMES.size());
            String middleName = MIDDLE_NAMES.get((ordinal / STUDENT_FIRST_NAMES.size()) % MIDDLE_NAMES.size());
            String surname = SURNAMES.get((ordinal / (STUDENT_FIRST_NAMES.size() * MIDDLE_NAMES.size()))
                    % SURNAMES.size());
            String username = usernameFor(firstName, middleName, surname);
            String fullName = firstName + " " + middleName + " " + surname;
            if (users.findByUsernameIgnoreCase(username).isPresent()) {
                throw new IllegalStateException(
                        "Existing account conflicts with generated student username " + username + ".");
            }
            AppUser account = users.save(new AppUser(username, passwordEncoder.encode(username), Role.STUDENT));
            int birthYear = academicYear - classNumber - 5;
            SchoolPerson student = new SchoolPerson(
                    account,
                    fullName,
                    section,
                    LocalDate.of(birthYear, (rollNumber % 12) + 1, (rollNumber % 27) + 1),
                    "Parent " + surname,
                    "Guardian " + surname,
                    "+9198" + String.format("%08d", (ordinal * 7919L) % 100_000_000L),
                    rollNumber);
            people.save(student);
            created++;
        }
        return created;
    }

    private List<SchoolExamDefinition> ensureExamDefinitions(int academicYear) {
        List<SchoolExamDefinition> result = new ArrayList<>();
        for (String examName : EXAMS) {
            result.add(examDefinitions.findByNameIgnoreCaseAndAcademicYear(examName, academicYear)
                    .orElseGet(() -> examDefinitions.save(new SchoolExamDefinition(examName, academicYear))));
        }
        return result;
    }

    private List<String> subjectsFor(int classNumber, int sectionIndex) {
        if (classNumber <= 5) {
            return List.of("English", "Hindi", "Mathematics", "EVS", "Computer Science");
        }
        if (classNumber <= 8) {
            return List.of("English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer Science");
        }
        if (classNumber <= 10) {
            return List.of(
                    "English", "Hindi", "Mathematics", "Physics", "Chemistry", "Biology",
                    "History", "Geography", "Political Science", "Economics");
        }
        return switch (sectionIndex) {
            case 0 -> List.of("English", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science");
            case 1 -> List.of("English", "Accountancy", "Business Studies", "Economics", "Mathematics", "Entrepreneurship");
            default -> List.of("English", "History", "Geography", "Political Science", "Economics", "Sociology");
        };
    }

    private List<LocalDate> attendanceDates() {
        LocalDate endDate = attendanceEndDate.isBlank() ? LocalDate.now() : LocalDate.parse(attendanceEndDate);
        Set<LocalDate> holidays = parseHolidays();
        List<LocalDate> result = new ArrayList<>();
        if (!attendanceStartDate.isBlank()) {
            LocalDate startDate = LocalDate.parse(attendanceStartDate);
            if (startDate.isAfter(endDate)) {
                throw new IllegalArgumentException("Attendance start date must not be after the end date.");
            }
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                if (isSchoolDay(date, holidays)) result.add(date);
            }
            return result;
        }
        if (attendanceDays < 1 || attendanceDays > 366) {
            throw new IllegalArgumentException("Attendance days must be between 1 and 366.");
        }
        for (LocalDate date = endDate; result.size() < attendanceDays; date = date.minusDays(1)) {
            if (isSchoolDay(date, holidays)) result.add(date);
        }
        return result;
    }

    private Set<LocalDate> parseHolidays() {
        if (schoolHolidays.isBlank()) return Set.of();
        return Arrays.stream(schoolHolidays.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(LocalDate::parse)
                .collect(Collectors.toSet());
    }

    private boolean isSchoolDay(LocalDate date, Set<LocalDate> holidays) {
        return date.getDayOfWeek() != DayOfWeek.SATURDAY
                && date.getDayOfWeek() != DayOfWeek.SUNDAY
                && !holidays.contains(date);
    }

    private AttendanceStatus attendanceStatus(int classNumber, int sectionIndex, Integer rollNumber, LocalDate date) {
        Random random = new Random(RANDOM_SEED + classNumber * 100_003L
                + sectionIndex * 10_007L + rollNumber * 101L + date.toEpochDay());
        int value = random.nextInt(100);
        if (value < 82) return AttendanceStatus.PRESENT;
        if (value < 90) return AttendanceStatus.ABSENT;
        if (value < 96) return AttendanceStatus.LATE;
        return AttendanceStatus.LEAVE;
    }

    private BigDecimal score(
            int classNumber,
            int sectionIndex,
            Integer rollNumber,
            String examName,
            String subjectName,
            BigDecimal maximumMarks) {
        long seed = RANDOM_SEED + classNumber * 1_000_003L + sectionIndex * 100_003L
                + rollNumber * 1_009L + examName.hashCode() * 31L + subjectName.hashCode();
        Random random = new Random(seed);
        int percentage = random.nextInt(100) < 10 ? random.nextInt(35) : 35 + random.nextInt(66);
        return maximumMarks.multiply(BigDecimal.valueOf(percentage))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private String usernameFor(String firstName, String middleName, String surname) {
        return (firstName + middleName + surname).toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private String attendanceKey(Long studentId, LocalDate date) {
        return studentId + ":" + date;
    }

    private void flushAttendanceBufferIfFull() {
        if (attendanceBuffer.size() >= BATCH_SIZE) {
            attendance.saveAll(attendanceBuffer);
            attendanceBuffer.clear();
            entityManager.flush();
            entityManager.clear();
        }
    }

    private void flushMarksBufferIfFull() {
        if (marksBuffer.size() >= BATCH_SIZE) {
            marks.saveAll(marksBuffer);
            marksBuffer.clear();
            entityManager.flush();
            entityManager.clear();
        }
    }

    private void flushBuffers() {
        if (!attendanceBuffer.isEmpty()) attendance.saveAll(attendanceBuffer);
        if (!marksBuffer.isEmpty()) marks.saveAll(marksBuffer);
        attendanceBuffer.clear();
        marksBuffer.clear();
        entityManager.flush();
    }

    private void verifyDemoDatabase() {
        if (!"demo".equalsIgnoreCase(target)
                || !Arrays.asList(environment.getActiveProfiles()).contains("demo-seed")) {
            throw new IllegalStateException(
                    "Full seeding requires app.demo-data.target=demo and the demo-seed profile.");
        }
        try (var connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            boolean testMemoryDatabase = url.startsWith("jdbc:h2:mem:")
                    && Arrays.asList(environment.getActiveProfiles()).contains("test");
            boolean postgresDemoDatabase = url.startsWith("jdbc:postgresql:");
            if (!postgresDemoDatabase && !testMemoryDatabase) {
                throw new IllegalStateException(
                        "Full seeding requires a PostgreSQL database or an isolated test H2 database.");
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to verify the demo database target.", exception);
        }
    }

    public record SeedReport(
            int classes,
            int sections,
            int teachers,
            int students,
            int studentsCreated,
            int classTeacherAssignments,
            int subjectTeacherAssignments,
            int examDefinitions,
            int sectionExams,
            int attendanceRecords,
            int marks,
            int attendanceRecordsCreated,
            int marksCreated,
            int academicYear) {
    }
}
