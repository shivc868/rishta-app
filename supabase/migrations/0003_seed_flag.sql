-- =============================================================================
-- 0003: flag generated demo rows so they can be wiped in one statement.
--
-- Anything seeded for demos/testing is inserted with is_seed = true. Real
-- families' rows default to false. To remove all dummy data later:
--
--   delete from profiles where is_seed;
--   delete from accounts  where is_seed;
--
-- (profile_privates, requests, grants and shortlists cascade from profiles.)
-- =============================================================================

alter table accounts add column is_seed boolean not null default false;
alter table profiles add column is_seed boolean not null default false;

create index profiles_is_seed_idx on profiles (is_seed) where is_seed;
