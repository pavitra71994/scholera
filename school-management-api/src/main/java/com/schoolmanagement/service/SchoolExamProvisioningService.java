package com.schoolmanagement.service;

import com.schoolmanagement.model.SchoolExam;
import com.schoolmanagement.model.SchoolExamDefinition;
import com.schoolmanagement.model.SchoolSection;
import com.schoolmanagement.model.SchoolSectionSubject;
import com.schoolmanagement.model.SchoolExamSubject;
import com.schoolmanagement.repository.SchoolExamDefinitionRepository;
import com.schoolmanagement.repository.SchoolExamRepository;
import com.schoolmanagement.repository.SchoolExamSubjectRepository;
import com.schoolmanagement.repository.SchoolSectionSubjectRepository;
import com.schoolmanagement.repository.SchoolSectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SchoolExamProvisioningService {
    private final SchoolExamRepository exams;
    private final SchoolExamDefinitionRepository definitions;
    private final SchoolSectionSubjectRepository sectionSubjects;
    private final SchoolExamSubjectRepository examSubjects;
    private final SchoolSectionRepository sections;

    public SchoolExamProvisioningService(
            SchoolExamRepository exams,
            SchoolExamDefinitionRepository definitions,
            SchoolSectionSubjectRepository sectionSubjects,
            SchoolExamSubjectRepository examSubjects,
            SchoolSectionRepository sections) {
        this.exams = exams;
        this.definitions = definitions;
        this.sectionSubjects = sectionSubjects;
        this.examSubjects = examSubjects;
        this.sections = sections;
    }

    @Transactional
    public List<SchoolExam> provisionAllDefinitions(SchoolSection section) {
        return definitions.findAllByOrderByAcademicYearDescNameAsc().stream()
                .map(definition -> provisionExam(section, definition))
                .toList();
    }

    @Transactional
    public void provisionDefinitionForAllSections(SchoolExamDefinition definition) {
        sections.findAll().forEach(section -> provisionExam(section, definition));
    }

    @Transactional
    public SchoolExam provisionExam(SchoolSection section, SchoolExamDefinition definition) {
        return exams.findBySection_IdAndDefinition_Id(section.getId(), definition.getId())
                .orElseGet(() -> {
                    SchoolExam exam = exams.save(new SchoolExam(section, definition));
                    for (SchoolSectionSubject sectionSubject : sectionSubjects.findAllBySection_IdOrderBySubjectAsc(section.getId())) {
                        examSubjects.save(new SchoolExamSubject(
                                exam, sectionSubject, sectionSubject.getDefaultMaximumMarks()));
                    }
                    return exam;
                });
    }

    @Transactional
    public void addSectionSubjectToExistingExams(
            SchoolSectionSubject sectionSubject, List<SchoolExam> sectionExams) {
        for (SchoolExam exam : sectionExams) {
            examSubjects.save(new SchoolExamSubject(
                    exam, sectionSubject, sectionSubject.getDefaultMaximumMarks()));
        }
    }
}
