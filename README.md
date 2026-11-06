# Automatic Image Correction Portal

An academic teaching-support platform for managing image-based activities and
providing students with asynchronous, AI-assisted feedback by comparing their
submissions with instructor-provided reference images.

The project is being developed as a thesis at Politecnico di Torino.

## Table of contents

- [About the project](#about-the-project)
- [Architecture](#architecture)
- [Main features](#main-features)
- [Built with](#built-with)
- [Repository structure](#repository-structure)
- [First-time setup](#first-time-setup)
  - [Recommended: run everything with Docker](#recommended-run-everything-with-docker)
  - [Alternative: local development setup](#alternative-local-development-setup)
  - [First login and prompt configuration](#first-login-and-prompt-configuration)
  - [Outgoing email (no-reply address)](#outgoing-email-no-reply-address)
  - [Troubleshooting](#troubleshooting)
- [Correction workflow](#correction-workflow)
- [Security model](#security-model)
- [Storage](#storage)
  - [PostgreSQL data](#postgresql-data)
  - [Images](#images)
- [Roles and permissions](#roles-and-permissions)
- [Testing](#testing)
- [Documentation](#documentation)
- [Project status](#project-status)
- [Development notes](#development-notes)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## About the project

The Automatic Image Correction Portal explores how automated visual analysis
can support teaching and learning. Professors organize courses, publish
activities, and provide reference images from different viewpoints. Students
submit their own work and receive feedback based on a comparison between their
image and the selected reference.

The system is split into two applications:

- A **SvelteKit portal** for the interface, authentication, authorization,
  course management, PostgreSQL persistence, and correction workflow.
- A **Python/FastAPI server** for validated image ingestion and serialized
  analysis jobs suitable for a single-GPU machine.

This separation keeps user-facing and persistent application concerns in the
web application while isolating computational work in a dedicated service.

## Architecture

```text
┌──────────────────────┐
│       Browser        │
│ Professors/Students  │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────────────┐
│      SvelteKit portal        │
│                              │
│ UI · Auth · Authorization    │
│ Courses · Activities · APIs  │
└──────────┬──────────┬────────┘
           │          │
           │ SQL      │ Signed HTTP
           ▼          ▼
┌────────────────┐  ┌─────────────────────────┐
│   PostgreSQL   │  │ Python analysis server  │
│                │  │                         │
│ Users          │  │ Image validation        │
│ Courses        │  │ In-memory FIFO queue    │
│ Activities     │  │ Single active processor │
│ Corrections    │  └─────────────────────────┘
│ Results        │
└────────────────┘
```

SvelteKit sends the student's image and selected reference image together in a
signed multipart request. The Python service returns `202 Accepted` with a job
identifier. While the job is queued or processing, the portal polls its status;
the images themselves are uploaded only once.

## Main features

- Email-and-password authentication with verification and password recovery.
- Global admin, professor, and student roles.
- Course-specific memberships and permissions.
- Course, activity, member, and reference-image management.
- Correction sessions locked to a selected viewpoint and analysis focus.
- Comparison jobs containing both submitted and reference images.
- Bounded FIFO processing with one active image-analysis task.
- Job progress, cancellation, failure handling, and correction history.
- Anonymous-session presentation for professor-facing views.
- Course statistics and controlled publication of exam results.
- Student usefulness feedback and professor validation for thesis statistics.
- Versioned global prompts managed by admins and course overrides managed by
  professors.
- HMAC-authenticated communication between the two backend services.

## Built with

### Web application

- [SvelteKit](https://svelte.dev/docs/kit)
- [Svelte](https://svelte.dev/)
- [Vite](https://vite.dev/)
- [Bootstrap](https://getbootstrap.com/) and
  [Sveltestrap](https://sveltestrap.js.org/)
- [Better Auth](https://www.better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL](https://www.postgresql.org/)

### Analysis server

- [Python](https://www.python.org/) 3.13
- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic](https://docs.pydantic.dev/)
- [Pillow](https://python-pillow.org/)
- [Uvicorn](https://www.uvicorn.org/)
- [Docker Compose](https://docs.docker.com/compose/)

## Repository structure

```text
thesis_portal/
├── sveltekit_website/         Web portal and application APIs
│   ├── docs/                  Database documentation
│   ├── drizzle/               PostgreSQL schema baseline
│   ├── scripts/               Bootstrap scripts
│   ├── src/                   SvelteKit application
│   └── tests/                 Unit and integration tests
├── python_server/             Image-analysis queue service
│   ├── app/                   FastAPI application and queue
│   └── tests/                 API, security, and queue tests
├── .gitignore
└── README.md
```

Detailed component documentation:

- [Docker: portal, PostgreSQL and Python service](DOCKER.md)
- [SvelteKit portal README](sveltekit_website/README.md)
- [Python server README](python_server/README.md)
- [Database architecture](sveltekit_website/docs/database.md)

## First-time setup

The recommended setup runs SvelteKit, PostgreSQL, and the Python worker in one
Docker Compose stack. It is the shortest and most reproducible way to start the
complete project. Use the local-development setup only when you need hot reload
or want to work on the individual services.

### Recommended: run everything with Docker

#### 1. Install the prerequisites

Install:

- Git;
- Docker Desktop, or Docker Engine with Docker Compose v2;
- Ollama only if you want real model responses. Ollama is not required when the
  stack runs in development/mock mode.

The stack binds the portal, PostgreSQL, and Python worker to local ports `5173`,
`5432`, and `8000`. Make sure those ports are available.

#### 2. Clone and configure the project

```sh
git clone <repository-url>
cd thesis_portal
cp docker.env.example docker.env
```

Open `docker.env` and replace these three placeholders with different random
values:

```dotenv
POSTGRES_PASSWORD=<random-database-password>
BETTER_AUTH_SECRET=<random-authentication-secret>
PYTHON_SERVER_HMAC_SECRET=<random-worker-secret>
```

Generate each value with:

```sh
openssl rand -hex 32
```

`docker.env` is ignored by Git. Do not commit it.

For the easiest first run, enable the mock processor:

```dotenv
DEVELOPMENT_MODE=true
```

Mock mode exercises the complete upload, queue, polling, result, and feedback
flow without contacting Ollama. To use a real model instead, keep
`DEVELOPMENT_MODE=false`, start Ollama on the host, and install the model named
by `OLLAMA_ALLOWED_MODELS`:

```sh
ollama serve
# In another terminal:
ollama pull qwen3.8:27b
```

If you select a different model in a prompt template, add exactly that model
name to the comma-separated `OLLAMA_ALLOWED_MODELS` value and install it in
Ollama. The default Docker configuration reaches the host at
`http://host.docker.internal:11434/api/chat`.

#### 3. Configure the initial accounts

Before the first startup, configure the three required bootstrap accounts and
a shared password of at least eight characters. Email addresses must use the
`@polito.it` domain.

```dotenv
INITIAL_USERS_PASSWORD=<temporary-strong-password>
INITIAL_ADMIN_EMAIL=admin@polito.it
INITIAL_ADMIN_NAME=Initial
INITIAL_ADMIN_SURNAME=Admin
INITIAL_PROFESSOR_EMAIL=professor@polito.it
INITIAL_PROFESSOR_NAME=Initial
INITIAL_PROFESSOR_SURNAME=Professor
INITIAL_STUDENT_EMAIL=student@polito.it
INITIAL_STUDENT_NAME=Initial
INITIAL_STUDENT_SURNAME=Student
```

Change these example addresses before using the project outside a disposable
local environment.

#### 4. Build and start the stack

Run from the repository root:

```sh
docker compose --env-file docker.env up --build -d
```

The first build can take several minutes. Check that all services become
healthy:

```sh
docker compose --env-file docker.env ps
docker compose --env-file docker.env logs -f web db image-api
```

Press `Ctrl+C` to stop following the logs; the containers keep running.

On the first start of an empty PostgreSQL volume, Docker automatically loads
the single schema baseline at
`sveltekit_website/drizzle/0000_initial_schema.sql`. It also inserts the initial
global prompt templates. The baseline is not rerun for an existing volume.

#### 5. Create the bootstrap users

After the `web` service is healthy, run:

```sh
docker compose --env-file docker.env exec web node scripts/seed-initial-users.mjs
```

The command is idempotent: running it again updates the configured bootstrap
accounts instead of creating duplicates.

#### 6. Verify the installation

Open the portal at [http://localhost:5173](http://localhost:5173) and verify the
Python worker:

```sh
curl http://127.0.0.1:8000/health/live
```

The response should report a healthy service. PostgreSQL is available to local
database tools at `127.0.0.1:5432` using the credentials in `docker.env`.

To stop the stack while preserving the database:

```sh
docker compose --env-file docker.env down
```

To rebuild after a source-code change:

```sh
docker compose --env-file docker.env up --build -d
```

Do not add `-v` to `docker compose down` unless you intentionally want to
delete the PostgreSQL volume and all local project data.

### Alternative: local development setup

For local development, install Node.js `20.19.0` or newer (or `22.12.0` or
newer), npm, PostgreSQL, and Python 3.13. Run the following services in separate
terminals.

#### 1. Create and initialize PostgreSQL

Create an empty database using your local PostgreSQL account. This example uses
the database name `thesis_portal`:

```sh
createdb thesis_portal
psql "postgresql://localhost/thesis_portal" \
  -f sveltekit_website/drizzle/0000_initial_schema.sql
```

If your PostgreSQL installation requires a username and password, use a full
connection URL such as
`postgresql://username:password@localhost:5432/thesis_portal` in both the
`psql` command and `DATABASE_URL` below.

The baseline is intended only for an empty database. Do not run it again over
an initialized database.

#### 2. Start the Python worker

```sh
cd python_server
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Generate a secret with `openssl rand -hex 32` and assign it to `HMAC_SECRET` in
`python_server/.env`. For a first run, set `DEVELOPMENT_MODE=true`. For real
Ollama processing, use:

```dotenv
DEVELOPMENT_MODE=false
OLLAMA_CHAT_URL=http://127.0.0.1:11434/api/chat
OLLAMA_ALLOWED_MODELS=qwen3.8:27b
```

Then start the worker:

```sh
uvicorn app.main:app --reload --env-file .env
```

It listens at `http://127.0.0.1:8000`; its liveness endpoint is
`http://127.0.0.1:8000/health/live`.

#### 3. Start SvelteKit

In another terminal:

```sh
cd sveltekit_website
npm install
cp .env.sample .env
```

Configure at least these values in `sveltekit_website/.env`:

```dotenv
DATABASE_URL=postgresql://localhost/thesis_portal
BETTER_AUTH_SECRET=<another-random-secret>
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_CLIENT_URL=http://localhost:5173
PUBLIC_URL=http://localhost:5173
PYTHON_SERVER_URL=http://127.0.0.1:8000
PYTHON_SERVER_HMAC_SECRET=<the-exact-value-of-python-HMAC_SECRET>
```

The two HMAC values must match exactly. Add the `INITIAL_*` account variables
shown in `.env.sample`, then initialize the users and start the portal:

```sh
npm run db:seed-initial-users
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### First login and prompt configuration

1. Sign in with one of the seeded accounts.
2. An admin can open **Prompt globali** (`/prompt`) to create new revisions of
   the five base prompt types. Global prompt management is admin-only.
3. A professor who manages a course can open that course and select **Prompt**
   to define course-specific overrides. Professors cannot change global
   prompts.
4. A professor can add activity-specific evaluation instructions while
   creating or editing an activity. Exam prompt instructions become immutable
   when the exam starts or its first submission is evaluated.
5. A student can join an authorized course, select an activity and reference
   view, upload an image, and request a correction.
6. After receiving a correction, the student can report whether it was useful.
   The professor can review correctness, allowing the portal to aggregate
   thesis statistics by prompt version and model.

SvelteKit is solely responsible for selecting, composing, versioning, hashing,
and storing prompts. Python validates the signed input parameters, queues the
job, invokes the selected allowed model, and returns the worker result.

SMTP is optional for seeded local accounts. Registration verification and
password-reset email require the `SMTP_*` variables documented in the
[SvelteKit README](sveltekit_website/README.md) and a sending address, as
described in [Outgoing email (no-reply address)](#outgoing-email-no-reply-address).

### Outgoing email (no-reply address)

The portal sends automatic messages only: account verification, password
reset, and other notifications. Nobody reads replies to them, so the
recommendation is a dedicated **no-reply mailbox** used only by the portal
rather than a personal account, for example:

```text
noreply@<portal-domain>
```

A dedicated address keeps personal credentials out of the server
configuration, can be rotated or revoked without affecting anyone's mailbox,
and makes it obvious to recipients that the message is automated.

#### 1. Create the mailbox

Choose one of these options:

- **Institutional mailbox (preferred for a Politecnico deployment).** Ask the
  university IT services for a service or functional account such as
  `noreply-correction-portal@polito.it`, together with its SMTP host, port,
  and credentials (or an app password if the account uses multi-factor
  authentication).
- **Transactional email provider.** Use a service such as Brevo, Mailgun,
  Postmark, Amazon SES, or Resend with a domain you control. Verify the
  domain and create SMTP credentials for the `noreply@` sender.
- **Generic mail provider (testing only).** A dedicated Gmail or Outlook
  account with an app password works for small tests, but has strict sending
  limits and is more likely to be marked as spam.

When you control the sending domain, publish the **SPF**, **DKIM**, and
**DMARC** DNS records requested by the provider. Without them, verification
and reset email will often land in spam or be rejected.

#### 2. Configure the portal

Set the SMTP variables in `docker.env` (Docker) or
`sveltekit_website/.env` (local development):

```sh
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false          # true only for implicit TLS, usually port 465
SMTP_USER=noreply@example.com
SMTP_PASSWORD=<smtp-password-or-app-password>
MAIL_FROM="Correction Portal <noreply@example.com>"
```

`MAIL_FROM` accepts a display name followed by the address in angle brackets.
Always set it explicitly in Docker: Compose passes an empty `MAIL_FROM` when
it is missing, so the `SMTP_USER` fallback does not apply. Most providers also
require `MAIL_FROM` to match the authenticated account or a verified sender.

#### 3. Make the no-reply nature clear

- Mention in the email templates that the address is not monitored and point
  users to the portal's **Supporto** page for help.
- Optionally configure the mailbox to auto-reply or discard incoming mail, so
  replies do not accumulate unread.
- Keep the SMTP password out of version control; `docker.env` and `.env`
  must stay local.

After restarting the `web` service, register a test account or request a
password reset and check that the message arrives from the no-reply address.

### Troubleshooting

#### A container is unhealthy or exits

```sh
docker compose --env-file docker.env ps
docker compose --env-file docker.env logs --tail=200 web db image-api
```

Common causes are placeholder secrets, an occupied host port, or an existing
database volume with an older schema.

#### The portal cannot contact Python

- In the root Docker stack, keep `PYTHON_SERVER_URL=http://image-api:8000`.
- In a local setup, use `PYTHON_SERVER_URL=http://127.0.0.1:8000`.
- Confirm that `PYTHON_SERVER_HMAC_SECRET` exactly equals Python's
  `HMAC_SECRET`.
- Check `curl http://127.0.0.1:8000/health/live`.

#### Ollama requests fail

- Set `DEVELOPMENT_MODE=true` to verify the rest of the application first.
- Confirm that Ollama is listening on port `11434`.
- Confirm that the prompt's model is installed and appears in
  `OLLAMA_ALLOWED_MODELS`.
- Review the worker logs with
  `docker compose --env-file docker.env logs -f image-api`.

#### The database schema did not update

The baseline runs only when Docker creates an empty PostgreSQL volume. Back up
any data that must be retained. For disposable local data only, recreate the
stack and its database volume with:

```sh
docker compose --env-file docker.env down -v
docker compose --env-file docker.env up --build -d
```

The first command permanently deletes the Docker-managed local database.

## Correction workflow

1. A professor creates a course and authorizes its members.
2. The professor creates an activity and uploads one or more reference images.
3. A student opens a correction session and selects a reference viewpoint and
   analysis focus.
4. The student uploads an image.
5. SvelteKit resolves the global or course prompt revision, applies the
   activity instructions, and stores an immutable prompt snapshot.
6. SvelteKit retrieves the selected reference from PostgreSQL and sends both
   images and the complete prompt snapshot to Python in one authenticated
   multipart request.
7. Python validates the parameters and both images, queues the job, and returns
   its identifier.
8. The web page polls the job every five seconds while it is queued or
   processing.
9. Python processes one job at a time, calls Ollama unless mock mode is active,
   and exposes the result when complete.
10. SvelteKit validates and saves the final response in the student's
    correction attempt.
11. The student can rate usefulness, and a professor can assess correctness for
    the aggregated statistics.

Repeated job-status requests do not re-upload either image. Python is a
transport and execution worker; prompt creation and persistence remain in
SvelteKit.

## Security model

- Browser users authenticate through Better Auth and server-managed sessions.
- SvelteKit services enforce global roles and course memberships.
- The Python server is not called directly by the browser.
- Every Python `/v1/*` request is signed by the SvelteKit backend with
  HMAC-SHA256.
- Signatures cover the method, path and query, timestamp, nonce, and exact body
  bytes.
- Timestamps limit request age and nonces mitigate replay attacks.
- HMAC provides authentication and integrity, not encryption. Use HTTPS or a
  trusted private network between services.
- Secrets and `.env` files must never be committed.

## Storage

The portal keeps structured data in PostgreSQL and image files on the local
filesystem of the `web` container. The Python worker stores nothing on disk.

### PostgreSQL data

In the Docker stack the database is the `db` service, built from the
`postgres:17-alpine` image (see `compose.yaml`).

| Item | Value |
| --- | --- |
| Service name | `db` (reachable as `db:5432` inside the `thesis-portal-network` network) |
| Host port | `127.0.0.1:${POSTGRES_PORT}`, default `127.0.0.1:5432`; not exposed on other interfaces |
| Data directory | `/var/lib/postgresql/data` inside the container |
| Docker volume | `postgres_data`, created by Compose as `thesis-portal_postgres_data` |
| Database name | `POSTGRES_DB` from `docker.env`, default `thesis_portal` |
| User | `POSTGRES_USER` from `docker.env`, default `thesis_user` |
| Password | `POSTGRES_PASSWORD` from `docker.env`; required, Compose refuses to start without it |

The `web` service does not read these variables directly. Compose builds its
`DATABASE_URL` from them as
`postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`.

The schema file `sveltekit_website/drizzle/0000_initial_schema.sql` is mounted
read-only into `/docker-entrypoint-initdb.d/`. PostgreSQL runs it only when the
data directory is empty, which in practice means the first start of a new
volume. Later changes to that file are not applied to an existing volume.

In a local, non-Docker setup the database is whatever `DATABASE_URL` in
`sveltekit_website/.env` points to.

#### Backing up the database

There is no automatic backup: Compose defines no backup service or schedule,
so dumps have to be taken by hand or by an external cron job.

The commands below run from the repository root while the stack is up. They
use the credentials already set inside the `db` container, so nothing has to
be typed in.

```sh
docker compose --env-file docker.env exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > thesis_portal.dump
```

To restore that dump into the running database (existing objects are dropped
and recreated):

```sh
docker compose --env-file docker.env exec -T db \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < thesis_portal.dump
```

A database dump does not include image files. Back them up separately, as
described in [Images](#images).

#### Resetting the database

`docker compose --env-file docker.env down` stops the containers and keeps
both volumes. To start again from an empty database, remove the PostgreSQL
volume and start the stack; the schema baseline then runs again.

Warning: removing the volume permanently deletes every user, course,
activity, correction and result. Take a dump first if you might need them.

```sh
docker compose --env-file docker.env down
docker volume rm thesis-portal_postgres_data
docker compose --env-file docker.env up -d
docker compose --env-file docker.env exec web node scripts/seed-initial-users.mjs
```

`docker compose down -v` also works, but it deletes the image volume as well.
After a database reset, files left in the image volume are no longer referenced
by any row.

### Images

Image binaries are written by
`sveltekit_website/src/lib/server/services/local-storage.service.js` into the
directory named by `LOCAL_STORAGE_PATH`.

| Setup | Location |
| --- | --- |
| Docker | `/app/storage` in the `web` container, on the named volume `local_storage` (`thesis-portal_local_storage`) |
| Local development | `LOCAL_STORAGE_PATH` in `sveltekit_website/.env`; the sample value `./storage` resolves to `sveltekit_website/storage/`, which is ignored by Git |

There is no object storage and no bind mount for images.

#### What is stored, and where

| Data | On disk | In PostgreSQL |
| --- | --- | --- |
| Activity reference images (max 350 KB each when compressed, otherwise `MAX_IMAGE_MB`; up to 6 per activity) | `reference-images/YYYY/MM/<uuid>.<ext>` | `activity_reference_image`: `storage_key`, original filename, MIME type, view type, label, alt text, order |
| Exam submission images (max `MAX_IMAGE_MB` each, default 5 MB; one per reference view) | `exam-submissions/YYYY/MM/<uuid>.<ext>` | `exam_submission_file`: `storage_key`, revision, original filename, MIME type, current/replaced/removed flags |
| Images sent for a lesson correction (max `MAX_IMAGE_MB`, default 5 MB) | Not stored | `correction_attempt` keeps only the original file name; the analysis result and prompt snapshot go to `correction_attempt` and `analysis_job` |

Reference images are still compressed to 350 KB before they're stored. That's
a storage choice, separate from the upload limit. Set
`COMPRESS_REFERENCE_IMAGES=false` in `docker.env` to store them as uploaded
instead (up to `MAX_IMAGE_MB` each); existing images are not changed.

The folder and month in the key come from the upload time in UTC, the file
name is a random UUID, and the extension (`jpg`, `png`, `webp` or `avif`) comes
from the validated MIME type. The original file name is kept only in the
database. The `storage_key` column holds the public path
`/api/storage/<key>`, not a filesystem path. Older rows may still contain an
inline `data:` URL instead; the correction flow still accepts those.

Files are served by `GET /api/storage/<key>`
(`src/routes/api/storage/[...key]/+server.js`). The route requires a logged-in
user, rejects keys that do not match the expected pattern or that try to leave
the storage directory, and answers with `Cache-Control: private, max-age=3600`.
It also checks that the caller may see the file
(`stored-file-access.service.js`): reference images follow activity access;
exam submissions are readable only by course managers and by the submitting
student while their membership is active. Unknown keys return 404. See
[Roles and permissions](#roles-and-permissions).

For a correction job, SvelteKit reads the reference image from disk, takes the
student image from the request, and sends both to Python in one signed
multipart request. Python keeps them in memory only. A finished job, including
both image byte arrays, stays in memory until more than `COMPLETED_JOB_LIMIT`
(default 500) jobs have finished, or until the worker restarts.

#### Retention and cleanup

There is no scheduled cleanup. Files are deleted only in these cases:

- a reference image is deleted, or dropped when the activity's image set is
  saved again;
- an upload fails and the files written for it are rolled back.

Files stay on disk in these cases:

- an exam file is replaced or removed by the student (the old revision is kept
  for the audit history);
- an activity, course or user is deleted (the database rows are removed by
  `ON DELETE CASCADE`, the files are not);
- the database is reset while the image volume is kept.

#### Backing up images

Copy the storage directory out of the running container, and copy it back to
restore:

```sh
docker compose --env-file docker.env cp web:/app/storage ./storage-backup
docker compose --env-file docker.env cp ./storage-backup/. web:/app/storage
```

Back up the database and the images at the same time, since each
`storage_key` must match a file.

## Roles and permissions

Access depends on two separate things:

- the global role in `user.role` (`admin`, `professor`, `student`; PostgreSQL
  enum `app_user_role`, default `student`);
- the per-course membership in `course_member` (`PROFESSOR` or `STUDENT`,
  status `ACTIVE`, `SUSPENDED` or `REMOVED`).

The checks are in the SvelteKit services under
`sveltekit_website/src/lib/server/services/`. Page guards in `+layout.server.js`
and `+page.server.js` only redirect; the API is what actually enforces access.
A banned user is treated as logged out (`src/hooks.server.js`).

A course manager is any admin, or a user with global role `professor` and an
`ACTIVE` `PROFESSOR` membership in that course (`canManage` in
`course.service.js`). Creating a course gives no rights of its own: a database
trigger gives the creator an `ACTIVE` `PROFESSOR` membership, and suspending or
removing it takes their manager rights away like for any other professor. A
course member is a user with an `ACTIVE` membership in an active course.

Accounts are only created by an admin (`POST /api/utenti`) or by the bootstrap
script; Better Auth's public sign-up is disabled (`disableSignUp`). The Better
Auth admin plugin endpoints (`/api/auth/admin/*`) answer 403 to HTTP requests
and are only reached through `auth.api.*` calls from `users.service.js`
(`src/lib/server/auth/admin-endpoints.js`). Impersonation is disabled.

### What each role can do

| Area | Admin | Professor | Student |
| --- | --- | --- | --- |
| Log in, reset or change own password (`/profilo`) | Yes | Yes | Yes |
| Edit own name and surname (`PATCH /api/utenti/[id]`, no page uses it yet) | Yes, and any other user | Own only | Own only |
| Delete own account (Better Auth `/api/auth/delete-user`) | No, blocked for admins | Yes | Yes |
| Users list and details (`/studenti`, `GET /api/utenti`) | All users | Only `ACTIVE` members of courses they manage; 403 if they manage none | No (page redirects, API 403); can read own record |
| Create, edit, ban, delete users; change roles (`/studenti/aggiungi`, `POST/PATCH/DELETE /api/utenti`) | Yes | No (page redirects) | No |
| Course list (`/corsi`) | All courses | Courses they manage (also inactive), plus active courses they are a member of | Active courses they are a member of |
| Create a course (`/corsi/aggiungi`, `POST /api/corsi`) | Yes | Yes, and becomes its `PROFESSOR` member | No (menu entry hidden, page redirects) |
| Edit or delete a course, manage members, import emails (`/corsi/[id]/modifica`, `/api/membri`, `/api/corsi/import`) | Yes | Only as course manager | No; can only enrol themselves through a valid invitation with a verified email |
| View activities and reference images | All | All in managed courses; published and open ones elsewhere | Published activities that have opened (lessons also close at their end date; exams stay visible) |
| Create, edit, delete activities and reference images | Yes | Only as course manager | No |
| Course prompt overrides (`/corsi/[id]/prompt`, `/api/prompt-template?courseId=`) | Yes | Only as course manager | No |
| Global prompts (`/prompt`, `/api/prompt-template` without `courseId`) | Yes | No | No |
| Start a lesson correction (`/correzione`, `POST /api/sessioni-correzione`, `.../job`) | Yes, even without membership | As a member of the course | As a member of the course |
| See correction sessions and attempts | All in the course, anonymous ones without identity | All in managed courses, anonymous ones without identity; own elsewhere while still a member | Own only, while still a member of the course |
| Delete a correction session or attempt (API only) | Yes | Any in managed courses; elsewhere only own sessions without attempts | Only own sessions without attempts (used to roll back a failed first submission) |
| Rate a correction as useful | No (managers give the verdict) | Own completed attempts, in courses where they are an `ACTIVE` `STUDENT` member | Own completed attempts, as an `ACTIVE` `STUDENT` member |
| Mark a correction correct, partial or incorrect | Yes | Only as course manager | No |
| Correction statistics (`/corsi/[id]/statistiche`, `/api/feedback-correzione/statistiche`) | Yes | Only as course manager | No |
| Upload or remove exam files (`/api/consegne-esame`) | No | Only as an `ACTIVE` `STUDENT` member, while the exam is open | `ACTIVE` `STUDENT` members, while the exam is open |
| See exam submissions | All | All in managed courses | Own |
| Grade and publish exam results (`/api/risultati`) | Yes | Only as course manager | No |
| See exam results | All | All in managed courses; own as a `STUDENT` member, after publication and release date | Own, after publication and release date |
| Open and read own support tickets (`/supporto`, `POST/GET /api/supporto`) | Yes | Yes | Yes |
| See all tickets and change their status (`/supporto/gestione`, `PATCH /api/supporto/[id]`) | Yes | No | No |
| Read stored images (`/api/storage/*`) | Any referenced file | Reference images of activities they can view; exam files of managed courses or their own | Reference images of activities they can view; own exam files while still a member |

`/api/storage/<key>` looks the key up in `activity_reference_image` or
`exam_submission_file` (`stored-file-access.service.js`); keys that no row
references get 404.

Pages under `/studenti` are restricted to admins and professors by
`src/routes/(protected)/(professore)/+layout.server.js`, and
`/studenti/aggiungi` to admins. `/corsi/aggiungi` redirects students, `/prompt`
and `/supporto/gestione` redirect non-admins, and `/corsi/[id]/prompt`
redirects non-managers. The other course and activity pages have no
server-side guard; they rely on the API refusing the request and on
`canManage` returned with the course to hide controls.

### Known gaps between the interface and the API

Fixed: open sign-up, unchecked `/api/storage` reads, the unguarded
`/corsi/aggiungi` and `/studenti/aggiungi` pages, student deletion of counted
corrections, creator rights without an active membership, inactive members in
the professor user list, the global `student` role checks for ratings, exam
uploads and exam results, session and attempt access after suspension, direct
calls to the admin plugin endpoints, the unused `project` permissions and the
`professore`/`studente` role checks in `ProfileDropdown.svelte`.

Decisions taken while fixing them:

- The professor user list shows only `ACTIVE` members. Suspended and removed
  members stay visible, and can be restored, in the course member table
  (`/api/membri`), which lists every status.
- Deleting a correction attempt, or a session that has attempts, is reserved
  to course managers. Every attempt counts toward the activity's correction
  limit, so a manager deleting one gives the student that correction back.
  The feedback of a deleted attempt is deleted with it.
- A course whose last active professor is suspended or removed can only be
  managed by an admin until a membership is restored.

Still open:

- Stored images are sent with `Cache-Control: private, max-age=3600`, so a
  user who loses access can still see an image their browser cached in the
  last hour.
- An admin is always a course manager, so they cannot rate corrections or
  upload exam files even when enrolled as a `STUDENT` member.

## Testing

### SvelteKit

```sh
cd sveltekit_website
npm run check
npm test
```

The integration suite requires a disposable PostgreSQL database whose name
contains `test`:

```sh
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/portal_test" \
  npm run test:integration
```

### Python

```sh
cd python_server
python -m pip install -r requirements-dev.txt
HMAC_SECRET="0123456789abcdef0123456789abcdef" pytest -q
```

Refer to each component README for test scope and safety notes.

## Documentation

| Document | Contents |
| --- | --- |
| [Docker stack](DOCKER.md) | Full-stack Compose configuration, lifecycle, initial users, existing volumes, and production notes. |
| [SvelteKit portal](sveltekit_website/README.md) | Installation, environment variables, roles, application scripts, testing, and deployment. |
| [Python server](python_server/README.md) | Queue lifecycle, API contract, HMAC authentication, Docker setup, validation, and processor extension. |
| [Database architecture](sveltekit_website/docs/database.md) | PostgreSQL schema, relationships, authorization model, constraints, API coverage, and limitations. |
| [Institutional login (future work)](sveltekit_website/docs/institutional-login.md) | Design for restricting access to PoliTo accounts through SAML/IDEM or Entra ID SSO. |

## Project status

This is a thesis project. The main course, activity, membership,
correction, and result workflows are implemented. The Python queue and
two-image transport are operational, and the worker can send the immutable
SvelteKit-authored prompt snapshot to Ollama. Development mode provides a mock
result when Ollama is not available.

Important current constraints include:

- Python queue state and replay-protection nonces are in memory.
- Only one Python process and one active processor are supported.
- Restarting the analysis service loses its jobs and results.
- The web client discovers job updates through polling.
- Some database resources described in the baseline are not exposed yet.

## Development notes

This is a single-author thesis project, so outside contributions are not
expected. When changing the code:

- Keep credentials and `.env` files out of version control.
- Change the multipart and HMAC contracts, job fields and response models in
  both services at the same time.
- Run the static checks, unit tests and integration tests listed in
  [Testing](#testing), and update this README when behaviour changes.

## License

No license file is currently included. Until a license is added, the project
should be treated as all rights reserved.

## Acknowledgments

- Politecnico di Torino for the academic context.
- The open-source communities behind SvelteKit, FastAPI, PostgreSQL, Better
  Auth, Drizzle ORM, Pillow, and the other project dependencies.
