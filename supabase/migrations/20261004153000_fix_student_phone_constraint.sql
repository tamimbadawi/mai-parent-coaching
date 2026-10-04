-- Migration: Fix check_student_phone_and_country constraint
-- Drop old blanket CHECK, replace with INSERT-only trigger

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS check_student_phone_and_country;

CREATE OR REPLACE FUNCTION enforce_new_student_phone_country()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('student') THEN
    IF (NEW.phone IS NULL OR TRIM(NEW.phone) = '') THEN
      RAISE EXCEPTION 'New students must provide a phone number.';
    END IF;
    IF (NEW.country IS NULL OR TRIM(NEW.country) = '') THEN
      RAISE EXCEPTION 'New students must provide a country.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_student_phone_country ON profiles;
CREATE TRIGGER trg_enforce_student_phone_country
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_new_student_phone_country();
