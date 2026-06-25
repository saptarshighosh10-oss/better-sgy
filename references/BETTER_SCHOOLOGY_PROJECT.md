# Better Schoology Project Brief

## Purpose

Build **Better Schoology**, a local-first Schoology-inspired dashboard that feels familiar like Schoology but is cleaner, faster, more polished, and more fun.

The app should not be a pixel-perfect clone and must not use Schoology branding, logos, or copied design assets. It should use a familiar school dashboard structure while improving clarity, spacing, navigation, analytics, and interaction.

## Use Enabled Skills

When working on this project, use relevant enabled skills for:

- prompt improvement
- UI/UX planning
- frontend design polish
- design critique
- animation planning
- Rive/Lottie integration
- dashboard layout
- accessibility
- responsive design

Relevant skills may include:

- Prompt Master
- UI UX Pro Max
- Impeccable
- Emil Design Eng
- Design Taste Frontend
- Animation Design

Use these skills when they are relevant, but do not overcomplicate the app or turn it into a generic SaaS dashboard.

## Current Stack

The app is built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui with Radix
- ECharts for grade graphs
- Dexie/IndexedDB for local data
- Zustand for app state
- Zod for validation
- date-fns for dates
- @rive-app/react-canvas for mascot animation later

## Core Tabs

The app should have these main sections:

1. Overview
2. Grades
3. Assignments
4. GradeGraph
5. Important Emails
6. Settings

## Design Direction

The app should feel school-like and familiar:

- sidebar navigation
- course cards
- gradebook-style tables
- assignment rows
- missing/late labels
- recent updates
- semester/year switcher
- refresh status
- important email sidebar
- small mascot presence

But it should improve on Schoology with:

- better spacing
- cleaner cards
- faster filters
- better grade visuals
- smoother animations
- modern but calm UI
- dark/light mode later
- responsive design
- accessibility and keyboard support

Avoid:

- pixel-perfect Schoology copying
- Schoology branding/logos
- startup SaaS overkill
- unnecessary animations
- cluttered dashboards
- scraping private assignment content

## Data Scope

Only use gradebook and assignment-list metadata.

Do not scrape or store:

- assignment instructions
- assignment content
- attachments
- submissions
- discussions
- folders
- pages
- private course material contents

Allowed metadata:

- course name
- teacher/period if visible
- school year
- grade level
- semester/grading period
- assignment category
- assignment name
- due date
- visible graded/entered date if available
- score
- points possible
- percent
- status: missing, late, excused, submitted, incomplete, normal
- comments only if visible directly in the gradebook

## Data Organization

Organize all saved data by:

- school year
- grade level
- semester/grading period
- class/course

Assume class of 2029 unless configured otherwise:

- 2025-2026 = Freshman
- 2026-2027 = Sophomore
- 2027-2028 = Junior
- 2028-2029 = Senior

The user should be able to switch between years and semesters locally, including old saved gradebooks, without re-scraping old data.

## Refresh Behavior

The app should support:

- manual refresh button
- auto-refresh Schoology/grade data every 5 hours
- auto-refresh important emails every 6 hours
- one-time local consent
- no password storage
- use logged-in browser session or approved APIs only
- local cache
- snapshots
- refresh logs
- last-good-data fallback

Do not bypass login, MFA, permissions, or security.

Treat 15 actions/requests per second as the absolute ceiling, not the normal target.

Use safer defaults:

- background refresh: 1-2 requests/sec
- manual refresh: 3-5 requests/sec if needed
- use caching, deduping, validation, and retry backoff

## Failure Behavior

Never overwrite good saved data with a failed or empty scrape.

If refresh fails:

- keep showing last saved data
- show “Refresh failed, showing last saved version”
- write a refresh log entry
- do not overwrite valid data

If a scrape is partial:

- preserve old data for failed classes
- mark failed classes as stale
- save only validated successful portions

Validation should check:

- courses are not empty
- grading period exists
- assignment rows have names
- the page was not a login page
- no access denied page
- score values are valid or explicitly blank/missing

Before every successful update, save the previous data as a snapshot.

## Analytics

Calculate:

- first visible/inputted grade date
- last visible/inputted grade date
- average grade per term/year
- best year
- hardest year
- easiest year
- most improved year
- best class
- hardest class
- most assignment-heavy class
- grade volatility
- biggest grade drops
- missing/late assignment counts

Hardest year should not only mean lowest grades. Use a weighted difficulty score based on:

- assignment count
- total graded points
- missing/late count
- average grade
- grade drops
- grade volatility

If data is missing or incomplete, show “incomplete data” instead of guessing.

## GradeGraph

Create a Desmos-inspired interactive GradeGraph tab.

Features:

- X-axis can be time or assignment order
- Y-axis is grade percentage
- points represent assignments
- trend line shows class grade over time
- zoom and pan
- hover cards with assignment name, course, category, score, points possible, percent, date, and status
- class toggles
- semester/year comparison
- horizontal grade cutoff lines such as 89.5, 92.5, and 97
- what-if mode for local simulations only

What-if mode must never change Schoology data. It is local-only.

## Important Emails

Add an Important Emails sidebar or tab.

Use Gmail API/OAuth if available, not Gmail scraping.

Only include emails from whitelisted teachers and selected friends.

Refresh every 6 hours and support manual refresh.

Store only:

- message id
- sender
- subject
- snippet
- date
- unread/read status
- detected class
- priority score
- Gmail link

Do not store full email bodies by default.

Rank emails higher if:

- unread
- from a teacher
- recent
- contains keywords like missing, late, grade, quiz, test, exam, assignment, deadline, due, extra credit

## Mascot

Use the uploaded mascot images as visual references.

The mascot is an original orange tabby cat inspired by retro platformer sprite sheets. It must not copy copyrighted characters.

There is also a rare pink, taller, skinnier cat girlfriend character.

Mascot behavior:

- default idle
- after 20 seconds idle: pacing
- sometimes knocks on the glass
- after 45 seconds idle: sleeping
- on hover: nods head
- on refresh: working
- if missing assignments exist: points toward them
- if no missing assignments exist: sits calmly
- rare 1/10000 event: pink cat girlfriend visit

Use Rive later with @rive-app/react-canvas.

Future Rive component props:

- isRefreshing
- missingAssignmentCount
- isHovered
- idleSeconds
- enableSpecialEvents

Future Rive state machine inputs:

- idleLevel number: 0 default, 1 pacing, 2 sleeping
- isRefreshing boolean
- hasMissingAssignments boolean
- noMissingAssignments boolean
- isHovered boolean
- triggerKnock trigger
- triggerSpecialGirlfriendVisit trigger

Required animation names:

- idle_default
- idle_pacing
- idle_knock_glass
- idle_sleep
- refresh_working
- missing_pointing
- no_missing_sitting
- hover_nod
- special_girlfriend_visit

Respect prefers-reduced-motion. If enabled, show a static mascot frame instead of looping motion.

## Development Rule

Do not implement scraping first.

First implementation milestone should use mock data only and build:

- clean dashboard shell
- sidebar navigation
- Overview tab
- Grades tab
- Assignments tab
- GradeGraph mock
- Important Emails mock
- Settings mock
- local data model/types
- placeholder mascot area
- refresh status UI

After mock UI works, then plan the browser extension/local parser separately.
