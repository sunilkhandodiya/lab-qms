# Lab QMS — Laboratory Quality Management System

A full-stack Next.js 14 + PostgreSQL application covering all core laboratory QMS modules.

## Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Live overview — open CAPAs, calibration alerts, QC rejects, EQAS flags |
| **Internal QC** | Levey-Jennings charts, Westgard rule engine (1-2s, 1-3s, 2-2s, R-4s, 10x) |
| **EQAS / PT** | External scheme tracking, SDI calculation, bias%, grading |
| **Document Control** | SOPs, Quality Manual, Work Instructions — versioning, approval workflows |
| **Training** | Staff sign-off tracking, overdue alerts |
| **Equipment** | Asset register, calibration schedule, maintenance log |
| **CAPA** | Corrective & Preventive Actions — root cause, actions, closure |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL) OR an existing PostgreSQL instance

### 1. Clone and install

```bash
cd lab-qms
npm install
```

### 2. Start the database

```bash
docker-compose up -d
```

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local if you changed any DB credentials
```

### 4. Set up the database schema

```bash
npm run db:push        # Creates all tables from Prisma schema
npm run db:seed        # Seeds realistic sample data
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
lab-qms/
├── app/
│   ├── layout.js          # Root layout + sidebar navigation
│   ├── globals.css        # Design system (IBM Plex, dark lab theme)
│   ├── page.js            # Dashboard
│   ├── qc/page.js         # Internal QC — Levey-Jennings charts
│   ├── eqas/page.js       # EQAS / Proficiency Testing
│   ├── documents/page.js  # Document Control
│   ├── equipment/page.js  # Equipment & Calibration
│   ├── capa/page.js       # CAPA Register
│   ├── training/page.js   # Training Sign-off
│   └── api/
│       ├── qc/route.js        # QC results API (with Westgard evaluation)
│       ├── eqas/route.js      # EQAS results API (with SDI calculation)
│       ├── documents/route.js
│       ├── equipment/route.js
│       ├── capa/route.js
│       └── training/route.js
├── lib/
│   ├── prisma.js          # Prisma client singleton
│   └── westgard.js        # Westgard rules engine + SDI/z-score helpers
├── prisma/
│   ├── schema.prisma      # Full data model (all 6 modules)
│   └── seed.js            # Realistic sample data
├── docker-compose.yml
└── .env.local.example
```

---

## Key Technical Details

### Westgard Rules (lib/westgard.js)

The `evaluateWestgard(results)` function takes an ordered array of QC results and returns violations:

| Rule | Trigger | Severity |
|------|---------|----------|
| 1-2s | One result > ±2 SD | Warning |
| 1-3s | One result > ±3 SD | Reject |
| 2-2s | Two consecutive > ±2 SD same side | Reject |
| R-4s | Range between consecutive results > 4 SD | Reject |
| 10x  | Ten consecutive results same side of mean | Reject |

### SDI Calculation (EQAS)

```
SDI = (your result - peer group mean) / peer group SD
```

| SDI | Grade |
|-----|-------|
| ≤ 0.5 | Excellent |
| ≤ 1.0 | Good |
| ≤ 2.0 | Acceptable |
| ≤ 3.0 | Borderline |
| > 3.0 | Unacceptable |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/qc` | All analytes with levels + results |
| POST | `/api/qc` | Add QC result (auto-evaluates Westgard) |
| GET | `/api/eqas` | All EQAS schemes with cycles + results |
| POST | `/api/eqas/result` | Submit EQAS result (auto-calculates SDI) |
| GET | `/api/documents` | All documents |
| POST | `/api/documents` | Create document |
| GET | `/api/equipment` | All equipment with calibration history |
| GET | `/api/capa` | All CAPAs |
| POST | `/api/capa` | Create CAPA |
| GET | `/api/training` | All training records |
| POST | `/api/training` | Assign or sign off training |

---

## Next Steps / Extensions

- [ ] Add authentication (NextAuth.js or Clerk)
- [ ] Add CAPA status workflow transitions with email notifications
- [ ] Add QC result entry form (client component)
- [ ] Add document PDF upload and storage (S3)
- [ ] Add audit log viewer page
- [ ] Add 21 CFR Part 11 compliant e-signature module
- [ ] Add automated calibration reminder emails (cron + nodemailer)
- [ ] Add QC Levey-Jennings multi-level overlay chart
