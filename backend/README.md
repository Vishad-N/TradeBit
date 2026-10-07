# Reading API (NestJS + Prisma + PostgreSQL)

Backend for the **Books** feature: one global reading task, per-user submissions, admin approval, and a
protected page-by-page reader. The original PDF is stored privately and is never sent to the browser.

## How it works

```
Admin uploads PDF → NestJS → private storage (original.pdf)
                          → mupdf renders every page to a JPEG → private storage (pages/N.jpg)
User approved?  → GET /reading/books/:id/pages/N  (auth + access + session checked on every request)
```

* **Global task, individual submissions.** `Task` is shared by everyone. `TaskSubmission` is unique per
  `(taskId, userId)`; the user id always comes from the JWT, never from the request body.
* **Server-side access.** Approving a submission creates a `ReadingAccess` row. Every page/progress/session
  request re-checks it (and the book is `READY`, active, access `ACTIVE` and not expired).
* **One reading session per user+book.** Opening the reader elsewhere replaces the session; the old one gets
  `409 SESSION_REPLACED`.
* **Roles are server-side.** The guard reloads the user on each request. Sign-up can only create `USER`; the
  first admin is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Local setup

```bash
cd backend
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma generate
npx prisma migrate dev        # creates the tables (or `npx prisma migrate deploy`)
npm run start:dev             # http://localhost:3000/api/v1/health
```

Frontend (repo root): copy `.env.example` to `.env` (`VITE_API_URL=http://localhost:3000/api/v1`), then `npm run dev`.

Storage driver is picked from the environment: **Cloudinary** (`CLOUDINARY_URL` or the three `CLOUDINARY_*` values), else an **S3-compatible bucket** (`STORAGE_BUCKET`), else the local `./storage` folder (development only, git-ignored).

### Tests

```bash
npm run build
npm run test:e2e      # starts an embedded Postgres + the built API, runs 26 checks (auth, 403s, approval, reader, sessions…)
```

## API (prefix `/api/v1`)

| Method | Path | Who |
|---|---|---|
| GET | `/health` | public |
| POST | `/auth/register`, `/auth/login` | public (rate limited) |
| GET | `/auth/me` | user |
| GET | `/reading/me/status` | user — the state `/read/books` renders |
| GET | `/reading/tasks/current` | user |
| POST | `/reading/tasks/:taskId/submit` | user → `PENDING_REVIEW` |
| GET | `/reading/books`, `/reading/books/:bookId` | user with access |
| POST | `/reading/books/:bookId/session` | user with access (returns session token + watermark text) |
| GET | `/reading/books/:bookId/pages/:pageNumber` | user with access + `X-Reading-Session` header |
| GET / PATCH | `/reading/progress/:bookId` | user with access |
| GET / POST | `/admin/books` (multipart: `title`, `description`, `file`) | admin |
| PATCH / DELETE | `/admin/books/:bookId` | admin |
| POST | `/admin/books/:bookId/reprocess` | admin |
| GET / POST | `/admin/tasks` | admin (a new task becomes the only active one; history is kept) |
| PATCH | `/admin/tasks/:taskId` | admin |
| GET | `/admin/reading/requests?status=` , `/admin/reading/requests/:id` | admin |
| PATCH | `/admin/reading/requests/:id/approve` , `/reject` (`{ reason? }`) | admin |

There is intentionally **no** download endpoint.

## Environment variables

See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET` (16+ chars), `FRONTEND_URL` (comma-separated CORS
origins). Optional: `ADMIN_EMAIL`/`ADMIN_PASSWORD`, storage (`STORAGE_BUCKET`, `STORAGE_ENDPOINT`,
`STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_FORCE_PATH_STYLE`), `MAX_PDF_MB`,
`PAGE_RENDER_SCALE`, `PAGE_JPEG_QUALITY`, `READING_ACCESS_DAYS`.

## Deploy on Railway

1. Create a Railway project → **New → Database → PostgreSQL**.
2. **New → Empty service** from this repo, set **Root Directory** to `backend` (`railway.json` is picked up:
   build `npm ci && npm run build`, start `npm run railway:start` = `prisma migrate deploy && node dist/main.js`,
   health check `/api/v1/health`).
3. Storage (pick one): **Cloudinary** - add `CLOUDINARY_URL` (from the Cloudinary dashboard) to the API service; or
   **New → Bucket** (private) and add `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
   (and `STORAGE_REGION=auto`).
4. Service variables: `DATABASE_URL` = reference to the Postgres service's `DATABASE_URL`; `JWT_SECRET` (long random);
   `FRONTEND_URL` = your deployed site origin(s); `ADMIN_EMAIL` + `ADMIN_PASSWORD`; leave `PORT` to Railway.
5. Generate a public domain for the API, then build the frontend with
   `VITE_API_URL=https://<your-api>.up.railway.app/api/v1`.

Railway containers have ephemeral disks: **always set Cloudinary or a bucket in production** (the local `./storage` fallback
would lose files on redeploy).

## Security notes (honest limits)

Layers: private storage, no public PDF URL, authenticated + authorised page API, admin approval, per-user
watermark, copy/print/save deterrents in the reader, single-session control. None of this can stop OS-level
screenshots, screen recording, or photographing the screen; it raises the effort of casual copying. Pages are
JPEGs delivered with `Cache-Control: no-store`, but anyone who can view a page can still capture it.

## Cloudinary notes

* Every file (original PDF as `raw`, page JPEGs as `image`) is uploaded with `type: "authenticated"`, so Cloudinary
  only serves it through URLs signed with your API secret. The API builds a signed URL server-side, downloads the
  bytes, and streams them to the user after its own auth/access/session checks. No Cloudinary URL ever reaches the browser.
* Keep your **API secret** only in the backend environment. Never put it in the Vite frontend.
* If your Cloudinary account has "Restricted media types" / "Strict transformations" enabled, that is fine; no
  transformations are used. If PDFs are blocked on your plan, enable raw/PDF delivery in Settings → Security.
* Free plans limit raw file size (about 10MB). Lower `MAX_PDF_MB` to match, or use a larger plan for big books.
* Deleting a book removes its page images and original PDF from Cloudinary.

## 1:1 mentorship payments (manual USDT / TRC20)

Flow: user clicks **Apply for 1:1 Mentorship** on the landing page -> login/register (existing auth) -> `/mentorship`
payment page (fee, TRC20 network, wallet, copy + QR) -> user pays manually -> submits amount, transaction hash, date and
screenshot -> `PENDING` -> an admin reviews it in **Admin -> Reading -> Mentorship Payments** -> `APPROVED` or `REJECTED`.

* **No automatic verification.** There is no blockchain or exchange integration; an admin checks the hash and screenshot.
* **Approval** activates `MentorshipAccess`, unlocks every ready book (`ReadingAccess` with `source = MENTORSHIP`) and makes
  the `TELEGRAM_URL` visible to that user. Books added later unlock automatically for active mentorships.
* **Rejecting** a pending payment lets the user resubmit (the same row is reused if they correct the same hash).
  Rejecting a previously approved payment withdraws the mentorship and only the book access that mentorship created.
* **Safeguards:** a transaction hash can back only one submission; hashes must be 64 hex characters; the screenshot must be a
  real JPG/PNG/WEBP (checked by file signature) up to 5MB and is stored privately (never public; admins view it through an
  authenticated endpoint); payment date cannot be in the future or older than 90 days; submissions are rate limited.
* The wallet address and price come from the **server environment**, not the frontend code.

| Method | Path | Who |
|---|---|---|
| GET | `/mentorship/status`, `/mentorship/payment-info` | user |
| POST | `/mentorship/payments` (multipart: `amountPaid`, `txHash`, `paymentDate`, `screenshot`) | user |
| GET | `/admin/mentorship/payments?status=` , `/:id` , `/:id/screenshot` | admin |
| PATCH | `/admin/mentorship/payments/:id/approve` , `/reject` (`{ reason? }`) | admin |

**Upgrading an existing database:** run `npx prisma migrate deploy` (adds migration `0002_mentorship`; it only adds tables/columns).

## Trading platforms (referral sign-up cards)

The landing page's **Trading Platforms** section is managed from **Admin -> Reading -> Platforms** (name, logo, description,
category, official referral URL, optional referral code, featured, order, visible).

* **Sign Up** goes to `GET /api/v1/go/:slug`, which counts the click and answers `302` to the platform's **own referral URL,
  stored exactly as the client pasted it** (no parameters are built, rewritten or normalised). The external platform records
  the referral; the site never touches its registration form.
* **Referral code only?** Store `referralCode` plus the platform's normal registration page (`websiteUrl`). The card shows a
  Copy button and an "Open Registration" link. A code cannot be auto-filled on another domain, and the app does not pretend to.
* **Safety:** only valid `https://` URLs (no `javascript:`, `data:`, `http:` or `user:pass@`) can be saved; logos must be real
  JPG/PNG/WEBP up to 1MB (SVG only via a logo URL); the public list never includes the referral URL, stats or storage keys.
* **Resilience:** if the API is unreachable the page falls back to `src/config/platforms.js`; with neither, the section is hidden.

| Method | Path | Who |
|---|---|---|
| GET | `/platforms` , `/platforms/:slug/logo` , `/go/:slug` | public |
| GET / POST | `/admin/platforms` (multipart: fields + optional `logo`) | admin |
| PATCH / DELETE | `/admin/platforms/:id` | admin |

Upgrading an existing database: `npx prisma migrate deploy` (adds `0003_platforms`; additive only).
