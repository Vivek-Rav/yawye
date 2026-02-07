# CLAUDE.md — YAWYE (You Are What You Eat)

AI-powered food scanner that identifies food from photos, estimates calories, assesses health risks, and calculates exercise burn-off using Google Gemini Vision.

## Architecture

### Tech Stack
- **Framework:** Next.js 15 (App Router, React Server Components)
- **Language:** TypeScript 5 (strict mode)
- **UI:** React 19 + Tailwind CSS 3.4 (dark theme, mobile-first)
- **AI:** Google Gemini 2.0 Flash (vision API for food identification)
- **Auth:** Firebase Authentication (Google OAuth + email/password)
- **Database:** Cloud Firestore (NoSQL document store)
- **Charts:** Recharts 3.7 (dynamic import, client-side only)

### Directory Layout
```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/             # Protected route group (scan, history)
│   ├── api/scan/           # POST — AI food analysis endpoint
│   ├── api/scan-limit/     # GET — daily scan remaining check
│   └── login/              # Public auth page
├── components/             # Reusable UI components
├── context/                # React Context providers (AuthContext)
└── lib/                    # Utilities, API clients, data access
    ├── firebase.ts         # Client-side Firebase config
    ├── firebaseAdmin.ts    # Server-side Admin SDK + token verification
    ├── firestore.ts        # Firestore CRUD (saveScan, getUserScans, clearUserScans)
    ├── gemini.ts           # Gemini prompt template + response parser
    ├── chartUtils.ts       # Chart data aggregation helpers
    └── utils.ts            # Shared utility functions
```

### Data Flow
1. User authenticates via Firebase (client) and gets an ID token
2. Client sends `Authorization: Bearer <token>` + base64 image to `POST /api/scan`
3. Server verifies token via Firebase Admin SDK, checks rate limits + daily scan limit
4. Validated image is sent to Gemini 2.0 Flash with the prompt template
5. Gemini JSON response is parsed and validated, then returned to client
6. Client optionally saves scan result to Firestore

### Key Interfaces
- `ScanResult` — core response shape (foodName, calories, ingredients, riskLevel, burnOff)
- `BurnOff` — exercise estimates (treadmill, cycling, walking, running, burnComment)
- `StoredScan` — extends ScanResult with id, userId, context, createdAt
- `AuthContextType` — auth state + login/logout methods

### API Endpoints
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/scan` | Bearer token | Analyze food image with Gemini |
| GET | `/api/scan-limit` | Bearer token | Check remaining daily scans |

## Conventions

### Code Style
- **Components:** PascalCase filenames matching export (`ScanResultCard.tsx`)
- **Functions:** camelCase (`handleScan`, `getUserScans`)
- **Constants:** SCREAMING_SNAKE_CASE (`DAILY_SCAN_LIMIT`, `RATE_LIMIT`)
- **Interfaces:** PascalCase, no `I` prefix (`ScanResult`, `AuthContextType`)
- **Client Components:** must have `"use client"` directive at top of file
- **Server Components:** no directive needed (default in App Router)

### TypeScript
- Strict mode enabled — no `any` types
- Use path alias `@/*` for imports from `src/` (e.g., `@/lib/gemini`)
- Prefer explicit return types on exported functions
- Use `as const` for literal union values

### Styling
- Tailwind CSS exclusively — no separate CSS files (except `globals.css` for directives)
- Custom theme tokens defined in `tailwind.config.ts`:
  - `accent.primary` (#6366f1 indigo), `accent.secondary` (#8b5cf6 violet)
  - `risk.high` (#ef4444), `risk.medium` (#f59e0b), `risk.low` (#22c55e)
  - `bg-gradient-dark` for page backgrounds
- Mobile-first responsive design — test on small screens first

### Git Commits
- Imperative mood, concise: "Add feature X" not "Added feature X"
- Reference what changed and why, not just what files were touched

## Security

### Authentication & Authorization
- All API routes MUST verify Firebase ID tokens via `verifyToken()` from `firebaseAdmin.ts`
- Never trust client-side auth state for server-side decisions
- Admin bypass is controlled by `ADMIN_EMAIL` env var (server-only)
- Auth state is managed via `AuthContext` — always use `useAuth()` hook in components

### Input Validation (Enforced in API Routes)
- Request body: Content-Length pre-check rejects payloads >6 MB before JSON parsing; malformed JSON returns 400
- Image: max 5 MB, must match `data:image/(jpeg|png|gif|webp|heic|heif);base64,`
- Context text: max 500 characters, control characters stripped, braces/backticks/`${` removed (prompt injection prevention)
- All user input is sanitized before being interpolated into prompts

### Rate Limiting
- Per-user in-memory rate limit: 10 requests per 60 seconds
- Daily scan limit: 3 scans per day (tracked server-side in Firestore)
- Admin users bypass daily limit only (not rate limit)

### Environment Variables
**NEVER commit `.env.local` or expose server-only secrets to the client.**

Server-only (must NOT have `NEXT_PUBLIC_` prefix):
- `FIREBASE_ADMIN_CLIENT_EMAIL` — Firebase Admin SDK credential
- `FIREBASE_ADMIN_PRIVATE_KEY` — Firebase Admin private key (multi-line, `\n` replaced at runtime)
- `GEMINI_API_KEY` — Google Generative AI API key
- `ADMIN_EMAIL` — email that bypasses daily scan limit

Client-safe (prefixed with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`

### HTTP Security Headers
Configured in `next.config.mjs` — includes HSTS, X-Frame-Options DENY, Content-Security-Policy, and camera/microphone permissions restricted to self. Do not weaken or remove these headers. CSP whitelists Firebase, Google Auth, and Gemini API domains; update it if adding new external services.

### Firestore Security Rules
Defined in `firestore.rules` — enforces user isolation (`userId == request.auth.uid`) on the `scans` collection. Scans are immutable (no updates allowed). Deploy with `firebase deploy --only firestore:rules`.

### Security Rules for Contributors
- Never log sensitive data (tokens, API keys, user emails) in production
- Never expose Firebase Admin credentials or Gemini API key to the client bundle
- Always validate and sanitize user input before passing to Gemini prompts
- Keep `firebase-admin` imports server-side only (never import in `"use client"` files)
- New API routes must call `verifyToken()` before any business logic

## Development

### Setup
```bash
npm install
cp .env.example .env.local   # Fill in all values — see Environment Variables above
npm run build                 # Verify TypeScript compiles cleanly
npm run dev                   # http://localhost:3000
```

### Required Services
- Firebase project with Authentication (Google + Email/Password) and Firestore enabled
- Google AI Studio API key for Gemini 2.0 Flash (`GEMINI_API_KEY`)
- Firebase Admin SDK service account credentials (`FIREBASE_ADMIN_CLIENT_EMAIL` + `FIREBASE_ADMIN_PRIVATE_KEY`)

### Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build (checks TypeScript + bundles) |
| `npm run start` | Start production server |

### Common Patterns

**Adding a new API route:**
1. Create `src/app/api/<name>/route.ts`
2. Extract and verify Bearer token using `verifyToken()` from `@/lib/firebaseAdmin`
3. Validate all inputs (size limits, format checks, sanitization)
4. Return `NextResponse.json()` with appropriate status codes

**Adding a new protected page:**
1. Create under `src/app/(auth)/<name>/page.tsx`
2. Mark as `"use client"` and use `useAuth()` for user state
3. Redirect to `/login` if `!user && !loading`

**Modifying the Gemini prompt:**
1. Edit `GEMINI_PROMPT_TEMPLATE` in `src/lib/gemini.ts`
2. If you add new fields, update the `ScanResult` interface and `parseGeminiResponse()` validation in the same file
3. Update `StoredScan` in `src/lib/firestore.ts` if the field should be persisted

## Gotchas

- **`FIREBASE_ADMIN_PRIVATE_KEY` newlines:** The private key is multi-line. In `.env.local`, store it with literal `\n` characters — `firebaseAdmin.ts` replaces `\\n` with real newlines at runtime. If auth fails with "invalid key", this is usually the cause.
- **Gemini markdown fences:** Despite the prompt requesting raw JSON, Gemini sometimes wraps responses in ` ```json ` fences. `parseGeminiResponse()` strips these — do not remove that cleanup logic.
- **In-memory rate limiting resets on cold start:** The `rateLimits` Map in `/api/scan/route.ts` lives in serverless instance memory. On Vercel/serverless, each cold start creates a fresh map. This is acceptable for the current scale.
- **Firestore `scans` collection:** All scan data lives in a single `scans` collection, filtered by `userId`. There are no composite indexes — queries sort client-side in `getUserScans()`. Add Firestore indexes if you add server-side ordering or compound filters.
- **CalorieChart SSR:** Recharts requires browser APIs. `CalorieChart` must be imported with `next/dynamic` and `ssr: false`. Do not convert to a regular import.
- **Next.js Link same-route navigation:** The app uses `window.location.href` for same-route reloads (e.g., reset scan page) because Next.js `<Link>` is a no-op when the href matches the current route.
- **Daily scan limit timezone:** The client sends its IANA timezone via the `x-timezone` header. The server validates it with `isValidTimezone()` and falls back to UTC. `getDailyScanCountAdmin()` computes start-of-day in the client's timezone so limits reset at the user's local midnight.

## Testing

No test framework configured yet. When adding tests, mock Firebase and Gemini API calls — never use real API keys in tests.
