-- 0005: "Teaching" (JBT / B.Ed / TET / PAT) and "Other" as education levels. The free-text `education` column
-- carries what the family wrote; the level only groups it for filters.
alter type education_level add value if not exists 'teaching';
alter type education_level add value if not exists 'other';
