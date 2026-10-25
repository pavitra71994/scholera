ALTER TABLE school_person ADD COLUMN date_of_birth DATE;
ALTER TABLE school_person ADD COLUMN mother_name VARCHAR(160);
ALTER TABLE school_person ADD COLUMN father_name VARCHAR(160);
ALTER TABLE school_person ADD COLUMN emergency_contact VARCHAR(40);
ALTER TABLE school_person ADD COLUMN roll_number INTEGER;

ALTER TABLE school_person
    ADD CONSTRAINT ck_school_person_roll_number_positive
    CHECK (roll_number IS NULL OR roll_number > 0);

ALTER TABLE school_person
    ADD CONSTRAINT uq_school_person_section_roll_number
    UNIQUE (section_id, roll_number);
