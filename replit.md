# Red Front Hiring Manager

## Overview

Internal hiring manager tool for Red Front Pizza restaurant chain. Automatically captures job applications from the website's Contact Form 7 and provides a simple interface for reviewing, tracking, and managing applicants.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Session-based (express-session + bcryptjs)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (auth, applicants, notes, webhook, stats)
│   └── hiring-manager/     # React + Vite frontend (PWA)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

### applicants
Fields mapped from Red Front Pizza Contact Form 7:
- id, location, position, name, email, address, city, state, zip
- phoneHome, phoneBusiness, phoneCell
- dateCanStart, salaryDesired, hasHighSchoolDiploma
- rawPayload (JSONB - stores full webhook data for unmapped fields)
- status (new, reviewed, interviewing, hired, rejected, archived)
- createdAt, updatedAt

### notes
- id, applicantId, body, author, createdAt

### users
- id, email, password (bcrypt hashed), role (owner, manager)

## Default Credentials

- Owner: owner@redfrontpizza.com / redfront2024
- Manager: manager@redfrontpizza.com / redfront2024

## API Endpoints

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout
- `GET /api/applicants` - List applicants (with ?status, ?search, ?location, ?position filters)
- `GET /api/applicants/:id` - Get applicant detail
- `PATCH /api/applicants/:id` - Update applicant status
- `DELETE /api/applicants/:id` - Delete applicant
- `GET /api/applicants/:id/notes` - List notes
- `POST /api/applicants/:id/notes` - Add note
- `POST /api/webhook/cf7` - WordPress Contact Form 7 webhook endpoint
- `GET /api/stats` - Dashboard statistics

## WordPress Integration

The webhook endpoint at `POST /api/webhook/cf7` accepts JSON or form-urlencoded POST requests from Contact Form 7's webhook plugin. It automatically maps known field names to the database schema and stores the raw payload for any unmapped fields.

## Key Design Decisions

- Dark theme with red accents matching Red Front brand
- Mobile-first responsive design with large touch targets
- Session-based auth (cookies) for simplicity
- Raw webhook payload stored alongside structured fields (no data loss)
- Status workflow: New → Reviewed → Interviewing → Hired/Rejected/Archived

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Package Commands

- `pnpm --filter @workspace/api-server run dev` — run the API dev server
- `pnpm --filter @workspace/hiring-manager run dev` — run the frontend dev server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push database schema changes
