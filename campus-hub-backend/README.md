# Campus Hub backend

Gmail -> Institutional Updates -> Relevance Engine -> Duplicate consolidation.

## Quick start (no accounts needed)
    npm install
    cp .env.example .env        # Windows: copy .env.example .env
    npm test                    # 16 automated tests
    npm start                   # terminal 1  (in-memory store + fixture emails)
    npm run demo                # terminal 2  (runs all three operations)

## Go live
1. Supabase SQL editor: run sql/001_updates_backend.sql (after the base schema), then sql/002_multi_department_seed.sql
   (10 students + 10 faculty across CSE/ECE/EEE/IT/MECH, II and III year, weekly timetables). 002 replaces the older seed.sql data.
2. .env: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_ANON_KEY for the demo script).
3. Gmail: create an OAuth client (type "Desktop app", Gmail API enabled), put GMAIL_CLIENT_ID and
   GMAIL_CLIENT_SECRET in .env, run `npm run gmail:auth`, paste the printed GMAIL_REFRESH_TOKEN and
   set GMAIL_MODE=gmail. Narrow GMAIL_QUERY to your college sender, e.g. from:(@yourcollege.edu).
4. Frontend: in frontend/campus-hub.html set CONFIG.api = 'http://localhost:8787'.

## API
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health | none | status |
| POST | /api/ingest/gmail | x-admin-key | fetch + classify + dedupe + store |
| POST | /api/ingest/emails | x-admin-key | same pipeline, emails sent in the body |
| GET | /api/ingest/runs | x-admin-key | recent runs |
| GET | /api/updates?category=&unread=true&limit= | user | relevant, consolidated updates |
| GET | /api/schedule?weekday=1..7 | user | today's timetable: a student's own class, or the classes a faculty member teaches (weekends show Monday) |
| GET | /api/tasks | user | students: tasks for their department + year (with done flag). Faculty: tasks they published |
| POST | /api/tasks | faculty | publish an assignment or form to one year of their department |
| POST | /api/tasks/:id/submit | student | mark a task submitted (own class only) |
| GET | /api/broadcasts | user | students: College, own Department, own Class. Faculty: ones they sent |
| POST | /api/broadcasts | faculty | send to college, department or a year of their department |
| POST | /api/updates/:id/read | user | mark read |
| POST | /api/debug/analyze | x-admin-key | classification + audience + who would see it |
| POST | /api/debug/similarity | x-admin-key | duplicate score for two drafts |

"user" = Supabase access token (Authorization: Bearer ...). In memory mode use the header x-demo-user: S101.
