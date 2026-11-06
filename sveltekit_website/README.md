# Automatic Image Correction Portal

<!-- Inspired by https://github.com/othneildrew/Best-README-Template -->

A SvelteKit teaching-support portal for managing courses, publishing image-based
activities, and providing students with asynchronous, AI-assisted feedback by
comparing their submissions with instructor-provided reference images.

The application is being developed as a thesis project for Politecnico di
Torino.

## Table of contents

- [About the project](#about-the-project)
  - [Main features](#main-features)
  - [Built with](#built-with)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment variables](#environment-variables)
  - [Database setup](#database-setup)
  - [Initial users](#initial-users)
- [Usage](#usage)
  - [Image-correction workflow](#image-correction-workflow)
  - [Roles](#roles)
  - [Localization](#localization)
- [Project structure](#project-structure)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project status](#project-status)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## About the project

The portal supports a course workflow in which professors create activities and
upload reference images from one or more viewpoints. Students select a
reference view, submit their own image, and choose an analysis focus such as
camera, lighting, materials, or texture.

SvelteKit handles the user interface, authentication, authorization, database
operations, and the signed communication with a separate Python image-analysis
service. Analysis jobs are asynchronous: the application submits both the
student image and its selected reference image, receives a job identifier, and
polls the worker until the job completes or fails.

### Main features

- Email-and-password authentication with email verification and password reset.
- Global `admin`, `professor`, and `student` roles.
- Course-specific memberships and authorization.
- Course, member, activity, and reference-image management.
- Student correction sessions with a fixed reference view and analysis focus.
- Asynchronous image-analysis jobs with queue status tracking.
- Correction history, anonymous-session presentation, and course statistics.
- Exam-result management with publication controls.
- Signed server-to-server communication with the Python worker using
  HMAC-SHA256, timestamps, and nonces.

### Built with

- [SvelteKit](https://svelte.dev/docs/kit)
- [Svelte](https://svelte.dev/)
- [svelte-i18n](https://github.com/kaisermann/svelte-i18n)
- [Vite](https://vite.dev/)
- [Bootstrap](https://getbootstrap.com/) and
  [Sveltestrap](https://sveltestrap.js.org/)
- [Better Auth](https://www.better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL](https://www.postgresql.org/)
- [Vitest](https://vitest.dev/)
- [Nodemailer](https://nodemailer.com/)

## Getting started

### Prerequisites

Install the following software before running the application locally:

- Node.js `20.19.0` or newer, or Node.js `22.12.0` or newer
- npm
- PostgreSQL
- The companion Python analysis server, if image-analysis jobs should be
  available

The version requirement above comes from the installed Vite version.

### Installation

1. Open the SvelteKit project directory:

   ```sh
   cd sveltekit_website
   ```

2. Install the dependencies:

   ```sh
   npm install
   ```

3. Create the local environment file:

   ```sh
   cp .env.sample .env
   ```

4. Configure `.env` using the variables described below.

5. Initialize the PostgreSQL schema and, optionally, seed the initial users.

6. Start the development server:

   ```sh
   npm run dev
   ```

7. Open [http://localhost:5173](http://localhost:5173).

### Environment variables

Keep `.env` private. It contains database credentials, authentication secrets,
SMTP credentials, and the shared secret used to authenticate requests to the
Python service.

#### Application and authentication

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL used by the application and Drizzle. |
| `LOCAL_STORAGE_PATH` | Yes | Server-local folder for uploaded image binaries. Relative paths are resolved from the application working directory. PostgreSQL stores only file metadata and a local URL. |
| `BETTER_AUTH_SECRET` | Yes | Long, random secret used by Better Auth. |
| `BETTER_AUTH_URL` | Yes | Public base URL of the application, such as `http://localhost:5173`. |
| `BETTER_AUTH_CLIENT_URL` | Recommended | Browser-facing callback URL. Defaults to `http://localhost:5173` in some flows. |
| `PUBLIC_URL` | Optional | Additional trusted application origin. |

Generate a development authentication secret with a cryptographically secure
tool, for example:

```sh
openssl rand -hex 32
```

#### Python analysis service

| Variable | Required | Description |
| --- | --- | --- |
| `PYTHON_SERVER_URL` | For analysis | Base URL of the Python service, for example `http://127.0.0.1:8000`. |
| `PYTHON_SERVER_HMAC_SECRET` | For analysis | Shared HMAC secret. It must exactly match the Python server's `HMAC_SECRET`. |

When the Python variables are absent, the portal remains available but new
analysis jobs are reported as unavailable.

#### Email delivery

| Variable | Required | Description |
| --- | --- | --- |
| `SMTP_HOST` | For email | SMTP server hostname. |
| `SMTP_PORT` | Optional | SMTP port; defaults to `587`. |
| `SMTP_SECURE` | Optional | Set to `true` for a secure SMTP connection. |
| `SMTP_USER` | Optional | SMTP username. |
| `SMTP_PASSWORD` | Optional | SMTP password. |
| `MAIL_FROM` | Recommended | Sender address; defaults to `SMTP_USER`. |

Email verification and password-reset delivery require a working SMTP
configuration.

#### Integration tests and bootstrap users

| Variable | Required | Description |
| --- | --- | --- |
| `TEST_DATABASE_URL` | For integration tests | Disposable PostgreSQL database whose name contains `test`. The test suite resets its `public` schema. |
| `INITIAL_USERS_PASSWORD` | For seeding | Shared initial password of at least eight characters. |
| `INITIAL_PROFESSOR_EMAIL` | For seeding | Initial professor's `@polito.it` address. |
| `INITIAL_PROFESSOR_NAME` | Optional | Initial professor's first name. |
| `INITIAL_PROFESSOR_SURNAME` | Optional | Initial professor's surname. |
| `INITIAL_ADMIN_EMAIL` | For seeding | Initial admin's `@polito.it` address. |
| `INITIAL_ADMIN_NAME` | Optional | Initial admin's first name. |
| `INITIAL_ADMIN_SURNAME` | Optional | Initial admin's surname. |
| `INITIAL_STUDENT_EMAIL` | For seeding | Initial student's `@polito.it` address. |
| `INITIAL_STUDENT_NAME` | Optional | Initial student's first name. |
| `INITIAL_STUDENT_SURNAME` | Optional | Initial student's surname. |

### Database setup

Create a PostgreSQL database, set `DATABASE_URL`, and load the complete baseline:

```sh
psql "$DATABASE_URL" -f drizzle/0000_initial_schema.sql
```

`0000_initial_schema.sql` contains the complete current schema. It is intended
for an empty database and must not be executed over an already initialized
database.

Databases created before the support-ticket feature only need the upgrade script:

```sh
psql "$DATABASE_URL" -f drizzle/0001_support_tickets.sql
```

The schema, relationships, authorization model, API coverage, constraints,
known limitations, and schema notes are documented separately in
[Database architecture](docs/database.md).

To inspect the configured database with Drizzle Studio:

```sh
npm run db
```

### Initial users

After configuring the `INITIAL_*` variables, create or update the verified
bootstrap accounts:

```sh
npm run db:seed-initial-users
```

The seed command is idempotent for the configured accounts. It creates a
professor, admin, and student account, or updates their credentials and
profile information if they already exist.

## Usage

### Image-correction workflow

1. A professor creates a course and authorizes its members.
2. The professor creates an activity and uploads reference images.
3. A student opens a correction session and selects one reference viewpoint and
   one analysis focus.
4. The student uploads an image for evaluation.
5. SvelteKit sends the student image and selected reference image to the Python
   service in one signed multipart request.
6. The Python service returns `202 Accepted` with a job identifier and processes
   jobs through its single-consumer queue.
7. While the job is `queued` or `processing`, the page requests its status every
   five seconds. Only status data is transferred during polling; the images are
   not uploaded again.
8. When the job becomes `completed` or `failed`, the result is stored with the
   correction attempt and polling for that job stops.

### Roles

| Role | Scope |
| --- | --- |
| `admin` | Global administrator with access to all courses. |
| `professor` | Creates courses and manages courses where the user has an active professor membership. |
| `student` | Accesses courses where the user has an active membership and submits correction attempts. |

Application roles and course memberships are intentionally separate. A global
professor does not automatically manage every course. The full list of what
each role can do, and the known gaps between the interface and the API, is in
[Roles and permissions](../README.md#roles-and-permissions) in the root
README.

### Localization

The interface supports Italian and English with `svelte-i18n`. Italian is the
default language, and the language switcher stores the user's choice in
`localStorage` so it persists across navigation and browser refreshes.

Translations are defined in `src/lib/i18n.js`. Add the same key to both the
`it` and `en` message objects, then use it in a Svelte component:

```svelte
<script>
  import { _ } from 'svelte-i18n';
</script>

<h1>{$_('home.title')}</h1>
```

Use the shared switcher wherever a language control is needed:

```svelte
<script>
  import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
</script>

<LanguageSwitcher />
```

The root layout imports `src/lib/i18n.js` once, so individual pages should not
call `init()` again.

## Project structure

```text
sveltekit_website/
├── docs/                       Project documentation
│   └── database.md             Database architecture and API coverage
├── drizzle/                    PostgreSQL baseline and maintenance SQL
├── scripts/                    Bootstrap and maintenance scripts
├── src/
│   ├── lib/
│   │   ├── client/             Browser-side API helpers
│   │   ├── components/         Shared Svelte components
│   │   ├── i18n.js             Italian and English translations
│   │   └── server/             Authentication, database, mail, and services
│   ├── routes/                 Pages, layouts, and JSON API endpoints
│   ├── hooks.server.js         Authentication and request hooks
│   └── app.html                HTML document shell
├── static/                     Static images and public assets
├── tests/
│   ├── unit/                   Unit tests
│   └── integration/            PostgreSQL-backed integration tests
├── .env.sample                 Environment configuration example
├── drizzle.config.js           Drizzle Kit configuration
├── svelte.config.js            SvelteKit configuration
└── vite.config.js              Vite configuration
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build. |
| `npm run preview` | Preview the production build locally. |
| `npm run check` | Synchronize SvelteKit types and run `svelte-check`. |
| `npm test` | Run the unit test suite once. |
| `npm run test:integration` | Run the PostgreSQL-backed integration tests. |
| `npm run db` | Open Drizzle Studio. |
| `npm run db:seed-initial-users` | Create or update the initial access accounts. |

## Testing

Run static checks and unit tests:

```sh
npm run check
npm test
```

Integration tests are destructive and must use a disposable PostgreSQL database
whose name contains `test`:

```sh
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/portal_test" \
  npm run test:integration
```

The integration suite resets the target database's `public` schema before
loading the baseline. Never point `TEST_DATABASE_URL` at development, staging,
or production data.

## Deployment

The project currently uses `@sveltejs/adapter-auto`. For production, choose and
configure the SvelteKit adapter appropriate for the target hosting platform.

A production deployment also needs:

- A PostgreSQL database initialized with the baseline schema.
- HTTPS and secure Better Auth secrets.
- A correctly configured public application URL and trusted origins.
- SMTP delivery for account verification and password recovery.
- Network access to the Python analysis service.
- Matching HMAC secrets on SvelteKit and Python.

The HMAC signature authenticates server-to-server requests but does not encrypt
them. Use HTTPS or a trusted private network between the services.

## Project status

This is a thesis project. The main course, activity, correction, and
result workflows are implemented, while the image processor still exposes a
placeholder analysis implementation. Consult the
[database documentation](docs/database.md#known-limitations) for current data
model and API limitations.

## Contributing

Before proposing a change:

1. Create a focused branch.
2. Keep credentials and local `.env` files out of version control.
3. Run `npm run check` and `npm test`.
4. Run integration tests when changing services, authorization, or database
   behavior.
5. Document schema changes in `docs/database.md`.
6. Open a pull request describing the change and how it was verified.

## License

No license file is currently included. Until a license is added, the project
should be treated as all rights reserved.

## Acknowledgments

- README structure inspired by the
  [Best README Template](https://github.com/othneildrew/Best-README-Template).
- Politecnico di Torino branding and academic context.
- The open-source projects listed in [Built with](#built-with).
