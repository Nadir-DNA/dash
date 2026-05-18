-- Add missing enrollment_status values to align enum with app usage
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'enrolled';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'opened';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'clicked';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'replied';
