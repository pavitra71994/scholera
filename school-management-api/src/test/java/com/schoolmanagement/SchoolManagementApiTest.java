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

        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Test Learner","username":"academic-learner","password":"initial-test-password","role":"STUDENT","sectionId":%d}
                                """.formatted(sectionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("STUDENT")))
                .andExpect(jsonPath("$.sectionName", is("Academic Test Section")));
        mvc.perform(post("/api/v1/people")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Test Educator","username":"academic-educator","password":"initial-test-password","role":"TEACHER"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("TEACHER")));

        var studentResponse = mvc.perform(get("/api/v1/people?role=STUDENT")
                        .with(user("test-admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andReturn();
        long studentId = ((Number) com.jayway.jsonpath.JsonPath.read(
                studentResponse.getResponse().getContentAsString(), "$[0].id")).longValue();
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

        var examResponse = mvc.perform(post("/api/v1/exams")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId":%d,"name":"Unit Test","subject":"Mathematics","maximumMarks":100}
                                """.formatted(sectionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subject", is("Mathematics")))
                .andReturn();
        long examId = ((Number) com.jayway.jsonpath.JsonPath.read(
                examResponse.getResponse().getContentAsString(), "$.id")).longValue();
        mvc.perform(post("/api/v1/exams/" + examId + "/marks")
                        .with(user("test-admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"marks":[{"studentId":%d,"obtainedMarks":92.5}]}
                                """.formatted(studentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].obtainedMarks", is(92.5)));
    }
}
