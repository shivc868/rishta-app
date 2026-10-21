-- 0006: reservation category (General / OBC / SC / ST), asked right after religion.
-- Existing rows default to 'general'; the form makes every new family choose.
create type social_category as enum ('general', 'obc', 'sc', 'st');
alter table profiles add column category social_category not null default 'general';
