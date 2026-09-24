# Automatic Image Correction Portal

<!-- Inspired by https://github.com/othneildrew/Best-README-Template -->

An academic teaching-support platform for managing image-based activities and
providing students with asynchronous, AI-assisted feedback by comparing their
submissions with instructor-provided reference images.

The project is being developed as a thesis at Politecnico di Torino and is
currently in an alpha stage.

## Table of contents

- [About the project](#about-the-project)
- [Architecture](#architecture)
- [Main features](#main-features)
- [Built with](#built-with)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Configure PostgreSQL](#1-configure-postgresql)
  - [2. Start the Python server](#2-start-the-python-server)
  - [3. Start the SvelteKit application](#3-start-the-sveltekit-application)
- [Correction workflow](#correction-workflow)
- [Security model](#security-model)
- [Testing](#testing)
- [Documentation](#documentation)
- [Project status](#project-status)
- [Contributing](#contributing)
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
- Global developer, professor, and student roles.
- Course-specific memberships and permissions.
- Course, activity, member, and reference-image management.
- Correction sessions locked to a selected viewpoint and analysis focus.
- Comparison jobs containing both submitted and reference images.
- Bounded FIFO processing with one active image-analysis task.
- Job progress, cancellation, failure handling, and correction history.
- Anonymous-session presentation for professor-facing views.
- Course statistics and controlled publication of exam results.
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

- [SvelteKit portal README](sveltekit_website/README.md)
- [Python server README](python_server/README.md)
- [Database architecture](sveltekit_website/docs/database.md)

## Getting started

### Prerequisites

- Git
- Node.js `20.19.0` or newer, or Node.js `22.12.0` or newer
- npm
- PostgreSQL
- Docker and Docker Compose for the recommended Python server setup

Clone the repository and enter its directory:

```sh
git clone <repository-url>
cd thesis_portal
```

### 1. Configure PostgreSQL

Create a PostgreSQL database and initialize it with the complete schema:

```sh
cd sveltekit_website
cp .env.sample .env
# Set DATABASE_URL in .env before continuing.
psql "$DATABASE_URL" -f drizzle/0000_initial_schema.sql
cd ..
```

Do not use `drizzle/0001_nuke_system.sql` for normal initialization. It drops
and recreates the entire `public` schema.

See [Database architecture](sveltekit_website/docs/database.md) for the schema,
relationships, authorization rules, API coverage, and known limitations.

### 2. Start the Python server

```sh
cd python_server
cp .env.example .env
openssl rand -hex 32
# Put the generated value in .env as HMAC_SECRET.
docker compose up --build
```

By default, the service listens on `http://127.0.0.1:8000`. Keep this terminal
open, then return to the repository root in another terminal.

For local Python setup, configuration details, and API documentation, see the
[Python server README](python_server/README.md).

### 3. Start the SvelteKit application

```sh
cd sveltekit_website
npm install
cp .env.sample .env
```

Configure at least:

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
BETTER_AUTH_SECRET=<another-long-random-secret>
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_CLIENT_URL=http://localhost:5173
PYTHON_SERVER_URL=http://127.0.0.1:8000
PYTHON_SERVER_HMAC_SECRET=<the-python-server-HMAC_SECRET>
```

The value of `PYTHON_SERVER_HMAC_SECRET` must exactly match `HMAC_SECRET` in
`python_server/.env`.

Start the portal:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Optional bootstrap accounts can be created after configuring the `INITIAL_*`
environment variables:

```sh
npm run db:seed-initial-users
```

Complete application, SMTP, authentication, and bootstrap configuration is
documented in the [SvelteKit portal README](sveltekit_website/README.md).

## Correction workflow

1. A professor creates a course and authorizes its members.
2. The professor creates an activity and uploads one or more reference images.
3. A student opens a correction session and selects a reference viewpoint and
   analysis focus.
4. The student uploads an image.
5. SvelteKit retrieves the selected reference from PostgreSQL and sends both
   images to Python in one authenticated multipart request.
6. Python validates both images, queues the job, and returns its identifier.
7. The web page polls the job every five seconds while it is queued or
   processing.
8. Python processes one job at a time and exposes the result when complete.
9. SvelteKit saves the final response in the student's correction attempt.

The current Python processor deliberately waits 180 seconds and returns a
placeholder result. Repeated job-status requests during this period are
expected and do not re-upload either image.

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
| [SvelteKit portal](sveltekit_website/README.md) | Installation, environment variables, roles, application scripts, testing, and deployment. |
| [Python server](python_server/README.md) | Queue lifecycle, API contract, HMAC authentication, Docker setup, validation, and processor extension. |
| [Database architecture](sveltekit_website/docs/database.md) | PostgreSQL schema, relationships, authorization model, constraints, API coverage, and limitations. |

## Project status

This is an alpha thesis project. The main course, activity, membership,
correction, and result workflows are implemented. The Python queue and
two-image transport are operational, but the actual AI/Ollama image-comparison
logic is still represented by a placeholder processor.

Important current constraints include:

- Python queue state and replay-protection nonces are in memory.
- Only one Python process and one active processor are supported.
- Restarting the analysis service loses its jobs and results.
- The web client discovers job updates through polling.
- Some database resources described in the baseline are not exposed yet.

## Contributing

1. Create a focused branch.
2. Keep credentials and `.env` files out of version control.
3. Preserve the shared multipart and HMAC contracts when changing either
   backend.
4. Update both services together when changing job fields or response models.
5. Run the relevant static checks, unit tests, and integration tests.
6. Update the component documentation and this README when behavior changes.

## License

No license file is currently included. Until a license is added, the project
should be treated as all rights reserved.

## Acknowledgments

- README structure inspired by the
  [Best README Template](https://github.com/othneildrew/Best-README-Template).
- Politecnico di Torino for the academic context.
- The open-source communities behind SvelteKit, FastAPI, PostgreSQL, Better
  Auth, Drizzle ORM, Pillow, and the other project dependencies.
