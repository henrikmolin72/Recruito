# Recruito Merge Log

Auto-appended by `.githooks/post-merge` on every merge. Fold the
notable lines into a dated milestone summary periodically, then trim.

## 2026-06-29
- bdf4eea chore(graph): refresh dep-graph (graphify update .)
- b24bdb4 fix(hooks): correct graphify CLI command (was silently no-op'ing)
- 384c086 chore(hooks): commit pre-commit + post-commit into .githooks/

## 2026-06-29
- d36e987 fix(candidates): enforce candidate cap on submission + correct admin counts

## 2026-07-01
- 49643c9 feat(recruiter): show ongoing-process stats on both job views, moved up

## 2026-07-01
- f3ee24c fix(recruiter): hide actively-claimed jobs from Browse regardless of status

## 2026-07-01
- 6c5f892 fix(candidates): pause + present-candidate gate on ACTIVE count, not total

## 2026-07-02
- ed235b9 test(candidates): pin 2026-07-02 client scenario — stray draft/withdrawn row no longer counts as In process
- 4dedd90 fix(recruiter): mandates-list Cap-reached gate = job-wide cap occupancy (was own raw rows incl. drafts)
- 6519030 fix(recruiter): mandate-detail cap gate counts job-wide occupancy, not own candidates
- 295840e fix(recruiter): Presented count = admin cap badge; drafts/withdrawn no longer inflate process stats
- 264ce55 feat(candidates): computeJobProcessStats — cap-parity stats for job process panel
