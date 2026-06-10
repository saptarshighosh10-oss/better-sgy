# Better SGY — Privacy Policy

**Last updated:** June 10, 2026

Better SGY ("the extension") is a browser extension that overlays a redesigned,
student-friendly dashboard on top of your school's own Schoology website. This
policy explains exactly what the extension touches and where that information goes.

**Short version: everything stays on your device. We do not collect, transmit, sell,
or share any of your data. There are no accounts, no analytics, and no third-party
tracking.**

## What the extension accesses

Better SGY runs only on Schoology pages (`https://*.schoology.com/*`). While you are
signed in to Schoology, it reads the same information your browser already loads so it
can re-display it in a cleaner interface:

- Grades and grade history
- Assignments and due dates
- Course materials, folders, and quizzes
- Messages, notifications, and course updates
- Calendar events
- Your courses and section names

It reads this using **your own existing Schoology login session** — the same way the
normal Schoology site does. The extension never asks for, sees, or stores your
password.

## Where your data goes

**Nowhere but your own browser.** Information the extension reads is kept locally in
your browser's storage (`chrome.storage.local` / `localStorage`) so your dashboard,
saved grade snapshots, theme, and preferences persist between visits.

- We do **not** run any server, and the extension does **not** send your data to the
  developer or to any third party.
- There is **no** analytics, telemetry, advertising, or tracking of any kind.
- No personal information ever leaves your device because of this extension.

## Third-party embedded content

When you preview a course material that is a Google Docs/Slides/Sheets/Drive file or a
YouTube video, that content is loaded **directly from Google or YouTube** so it can be
shown inline, exactly as it would be on Schoology. Those requests go to Google/YouTube
and are governed by their own privacy policies. The extension does not send them any of
your Schoology data beyond the standard request needed to display the embed.

## Permissions and why they are needed

- **`storage`** — to save your preferences and dashboard data locally on your device.
- **Host access to `*.schoology.com`** — to read and restyle your Schoology pages. The
  extension requests no access to any other website.

## Data retention and deletion

All data is local. To delete it, remove the extension or clear the site data for your
Schoology domain in your browser settings. Uninstalling the extension removes its
stored data.

## Children's privacy

Better SGY is a study tool for students and collects no data itself. Because nothing is
transmitted off your device, the extension does not gather information from anyone,
including users under 13.

## Changes to this policy

If this policy changes, the "Last updated" date above will change and the new version
will be posted at this URL.

## Contact

Questions or concerns about this policy? **Open an issue on this repository** and the
developer will respond there.
