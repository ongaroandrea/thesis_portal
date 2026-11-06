# Image Analysis Queue Server

<!-- Inspired by https://github.com/othneildrew/Best-README-Template -->

A private FastAPI service that accepts authenticated image-comparison jobs from
the SvelteKit application and processes them through a bounded, in-memory FIFO
queue with exactly one active worker.

The service receives both the student's submitted image and the instructor's
selected reference image. It is designed for an analysis host with a single GPU,
where concurrent model executions would be undesirable.

## Table of contents

- [About the project](#about-the-project)
  - [Main features](#main-features)
  - [Built with](#built-with)
- [How it works](#how-it-works)
  - [Job lifecycle](#job-lifecycle)
  - [Queue behavior](#queue-behavior)
  - [Status polling](#status-polling)
- [Getting started](#getting-started)
  - [Docker setup](#docker-setup)
  - [Local setup](#local-setup)
  - [Configuration](#configuration)
- [API](#api)
- [Request authentication](#request-authentication)
- [Image validation](#image-validation)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deployment and security](#deployment-and-security)
- [Current limitations](#current-limitations)
- [Extending the processor](#extending-the-processor)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## About the project

The image analysis server is the asynchronous worker behind the SvelteKit
teaching portal. The web server creates a signed multipart request containing:

- `image`: the student's submitted image;
- `reference_image`: the reference image selected for the correction session;
- `type`: the requested analysis category;
- the complete system/user prompts, output schema, model, version, and hash.

After validating both files, the server returns `202 Accepted` and places the
job in memory. A single consumer processes queued jobs in submission order. The
web application can then read the job status until the result is available.

SvelteKit creates and versions every prompt from PostgreSQL. This service only
validates the signed job parameters, queues the work, calls Ollama, and returns
the raw structured result.

### Main features

- FastAPI endpoints with generated OpenAPI documentation.
- HMAC-SHA256 authentication for every `/v1/*` request.
- Timestamp validation and one-time nonces to mitigate replay attacks.
- Independent validation of submitted and reference images.
- Bounded, first-in-first-out in-memory queue.
- Exactly one active processing task.
- Job cancellation and removal.
- Automatic pruning of old completed and failed jobs.
- Docker image running as an unprivileged user.
- Container health check through an unsigned liveness endpoint.

### Built with

- [Python](https://www.python.org/) 3.13
- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic](https://docs.pydantic.dev/)
- [Pillow](https://python-pillow.org/)
- [Uvicorn](https://www.uvicorn.org/)
- [pytest](https://pytest.org/)
- [Docker Compose](https://docs.docker.com/compose/)

## How it works

### Job lifecycle

```text
SvelteKit
   │
   │ POST /v1/jobs
   │ image + reference_image + type + HMAC headers
   ▼
FastAPI validation
   │
   ├── invalid request ─────────────► 4xx response
   │
   └── valid request
          │
          ▼
      queued ─────► processing ─────► completed
                         │
                         └──────────► failed
```

1. FastAPI verifies the request signature before accepting the request.
2. Both images are read up to the configured byte limit.
3. Pillow verifies their actual formats and dimensions.
4. The server creates a UUID job and returns its queue position.
5. The single consumer changes the job from `queued` to `processing`.
6. The processor returns a result or raises an exception.
7. The final state becomes `completed` or `failed`.

Raw image bytes remain in memory while the job exists but are excluded from API
responses. Responses expose only image metadata such as format, content type,
size, width, and height.

### Queue behavior

`SerialJobQueue` uses an `asyncio.Condition`, a FIFO `deque`, and an ordered job
registry. All operations that inspect or change queue state are synchronized.

- At most one processor task runs at a time.
- `QUEUE_MAX_SIZE` limits waiting jobs; the currently active job is separate.
- A full queue rejects new work with `503 Service Unavailable`.
- Deleting a queued job removes it immediately.
- Deleting the active job removes it from the API immediately and discards its
  result. The underlying model call is allowed to finish before the FIFO
  advances, because Python cannot safely cancel a running worker thread.
- During shutdown, queued work is discarded instead of draining the backlog.
- Only the configured number of terminal jobs is retained.
- Snapshots and job reads return deep copies so callers cannot mutate internal
  queue state.

Queue state is intentionally ephemeral. Restarting the process or container
removes queued jobs, active work, and completed results.

### Status polling

After `POST /v1/jobs` returns `202`, the SvelteKit page requests
`GET /v1/jobs/{job_id}` every N seconds while the job is `queued` or
`processing`. These repeated requests contain no images; they only retrieve job
metadata and status.

Camera processing time depends on the configured model and Ollama host. Polling
stops when SvelteKit observes `completed` or `failed`.

## Getting started

### Docker setup

Docker Compose is the recommended way to run the service.

1. Open the server directory:

   ```sh
   cd python_server
   ```

2. Create the environment file:

   ```sh
   cp .env.example .env
   ```

3. Generate a random HMAC secret:

   ```sh
   openssl rand -hex 32
   ```

4. Put the generated value in `.env` as `HMAC_SECRET`.

5. Use the same value for `PYTHON_SERVER_HMAC_SECRET` in the SvelteKit
   application's `.env` file.

6. Build and start the service:

   ```sh
   docker compose up --build
   ```

7. Confirm that the liveness endpoint responds:

   ```sh
   curl http://127.0.0.1:8000/health/live
   ```

The default Compose configuration publishes the service only on
`127.0.0.1:8000`.

To stop it:

```sh
docker compose down
```

### Local setup

Python 3.13 is recommended because it matches the Docker image.

```sh
cd python_server
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Replace the example HMAC secret, then start Uvicorn with the environment file:

```sh
uvicorn app.main:app --reload --env-file .env
```

The service is available at `http://127.0.0.1:8000`. FastAPI exposes its
interactive schema at `http://127.0.0.1:8000/docs`, although calls to `/v1/*`
still require valid signature headers.

### Configuration

| Variable | Default | Constraints | Description |
| --- | ---: | --- | --- |
| `HMAC_SECRET` | None | Required; at least 32 characters | Secret shared only with the SvelteKit server. |
| `HMAC_MAX_AGE_SECONDS` | `300` | 10–3600 | Maximum accepted clock difference and nonce-retention window. |
| `QUEUE_MAX_SIZE` | `100` | 1–10,000 | Maximum number of jobs waiting in the FIFO queue. |
| `COMPLETED_JOB_LIMIT` | `500` | 1–100,000 | Maximum retained terminal jobs. |
| `MAX_IMAGE_MB` | `5` | Positive number | Maximum size of each image in MB. Docker Compose passes the same value to the web app. |
| `MAX_IMAGE_BYTES` | unset | Positive integer | Optional exact byte limit; overrides `MAX_IMAGE_MB` when set. |
| `MAX_IMAGE_PIXELS` | `40000000` | Positive integer | Maximum width multiplied by height for each image. |
| `API_PORT` | `8000` | Valid host port | Host port used by Docker Compose. |
| `DEVELOPMENT_MODE` | `false` | Boolean | Return an immediate mock result without contacting Ollama. |
| `OLLAMA_ALLOWED_MODELS` | `qwen3.8:27b` | Comma-separated model names | Worker-side allowlist for models selected by SvelteKit. |
| `OLLAMA_TIMEOUT_SECONDS` | `900` | 1–3600 | Maximum duration of an Ollama request. |

The application rejects known placeholder secrets such as
`replace-with-a-long-random-secret`.

## API

All `/v1/*` endpoints require the three authentication headers documented in
[Request authentication](#request-authentication).

### Create a job

```http
POST /v1/jobs
Content-Type: multipart/form-data
```

Multipart fields:

| Field | Type | Description |
| --- | --- | --- |
| `image` | File | Student-submitted JPEG, PNG, or WEBP image. |
| `reference_image` | File | Instructor reference JPEG, PNG, or WEBP image. |
| `type` | String | `camera`, `texture`, `light`, `material`, or `general`. |
| `model` | String | Model selected by SvelteKit; must be in the worker allowlist. |
| `system_prompt` | String | Complete immutable system prompt created by SvelteKit. |
| `user_prompt` | String | Complete immutable evaluation prompt created by SvelteKit. |
| `output_schema` | JSON string | Object schema supplied to Ollama's structured output mode. |
| `prompt_version` | String | SvelteKit template/activity revision identifier. |
| `prompt_hash` | String | Lowercase SHA-256 digest of the prompt snapshot. |

Successful response: `202 Accepted`

```json
{
  "id": "764b1f14-81a0-4fd1-a4ec-055de6328162",
  "status": "queued",
  "position": 1
}
```

### Get a job

```http
GET /v1/jobs/{job_id}
```

Returns the current status, public request metadata, timestamps, and either the
result or an error. Raw image bytes are never serialized.

Possible job states are `queued`, `processing`, `completed`, and `failed`.

### Delete a job

```http
DELETE /v1/jobs/{job_id}
```

Returns `204 No Content`. A queued job is removed; the active job is cancelled
and removed. An unknown identifier returns `404 Not Found`.

### List jobs

```http
GET /v1/jobs
```

Returns a snapshot of all currently retained jobs in insertion order.

### Queue status

```http
GET /v1/queue
```

Example response:

```json
{
  "queued": 2,
  "processing_job_id": "764b1f14-81a0-4fd1-a4ec-055de6328162",
  "capacity": 100
}
```

### Health check

```http
GET /health/live
```

This is the only unsigned endpoint. It exposes no job data and returns:

```json
{
  "status": "ok"
}
```

## Request authentication

The SvelteKit server signs every `/v1/*` request with HMAC-SHA256. The signature
covers the exact method, path and query, timestamp, nonce, and body bytes.

Required headers:

| Header | Purpose |
| --- | --- |
| `X-Request-Timestamp` | Unix timestamp in seconds. Requests outside the configured window are rejected. |
| `X-Request-Nonce` | Unique value for this request. Reuse inside the allowed window is rejected. |
| `X-Request-Signature` | Versioned HMAC digest in the form `v1=<hex digest>`. |

The canonical request contains five newline-separated values:

```text
HTTP_METHOD
/path?query=exactly-as-sent
unix_timestamp_seconds
unique_nonce
sha256_hex_of_exact_body_bytes
```

The signature is calculated as:

```text
v1=hex(HMAC-SHA256(shared_secret, canonical_request))
```

For multipart uploads, the body hash includes every boundary and header in the
serialized multipart body. The client must serialize the body first, sign those
exact bytes, and send the same bytes unchanged.

Authentication failures return `401`. Reusing a valid nonce returns `409`.
Nonce history is held in memory and is scoped to one server process.

The shared secret must never be exposed to browser-side JavaScript. It belongs
only in the SvelteKit backend and this service.

## Image validation

The submitted image and reference image are validated independently:

- Empty files are rejected with `422`.
- Files larger than the image limit (`MAX_IMAGE_MB`) are rejected with `413`.
- Pillow verifies the encoded image contents instead of trusting the filename.
- Only JPEG, PNG, and WEBP are accepted.
- The declared content type must match the detected format, unless it is
  `application/octet-stream`.
- Invalid dimensions or images exceeding `MAX_IMAGE_PIXELS` are rejected with
  `422`.

## Project structure

```text
python_server/
├── app/
│   ├── config.py       Environment configuration and validation
│   ├── main.py         FastAPI application, routes, and image validation
│   ├── models.py       Request, job, and queue response models
│   ├── processor.py    Image-analysis processor integration point
│   ├── queue.py        Bounded single-consumer FIFO queue
│   └── security.py     HMAC signing and replay protection
├── tests/              API, queue, and signature tests
├── .env.example        Configuration example
├── compose.yaml        Local container configuration and health check
├── Dockerfile          Single-worker production image
├── requirements.txt    Runtime dependencies
└── requirements-dev.txt
```

## Testing

Install the development dependencies and provide a non-placeholder secret:

```sh
python -m pip install -r requirements-dev.txt
HMAC_SECRET="0123456789abcdef0123456789abcdef" python -m pytest -q
```

The tests cover:

- Canonical request and signature generation.
- Signed multipart parsing with both images.
- FIFO execution with one consumer.
- Removal of queued jobs.
- Cancellation of an active job.
- The empty `204` deletion response contract.

Run a syntax-only check with:

```sh
python -m compileall -q app tests
```

## Deployment and security

- Keep exactly one Uvicorn worker. Multiple workers or replicas create separate
  in-memory queues and may run multiple GPU tasks concurrently.
- Keep the service on a private network when possible.
- HMAC authenticates requests but does not encrypt images or results. Use HTTPS
  whenever traffic crosses an untrusted network.
- Keep `HMAC_SECRET` out of source control, logs, and client-side code.
- Synchronize system clocks closely enough for the configured timestamp window.
- The Docker image runs as the non-root user `api-user`.
- The service has no database or persistent volume. Plan for job loss during
  restart or deployment.
- Do not expose job-listing or queue endpoints publicly merely because they are
  signed; restrict network access as an additional layer.

## Current limitations

1. Prompt quality and output semantics are owned by the SvelteKit application.
2. Queue and nonce state are stored only in memory.
3. There is no recovery after a restart.
4. Horizontal scaling is not supported by the current single-GPU queue design.
5. Clients learn about state changes through polling rather than server-sent
   events, WebSockets, or long polling.
6. JPEG, PNG, and WEBP are the only supported image formats.
7. There is no independent end-user authentication; the SvelteKit backend is
   the trusted client.

## Extending the processor

Prompt templates, revisions, output schemas, and activity-specific additions
are stored in PostgreSQL and administered through SvelteKit. The processor
sends the reference as Image A and the submitted image as Image B without
changing prompt semantics. Exceptions are caught by the queue and stored as a
failed job's `error` value.

Avoid adding concurrency inside the processor unless the deployment and GPU
resource model are changed deliberately.

## Contributing

Before proposing a change:

1. Create a focused branch.
2. Do not commit `.env` or real HMAC secrets.
3. Preserve the exact HMAC contract shared with SvelteKit.
4. Update both services when changing multipart field names or response models.
5. Run the test suite and syntax checks.
6. Update this README when changing configuration, endpoints, or queue behavior.

## License

No license file is currently included. Until a license is added, the project
should be treated as all rights reserved.

## Acknowledgments

- README structure inspired by the
  [Best README Template](https://github.com/othneildrew/Best-README-Template).
- The FastAPI, Pydantic, Pillow, Uvicorn, and pytest communities.
- The companion [SvelteKit teaching portal](../sveltekit_website/README.md) that
  submits and tracks analysis jobs.
