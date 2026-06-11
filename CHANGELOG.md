# Changelog

All notable changes to Better SGY are documented here. This project aims to follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Every Schoology request now goes through one global rate-limiter (concurrency cap +
  request spacing + retry on 429/503 honoring `Retry-After`), so bursts no longer trip
  Schoology's "Too Many Requests" and silently drop data (Messages, Notifications,
  Materials).

## [1.0.0] — 2026-06-10

First public test build.

### Added
- Redesigned dashboard over Schoology: Overview, Grades (+ grade history), Assignments,
  Materials (with inline file/quiz viewing), Calendar, Announcements, Nostalgia timeline,
  and an Arcade with built-in mini-games.
- Light/dark themes and accent colors; one-click toggle back to the original Schoology.
- Assignments are clickable — they open the Better SGY view of the assignment (with a
  live, theme-matched fallback for quizzes/assessments).

### Privacy
- Everything stays on-device. No accounts, servers, analytics, or tracking.
