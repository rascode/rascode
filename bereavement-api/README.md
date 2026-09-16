# Bereavement API for dbui

A Fastify + TypeScript API that helps families coordinate laying a loved one to rest: gather documents, capture biographical details, draft an AI-assisted obituary, and produce a remembrance PDF (obituary + service program) from predefined templates.

Designed to **tack onto dbui** — keep your family/database UI for records, and use this service for the bereavement workflow. Persistence is behind a `BereavementStore` interface so you can swap the in-memory store for PostgreSQL later without changing routes.

## Capabilities

| Area | What it does |
| --- | --- |
| **Cases** | Create and track a bereavement arrangement through intake → gathering → drafting → ready for service |
| **Biography** | Structured beloved profile (names, dates, family, stories, faith, survivors) used for drafting and PDFs |
| **Documents** | Upload death certificates, photos, IDs, directives, military/insurance papers |
| **Obituaries** | AI draft (OpenAI when `OPENAI_API_KEY` is set; respectful template drafter otherwise), edit, finalize |
| **PDF packages** | Choose a predefined template; generate a downloadable PDF with obituary + order of service |

## Predefined PDF templates

- `classic-letter` — traditional two-page letter
- `modern-half` — contemporary half-letter booklet
- `garden-remembrance` — soft memorial / outdoor service style
- `faith-service` — faith-centered liturgy layout

## Quick start

```bash
cd bereavement-api
npm install
npm run dev
```

API listens on `http://0.0.0.0:3040` by default.

```bash
npm test
npm run typecheck
```

### Optional AI drafting

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini   # optional
npm run dev
```

Without a key, drafts still work via the built-in template writer so families always get a usable first pass.

## Suggested family flow

1. `POST /api/v1/cases` — open an arrangement; add contacts and service details  
2. `PUT /api/v1/cases/:caseId/biography` — record the beloved’s life  
3. `POST /api/v1/cases/:caseId/documents` — attach needed papers and photos  
4. `POST /api/v1/cases/:caseId/obituaries/draft` — generate an obituary draft  
5. `PATCH .../obituaries/:id` / `.../finalize` — refine and lock the text  
6. `GET /api/v1/templates` — pick a PDF style  
7. `POST /api/v1/cases/:caseId/packages` — build the remembrance packet  
8. `GET .../packages/:id/download` — download the PDF  

## API reference (v1)

### Health

- `GET /health`

### Templates

- `GET /api/v1/templates`
- `GET /api/v1/templates/:templateId`

### Cases

- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/cases/:caseId`
- `PATCH /api/v1/cases/:caseId`

### Biography

- `PUT /api/v1/cases/:caseId/biography`
- `GET /api/v1/cases/:caseId/biography`

### Documents

- `GET /api/v1/cases/:caseId/documents`
- `POST /api/v1/cases/:caseId/documents` (multipart: `file`, optional `category`, `description`)
- `GET /api/v1/cases/:caseId/documents/:documentId`
- `DELETE /api/v1/cases/:caseId/documents/:documentId`

Document categories: `death_certificate`, `photo`, `identification`, `will_or_directive`, `military_records`, `insurance`, `other`.

### Obituaries

- `POST /api/v1/cases/:caseId/obituaries/draft`  
  Body: `{ tone?, length?, promptNotes? }`  
  Tones: `traditional`, `warm`, `celebratory`, `concise`, `faith_centered`
- `GET /api/v1/cases/:caseId/obituaries`
- `GET /api/v1/cases/:caseId/obituaries/:obituaryId`
- `PATCH /api/v1/cases/:caseId/obituaries/:obituaryId`
- `POST /api/v1/cases/:caseId/obituaries/:obituaryId/finalize`

### Packages

- `POST /api/v1/cases/:caseId/packages`  
  Body: `{ templateId, obituaryId, program? }`
- `GET /api/v1/cases/:caseId/packages`
- `GET /api/v1/cases/:caseId/packages/:packageId`
- `GET /api/v1/cases/:caseId/packages/:packageId/download`

## Example (curl)

```bash
CASE=$(curl -s -X POST localhost:3040/api/v1/cases \
  -H 'content-type: application/json' \
  -d '{"title":"Remembering Jordan Lee"}' | jq -r .id)

curl -s -X PUT localhost:3040/api/v1/cases/$CASE/biography \
  -H 'content-type: application/json' \
  -d '{"legalName":"Jordan Avery Lee","preferredName":"Jordan Lee","dateOfBirth":"1958-03-12","dateOfDeath":"2026-09-10","occupation":"nurse","survivorList":["Alex Lee"]}'

OBIT=$(curl -s -X POST localhost:3040/api/v1/cases/$CASE/obituaries/draft \
  -H 'content-type: application/json' \
  -d '{"tone":"warm"}' | jq -r .id)

PKG=$(curl -s -X POST localhost:3040/api/v1/cases/$CASE/packages \
  -H 'content-type: application/json' \
  -d "{\"templateId\":\"classic-letter\",\"obituaryId\":\"$OBIT\"}" | jq -r .id)

curl -OJ localhost:3040/api/v1/cases/$CASE/packages/$PKG/download
```

## Integrating with dbui

- Treat each bereavement **case** as a workflow overlay on an existing person/family record in dbui.
- Implement `BereavementStore` against PostgreSQL (same DB dbui already uses) when you are ready for durable storage.
- Keep document binaries on disk/object storage; store only metadata + paths in the database.
- Call this API from dbui screens for “Arrange remembrance,” “Draft obituary,” and “Print program.”

## Project layout

```
bereavement-api/
  src/
    app.ts / server.ts
    routes/bereavement.ts
    services/          # cases, biography, documents, obituaries, packages
    store/             # MemoryStore + store interface
    data/templates/    # predefined PDF catalog
  test/
```

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Bind host |
| `PORT` | `3040` | Bind port |
| `UPLOAD_DIR` | `./uploads` | Document storage |
| `GENERATED_DIR` | `./generated` | PDF output |
| `OPENAI_API_KEY` | _(unset)_ | Enables live LLM drafting |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model for drafting |
