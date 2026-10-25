package com.schoolmanagement.repository;

import com.schoolmanagement.model.SchoolSectionSubject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchoolSectionSubjectRepository extends JpaRepository<SchoolSectionSubject, Long> {
    List<SchoolSectionSubject> findAllBySection_IdOrderBySubjectAsc(Long sectionId);

    boolean existsBySection_IdAndSubjectIgnoreCase(Long sectionId, String subject);

    Optional<SchoolSectionSubject> findBySection_IdAndSubjectIgnoreCase(Long sectionId, String subject);
}
