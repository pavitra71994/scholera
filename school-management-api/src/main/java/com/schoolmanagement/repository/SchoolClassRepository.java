package com.schoolmanagement.repository;

import com.schoolmanagement.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    boolean existsByNameIgnoreCase(String name);

    @Query("select distinct schoolClass from SchoolClass schoolClass left join fetch schoolClass.sections order by schoolClass.name")
    List<SchoolClass> findAllWithSections();
}
