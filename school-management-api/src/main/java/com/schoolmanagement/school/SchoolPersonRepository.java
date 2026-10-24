package com.schoolmanagement.school;

import com.schoolmanagement.security.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolPersonRepository extends JpaRepository<SchoolPerson, Long> {
    List<SchoolPerson> findAllByAccount_RoleOrderByFullName(Role role);

    List<SchoolPerson> findAllBySection_IdAndAccount_RoleOrderByFullName(Long sectionId, Role role);

    boolean existsByAccount_UsernameIgnoreCase(String username);
}
