-- =============================================================================
-- 0004: profiles go live the moment a family submits them.
--
-- The register no longer holds new biodata for manual approval. "Pending
-- review" stays available as an admin tool (Send back to review hides a
-- profile), and the verified badge stays optional — neither blocks a family.
-- =============================================================================

alter table profiles alter column status set default 'active';

-- Release anything that was waiting on the old gate.
update profiles set status = 'active' where status = 'pending_review';
