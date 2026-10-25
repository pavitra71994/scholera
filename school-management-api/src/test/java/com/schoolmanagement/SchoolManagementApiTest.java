package com.schoolmanagement;

import org.junit.jupiter.api.Test;
import org.hamcrest.Matchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.bootstrap-admin.username=test-admin",
        "app.bootstrap-admin.password=this-is-a-test-password",
        "spring.datasource.url=jdbc:h2:mem:school_management_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class SchoolManagementApiTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void healthIsPublicAndReportsUp() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }

    @Test
    void credentialsAuthenticateAndCreateASession() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"test-admin","password":"this-is-a-test-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("test-admin")))
                .andExpect(jsonPath("$.role", is("ADMIN")));
    }

    @Test
    void invalidCredentialsAreRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"test-admin","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid username or password.")));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void onlyAdminsCanChangeSchoolProfile() throws Exception {
        mvc.perform(patch("/api/v1/school")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"North School","timezone":"Asia/Kolkata"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanUpdateSingleSchoolProfile() throws Exception {
        mvc.perform(patch("/api/v1/school")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"North School","timezone":"Asia/Kolkata"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("North School")))
                .andExpect(jsonPath("$.timezone", is("Asia/Kolkata")));

        mvc.perform(get("/api/v1/school").with(user("test-admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("North School")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsInvalidSchoolTimezone() throws Exception {
        mvc.perform(patch("/api/v1/school")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"North School","timezone":"not-a-timezone"}
                                """))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.message", is("Timezone must be a valid IANA timezone.")));
    }

    @Test
    @WithMockUser(roles = "TEACHER")
    void onlyAdminsCanCreateClasses() throws Exception {
        mvc.perform(post("/api/v1/classes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Teacher Class"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminsCanCreateClassesAndManageTheirSections() throws Exception {
        var admin = user("test-admin").roles("ADMIN");
        var classResult = mvc.perform(post("/api/v1/classes")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Grade API Test"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Grade API Test")))
                .andReturn();
        long classId = ((Number) com.jayway.jsonpath.JsonPath.read(
                classResult.getResponse().getContentAsString(), "$.id")).longValue();

        var sectionResult = mvc.perform(post("/api/v1/classes/" + classId + "/sections")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Section API Test"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Section API Test")))
                .andReturn();
        long sectionId = ((Number) com.jayway.jsonpath.JsonPath.read(
                sectionResult.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(get("/api/v1/classes").with(user("test-admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + classId + ")].sections[0].name",
                        Matchers.contains("Section API Test")));

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/classes/" + classId + "/sections/" + sectionId)
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void classDirectoryIncludesSectionStudentsAndAssignedTeachersAndIsAdminOnly() throws Exception {
        var admin = user("test-admin").roles("ADMIN");
        var classResponse = mvc.perform(post("/api/v1/classes")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Directory Test Class"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long classId = ((Number) com.jayway.jsonpath.JsonPath.read(
                classResponse.getResponse().getContentAsString(), "$.id")).longValue();
        var sectionResponse = mvc.perform(post("/api/v1/classes/" + classId + "/sections")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Directory Test Section"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long sectionId = ((Number) com.jayway.jsonpath.JsonPath.read(
                sectionResponse.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Directory Student","username":"directory-student","password":"initial-test-password","role":"STUDENT","sectionId":%d,"dateOfBirth":"2010-02-14","motherName":"Parent One","fatherName":"Parent Two"}
                                """.formatted(sectionId)))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Directory Teacher","username":"directory-teacher","password":"initial-test-password","role":"TEACHER","sectionIds":[%d]}
                                """.formatted(sectionId)))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/classes/" + classId + "/directory")
                        .with(user("test-admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].students[0].fullName", is("Directory Student")))
                .andExpect(jsonPath("$.sections[0].students[0].rollNumber", is(1)))
                .andExpect(jsonPath("$.sections[0].teachers[0].fullName", is("Directory Teacher")));
        mvc.perform(get("/api/v1/classes/" + classId + "/directory")
                        .with(user("directory-teacher").roles("TEACHER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void classAndSectionNamesMustBeUniqueWithinTheirScope() throws Exception {
        mvc.perform(post("/api/v1/classes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Unique Grade"}
                                """))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/classes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":" unique grade "}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", is("A class with this name already exists.")));
    }

    @Test
    void adminsCanCreateAccountsTakeAttendanceAndRecordExamMarks() throws Exception {
        var admin = user("test-admin").roles("ADMIN");
        var classResponse = mvc.perform(post("/api/v1/classes")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Academic Test Class"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long classId = ((Number) com.jayway.jsonpath.JsonPath.read(
                classResponse.getResponse().getContentAsString(), "$.id")).longValue();
        var sectionResponse = mvc.perform(post("/api/v1/classes/" + classId + "/sections")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Academic Test Section"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long sectionId = ((Number) com.jayway.jsonpath.JsonPath.read(
                sectionResponse.getResponse().getContentAsString(), "$.id")).longValue();

        var createdStudent = mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Test Learner","username":"academic-learner","password":"initial-test-password","role":"STUDENT","sectionId":%d,"dateOfBirth":"2009-04-12","motherName":"Parent One","fatherName":"Parent Two"}
                                """.formatted(sectionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("STUDENT")))
                .andExpect(jsonPath("$.sectionName", is("Academic Test Section")))
                .andExpect(jsonPath("$.rollNumber", is(1)))
                .andReturn();
        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Test Educator","username":"academic-educator","password":"initial-test-password","role":"TEACHER"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("TEACHER")));
        String longPassword = "long-password-".repeat(20);
        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Short Password User","username":"short-password-user","password":"x","role":"TEACHER"}
                                """))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Long Password User","username":"long-password-user","password":"%s","role":"TEACHER"}
                                """.formatted(longPassword)))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"long-password-user","password":"%s"}
                                """.formatted(longPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("long-password-user")));

        long studentId = ((Number) com.jayway.jsonpath.JsonPath.read(
                createdStudent.getResponse().getContentAsString(), "$.id")).longValue();
        String date = "2026-10-25";
        mvc.perform(post("/api/v1/attendance")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"date":"%s","records":[{"studentId":%d,"status":"PRESENT"}]}
                                """.formatted(sectionId, date, studentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status", is("PRESENT")));

        long examDefinitionId = createTestExamDefinition(
                user("test-admin").roles("ADMIN"), "Unit Test");
        mvc.perform(get("/api/v1/exams")
                        .with(user("test-admin").roles("ADMIN"))
                        .param("sectionId", String.valueOf(sectionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Unit Test' && @.sectionId == " + sectionId + ")]", Matchers.hasSize(1)));
        var examResponse = mvc.perform(post("/api/v1/exams")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"examDefinitionId":%d}
                                """.formatted(sectionId, examDefinitionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.academicYear", is(2026)))
                .andReturn();
        long examId = ((Number) com.jayway.jsonpath.JsonPath.read(
                examResponse.getResponse().getContentAsString(), "$.id")).longValue();
        long secondSectionId = createTestSection(
                user("test-admin").roles("ADMIN"), classId, "Academic Test Section B");
        mvc.perform(get("/api/v1/exams")
                        .with(user("test-admin").roles("ADMIN"))
                        .param("sectionId", String.valueOf(secondSectionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.examDefinitionId == " + examDefinitionId + " && @.sectionId == " + secondSectionId + ")]", Matchers.hasSize(1)));
        mvc.perform(post("/api/v1/exams")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"examDefinitionId":%d}
                                """.formatted(secondSectionId, examDefinitionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.examDefinitionId", is((int) examDefinitionId)))
                .andExpect(jsonPath("$.name", is("Unit Test")));
        var subjectResponse = mvc.perform(post("/api/v1/exams/" + examId + "/subjects")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Mathematics","maximumMarks":100}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subject", is("Mathematics")))
                .andReturn();
        long subjectId = ((Number) com.jayway.jsonpath.JsonPath.read(
                subjectResponse.getResponse().getContentAsString(), "$.id")).longValue();
        mvc.perform(post("/api/v1/exams/" + examId + "/subjects")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Science","maximumMarks":40}
                                """))
                .andExpect(status().isCreated());
        createTestExamDefinition(user("test-admin").roles("ADMIN"), "Final Unit Test");
        mvc.perform(post("/api/v1/exams/sections/" + sectionId + "/subjects")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"History","maximumMarks":75}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subject", is("History")));
        var finalExamList = mvc.perform(get("/api/v1/exams")
                        .with(user("test-admin").roles("ADMIN"))
                        .param("sectionId", String.valueOf(sectionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Unit Test' && @.sectionId == " + sectionId + ")]", Matchers.hasSize(1)))
                .andExpect(jsonPath("$[?(@.name == 'Final Unit Test' && @.sectionId == " + sectionId + ")]", Matchers.hasSize(1)))
                .andReturn();
        List<Map<String, Object>> finalExams = com.jayway.jsonpath.JsonPath.read(
                finalExamList.getResponse().getContentAsString(), "$");
        finalExams.stream()
                .filter(exam -> List.of("Unit Test", "Final Unit Test").contains(exam.get("name"))
                        && ((Number) exam.get("sectionId")).longValue() == sectionId)
                .forEach(exam -> assertEquals(3, ((List<?>) exam.get("subjects")).size()));
        mvc.perform(post("/api/v1/exams/subjects/" + subjectId + "/marks")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"marks":[{"studentId":%d,"obtainedMarks":92.5}]}
                                """.formatted(studentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].obtainedMarks", is(92.5)));
    }

    @Test
    void studentPortalRestrictsProfileEditsAndReturnsRankedToppersByGroup() throws Exception {
        var admin = user("test-admin").roles("ADMIN");
        var classResult = mvc.perform(post("/api/v1/classes")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Student Portal Class"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long classId = ((Number) com.jayway.jsonpath.JsonPath.read(
                classResult.getResponse().getContentAsString(), "$.id")).longValue();
        var sectionResult = mvc.perform(post("/api/v1/classes/" + classId + "/sections")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Student Portal Section"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long sectionId = ((Number) com.jayway.jsonpath.JsonPath.read(
                sectionResult.getResponse().getContentAsString(), "$.id")).longValue();

        String[] names = {"Portal Learner One", "Portal Learner Two", "Portal Learner Three"};
        String[] usernames = {"portal-student-one", "portal-student-two", "portal-student-three"};
        long[] studentIds = new long[names.length];
        for (int index = 0; index < names.length; index++) {
            var response = mvc.perform(post("/api/v1/people")
                            .with(admin)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"fullName":"%s","username":"%s","password":"long-enough-test-password","role":"STUDENT","sectionId":%d,"dateOfBirth":"2009-04-12","motherName":"Parent Name","fatherName":"Guardian Name","emergencyContact":"555-0100"}
                                    """.formatted(names[index], usernames[index], sectionId)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.rollNumber", is(index + 1)))
                    .andReturn();
            studentIds[index] = ((Number) com.jayway.jsonpath.JsonPath.read(
                    response.getResponse().getContentAsString(), "$.id")).longValue();
        }

        mvc.perform(post("/api/v1/people")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Missing Birth Date","username":"portal-missing-dob","password":"long-enough-test-password","role":"STUDENT","sectionId":%d,"motherName":"Parent Name","fatherName":"Guardian Name"}
                                """.formatted(sectionId)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/people")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Missing Parent","username":"portal-missing-parent","password":"long-enough-test-password","role":"STUDENT","sectionId":%d,"dateOfBirth":"2009-04-12","motherName":" "}
                                """.formatted(sectionId)))
                .andExpect(status().isBadRequest());

        saveStudentPortalExam(admin, sectionId, "Arithmetic Review", "Mathematics", 100,
                studentIds, new double[]{100, 100, 50});
        saveStudentPortalExam(admin, sectionId, "Science Review", "Science", 50,
                studentIds, new double[]{20, 20, 20});
        saveStudentPortalAttendance(admin, sectionId, "2026-10-23", studentIds,
                new String[]{"PRESENT", "ABSENT", "LATE"});
        saveStudentPortalAttendance(admin, sectionId, "2026-10-24", studentIds,
                new String[]{"LATE", "PRESENT", "ABSENT"});

        mvc.perform(get("/api/v1/student/profile").with(user(usernames[2]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is(names[2])))
                .andExpect(jsonPath("$.dateOfBirth", is("2009-04-12")))
                .andExpect(jsonPath("$.motherName", is("Parent Name")))
                .andExpect(jsonPath("$.fatherName", is("Guardian Name")))
                .andExpect(jsonPath("$.rollNumber", is(3)))
                .andExpect(jsonPath("$.className", is("Student Portal Class")));

        mvc.perform(patch("/api/v1/student/profile")
                        .with(user(usernames[2]).roles("STUDENT"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Unauthorized Name Change","emergencyContact":"555-0199"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is(names[2])))
                .andExpect(jsonPath("$.emergencyContact", is("555-0199")))
                .andExpect(jsonPath("$.dateOfBirth", is("2009-04-12")))
                .andExpect(jsonPath("$.motherName", is("Parent Name")));
        mvc.perform(get("/api/v1/student/profile").with(user(usernames[0]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is(names[0])))
                .andExpect(jsonPath("$.emergencyContact", is("555-0100")));
        mvc.perform(get("/api/v1/student/profile").with(user(usernames[2]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is(names[2])))
                .andExpect(jsonPath("$.emergencyContact", is("555-0199")));

        mvc.perform(get("/api/v1/student/exam-history").with(user(usernames[2]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(2)))
                .andExpect(jsonPath("$[0].subject", is("Mathematics")))
                .andExpect(jsonPath("$[0].obtainedMarks", is(50.0)))
                .andExpect(jsonPath("$[0].maximumMarks", is(100.0)))
                .andExpect(jsonPath("$[0].percentage", is(50.0)));
        mvc.perform(get("/api/v1/student/exam-results").with(user(usernames[2]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(2)))
                .andExpect(jsonPath("$[0].examName", is("Arithmetic Review")))
                .andExpect(jsonPath("$[0].totalMarks", is(50.0)))
                .andExpect(jsonPath("$[0].maximumMarks", is(100.0)))
                .andExpect(jsonPath("$[0].percentage", is(50.0)))
                .andExpect(jsonPath("$[0].sectionRank", is(3)))
                .andExpect(jsonPath("$[0].classRank", is(3)))
                .andExpect(jsonPath("$[0].subjects[0].subject", is("Mathematics")))
                .andExpect(jsonPath("$[0].subjects[0].obtainedMarks", is(50.0)));
        mvc.perform(get("/api/v1/student/attendance-history").with(user(usernames[0]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordedDays", is(2)))
                .andExpect(jsonPath("$.presentCount", is(1)))
                .andExpect(jsonPath("$.lateCount", is(1)))
                .andExpect(jsonPath("$.absentCount", is(0)))
                .andExpect(jsonPath("$.attendancePercentage", is(100.0)))
                .andExpect(jsonPath("$.history.length()", is(2)));
        mvc.perform(get("/api/v1/student/toppers").with(user(usernames[2]).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classToppers.length()", is(3)))
                .andExpect(jsonPath("$.classToppers[0].totalMarks", is(120.0)))
                .andExpect(jsonPath("$.classToppers[1].rank", is(1)))
                .andExpect(jsonPath("$.classToppers[2].rank", is(3)))
                .andExpect(jsonPath("$.classToppers[0].currentStudent", is(false)))
                .andExpect(jsonPath("$.classToppers[2].currentStudent", is(true)))
                .andExpect(jsonPath("$.sectionToppers.length()", is(3)))
                .andExpect(jsonPath("$.sectionToppers[2].rank", is(3)))
                .andExpect(jsonPath("$.sectionToppers[2].currentStudent", is(true)))
                .andExpect(jsonPath("$.subjectToppers.length()", is(6)))
                .andExpect(jsonPath("$.subjectToppers[2].rank", is(3)))
                .andExpect(jsonPath("$.subjectToppers[2].currentStudent", is(true)));
        mvc.perform(get("/api/v1/student/toppers").with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classToppers[0].currentStudent", is(false)));
        mvc.perform(get("/api/v1/student/toppers").with(user("teacher-portal").roles("TEACHER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classToppers[0].currentStudent", is(false)));

        mvc.perform(get("/api/v1/student/profile").with(user("teacher-portal").roles("TEACHER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/student/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void teacherPortalRestrictsEveryOperationToAssignedSections() throws Exception {
        var admin = user("test-admin").roles("ADMIN");
        long classId = createTestClass(admin, "Teacher Portal Scope Class");
        long assignedSectionId = createTestSection(admin, classId, "Assigned A");
        long secondAssignedSectionId = createTestSection(admin, classId, "Assigned B");
        long unassignedSectionId = createTestSection(admin, classId, "Unassigned C");

        var teacherCreate = mvc.perform(post("/api/v1/people")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Teacher Portal User","username":"teacher-portal-user","password":"long-enough-test-password","role":"TEACHER","sectionIds":[%d,%d]}
                                """.formatted(assignedSectionId, secondAssignedSectionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignedSections.length()", is(2)))
                .andExpect(jsonPath("$.assignedSections[0].id", is((int) assignedSectionId)))
                .andReturn();
        long teacherId = ((Number) com.jayway.jsonpath.JsonPath.read(
                teacherCreate.getResponse().getContentAsString(), "$.id")).longValue();
        var teacher = user("teacher-portal-user").roles("TEACHER");
        mvc.perform(get("/api/v1/exams/definitions").with(teacher))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/exams/definitions")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Teacher Restricted Exam","academicYear":2026}
                                """))
                .andExpect(status().isForbidden());

        var studentCreate = mvc.perform(post("/api/v1/people")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Teacher Roster Learner","username":"teacher-roster-learner","password":"long-enough-test-password","role":"STUDENT","sectionId":%d,"dateOfBirth":"2010-01-02","motherName":"Private Parent","fatherName":"Private Guardian","emergencyContact":"555-0123"}
                                """.formatted(assignedSectionId)))
                .andExpect(status().isCreated())
                .andReturn();
        long studentId = ((Number) com.jayway.jsonpath.JsonPath.read(
                studentCreate.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(get("/api/v1/teacher/profile").with(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("teacher-portal-user")))
                .andExpect(jsonPath("$.sections[0].className", is("Teacher Portal Scope Class")));
        mvc.perform(patch("/api/v1/teacher/profile")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Teacher Portal Updated","phone":"555-0108","username":"forbidden-change"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is("Teacher Portal Updated")))
                .andExpect(jsonPath("$.phone", is("555-0108")))
                .andExpect(jsonPath("$.username", is("teacher-portal-user")));
        mvc.perform(get("/api/v1/teacher/sections/" + assignedSectionId + "/students").with(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fullName", is("Teacher Roster Learner")))
                .andExpect(jsonPath("$[0].rollNumber", is(1)))
                .andExpect(jsonPath("$[0].dateOfBirth").doesNotExist())
                .andExpect(jsonPath("$[0].motherName").doesNotExist());
        mvc.perform(get("/api/v1/teacher/sections/" + unassignedSectionId + "/students").with(teacher))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/attendance")
                        .with(teacher)
                        .param("sectionId", String.valueOf(unassignedSectionId))
                        .param("date", "2026-10-25"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/attendance")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"date":"2026-10-25","records":[{"studentId":%d,"status":"PRESENT"}]}
                                """.formatted(assignedSectionId, studentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status", is("PRESENT")));
        mvc.perform(get("/api/v1/attendance/history")
                        .with(teacher)
                        .param("sectionId", String.valueOf(assignedSectionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fullName", is("Teacher Roster Learner")));

        long examDefinitionId = createTestExamDefinition(admin, "Teacher Test");
        var examResponse = mvc.perform(post("/api/v1/exams")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"examDefinitionId":%d}
                                """.formatted(assignedSectionId, examDefinitionId)))
                .andExpect(status().isCreated())
                .andReturn();
        mvc.perform(post("/api/v1/exams")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"examDefinitionId":%d}
                                """.formatted(secondAssignedSectionId, examDefinitionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.examDefinitionId", is((int) examDefinitionId)));
        long examId = ((Number) com.jayway.jsonpath.JsonPath.read(
                examResponse.getResponse().getContentAsString(), "$.id")).longValue();
        var subjectResponse = mvc.perform(post("/api/v1/exams/" + examId + "/subjects")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Science","maximumMarks":40}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long subjectId = ((Number) com.jayway.jsonpath.JsonPath.read(
                subjectResponse.getResponse().getContentAsString(), "$.id")).longValue();
        mvc.perform(get("/api/v1/exams")
                        .with(teacher)
                        .param("sectionId", String.valueOf(unassignedSectionId)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/exams/subjects/" + subjectId + "/marks")
                        .with(teacher)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"marks":[{"studentId":%d,"obtainedMarks":35}]}
                                """.formatted(studentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].obtainedMarks", is(35)));
        mvc.perform(get("/api/v1/teacher/sections/" + assignedSectionId + "/progress").with(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.students[0].attendancePercentage", is(100.0)))
                .andExpect(jsonPath("$.students[0].recordedAttendance", is(1)))
                .andExpect(jsonPath("$.students[0].marks[0].subject", is("Science")))
                .andExpect(jsonPath("$.students[0].marks[0].academicYear", is(2026)))
                .andExpect(jsonPath("$.students[0].dateOfBirth").doesNotExist());
        mvc.perform(get("/api/v1/teacher/sections/" + unassignedSectionId + "/progress").with(teacher))
                .andExpect(status().isForbidden());

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/people/" + teacherId + "/teacher-sections")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionIds":[%d]}
                                """.formatted(unassignedSectionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedSections[0].id", is((int) unassignedSectionId)));
        mvc.perform(get("/api/v1/teacher/sections/" + assignedSectionId + "/students").with(teacher))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/teacher/sections/" + unassignedSectionId + "/students").with(teacher))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/teacher/profile").with(user("not-a-teacher").roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    private long createTestClass(
            org.springframework.test.web.servlet.request.RequestPostProcessor admin,
            String name) throws Exception {
        var result = mvc.perform(post("/api/v1/classes")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s"}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private long createTestSection(
            org.springframework.test.web.servlet.request.RequestPostProcessor admin,
            long classId,
            String name) throws Exception {
        var result = mvc.perform(post("/api/v1/classes/" + classId + "/sections")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s"}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private long createTestExamDefinition(
            org.springframework.test.web.servlet.request.RequestPostProcessor admin,
            String name) throws Exception {
        var result = mvc.perform(post("/api/v1/exams/definitions")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","academicYear":2026}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void saveStudentPortalExam(
            org.springframework.test.web.servlet.request.RequestPostProcessor admin,
            long sectionId,
            String examName,
            String subject,
            double maximumMarks,
            long[] studentIds,
            double[] scores) throws Exception {
        long examDefinitionId = createTestExamDefinition(admin, examName);
        var examResponse = mvc.perform(post("/api/v1/exams")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"examDefinitionId":%d}
                                """.formatted(sectionId, examDefinitionId)))
                .andExpect(status().isCreated())
                .andReturn();
        long examId = ((Number) com.jayway.jsonpath.JsonPath.read(
                examResponse.getResponse().getContentAsString(), "$.id")).longValue();
        var subjectResponse = mvc.perform(post("/api/v1/exams/" + examId + "/subjects")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"%s","maximumMarks":%.2f}
                                """.formatted(subject, maximumMarks)))
                .andExpect(status().isCreated())
                .andReturn();
        long subjectId = ((Number) com.jayway.jsonpath.JsonPath.read(
                subjectResponse.getResponse().getContentAsString(), "$.id")).longValue();
        mvc.perform(post("/api/v1/exams/subjects/" + subjectId + "/marks")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"marks":[{"studentId":%d,"obtainedMarks":%.2f},{"studentId":%d,"obtainedMarks":%.2f},{"studentId":%d,"obtainedMarks":%.2f}]}
                                """.formatted(
                                studentIds[0], scores[0],
                                studentIds[1], scores[1],
                                studentIds[2], scores[2])))
                .andExpect(status().isOk());
    }

    private void saveStudentPortalAttendance(
            org.springframework.test.web.servlet.request.RequestPostProcessor admin,
            long sectionId,
            String date,
            long[] studentIds,
            String[] statuses) throws Exception {
        mvc.perform(post("/api/v1/attendance")
                        .with(admin)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"date":"%s","records":[{"studentId":%d,"status":"%s"},{"studentId":%d,"status":"%s"},{"studentId":%d,"status":"%s"}]}
                                """.formatted(
                                sectionId, date,
                                studentIds[0], statuses[0],
                                studentIds[1], statuses[1],
                                studentIds[2], statuses[2])))
                .andExpect(status().isOk());
    }
}
