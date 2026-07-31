# CLAUDE.md — Master Engineering Specification

> Source of truth for WHAT this project is and HOW it is built.
> Progress lives in `PROJECT_STATE.md` — never here.

---

## 1. Project Overview

- AI-powered web app that analyzes packaged food products from their ingredient labels.
- User photographs an ingredient label → OCR → deterministic analysis → explainable health report → conversational AI.
- NOT a calorie counter. NOT an OCR project. NOT a nutrition database.

## 2. Problem Statement

- Ingredient labels are unreadable to ordinary consumers (chemical names, INS numbers, marketing obfuscation).
- Consumers cannot judge processing level, additive risk, or allergens from a label.

## 3. Vision

- Explainable AI nutrition assistant: every claim traceable to a deterministic rule; AI only explains, never decides.

## 4. Target Users

- Ordinary consumers, non-experts, mobile-first usage at point of purchase.

## 5. Core Objectives

- Extract ingredient text from a label photo with user correction.
- Resolve raw text to canonical ingredients.
- Produce a deterministic, rule-based health report.
- Explain the report in simple language via Gemma.
- Recommend healthier alternatives with purchase links.
- Support multi-turn conversation about the product.

## 6. Non-Goals

- Calorie/macro counting.
- Building an OCR engine.
- Building a general nutrition database.
- Medical advice or diagnosis.
- Runtime dependency on Open Food Facts.

## 7. Innovation — CORRECT ARCHITECTURE

- **Rule Engine is the PRIMARY scorer.** Deterministic, reproducible, ~1ms execution.
  - Base score 80, deductions for real additive concerns (preservatives, trans fats, artificial additives).
  - Fuzzy matching against 2500-item `common_ingredients_expanded.json` dataset for unknown ingredients (positive/neutral only — never concerning).
  - Sugar density penalty, wholesome bonus tapering.
  - Same input always → same output. No external API needed for scoring.
- **Gemma is the EXPLAINER + UNKNOWN CLASSIFIER.**
  - Generates consumer-friendly AI summary from the deterministic report.
  - Classifies ingredients still unresolved after fuzzy matching (rare).
  - Chat mode for multi-turn Q&A about the report.
  - NEVER decides the score — that's the rule engine's job.

### Scoring Calibration (verified in test suite):
| Product | Target Score | Current |
|---------|-------------|---------|
| Healthy salad (spinach, kale, olive oil, nuts) | 95-100 | 100 |
| Plain yogurt (milk, cultures) | 80-87 | 87 |
| White bread (flour, water, yeast, salt, sugar) | 75-82 | 80 |
| Biscuit (flour, sugar, palm oil, salt, emulsifier) | 62-72 | 66 |
| Potato chips (potatoes, oil, salt, additives) | 58-65 | 64 |
| Chocolate bar (sugar, cocoa butter, emulsifiers) | 55-66 | 66 |
| Kurkure-style snack (flours, MSG, colours, flavour) | 28-42 | 31 |
| Sugary soda (HFCS, phosphoric acid, caffeine) | 35-45 | 38 |
| Highly processed oil (trans fats, preservatives) | 5-20 | 9 |

## 8. Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + TypeScript + Vite        |
| Styling    | Tailwind CSS v4                     |
| UI libs    | framer-motion, lucide-react, Three.js (react-three-fiber) |
| Charts     | NO RECHARTS — Three.js 3D viz + pure SVG |
| Backend    | FastAPI (Python 3.13)               |
| OCR        | Google Cloud Vision API             |
| LLM        | Gemma 4 (gemma-4-31b-it via Google AI Studio) |
| Datasets   | Static JSON (offline-generated)     |
| Deployment | Vercel (frontend); backend separate |
| Database   | Async SQLAlchemy 2.0 — SQLite (dev) / PostgreSQL (prod) |
| Auth       | Email OTP (Resend); JWT (PyJWT, HS256, key rotation) |

## 9. Architecture

Pipeline (each stage independently replaceable):

```
Image → OCR → Editable Text → Ingredient Resolver → Health Rule Engine (primary scorer) → Fuzzy Matcher → Gemma (explainer + fallback) → Conversation
```

- **Rule engine runs FIRST** (deterministic, ~1ms, no API calls).
- **Fuzzy matcher** resolves unknowns against `common_ingredients_expanded.json` (positive/neutral classification).
- **Gemma** receives the deterministic report for:
  a) AI summary / explanation (consumer-friendly).
  b) Classifying any remaining unresolved ingredients.
- Strict one-directional data flow.
- Each component has a single responsibility and a defined input/output contract.
- All data access goes through repository abstractions — business logic never reads JSON files directly.

## 10. High-Level Folder Structure

```
/frontend               # React app (Vercel)
  src/components/
    ScoreGlobe.tsx       # Three.js 3D score visualization
    ReportDashboard.tsx  # Main report UI (glassmorphism, responsive grid)
    AuthModal.tsx        # Email OTP sign-in
    HealthProfileModal.tsx  # Health priorities + allergies + recent scans
  src/auth/AuthContext.tsx  # Auth state, token persistence (localStorage)
  src/api/authClient.ts     # Auth / profile / history API client
  src/types/auth.ts         # Auth + personalization types
/backend
  /api                  # FastAPI routes (thin controllers)
    routes/
      auth.py           # OTP request/verify, Google sign-in, /me
      profile.py        # GET/PUT health profile
      history.py        # GET recent scans
  /db                   # Async SQLAlchemy: base.py (engine/session), models.py
  /services
    ocr/                # OCR provider abstraction + GCV implementation
    resolver/           # Ingredient resolution
    health_engine/      # Deterministic rule evaluation + fuzzy matching
      engine.py         # Primary scoring pipeline
      rules.py          # Keyword-based concern/positive/processing rules
      ingredient_matcher.py  # Fuzzy matching against common_ingredients_expanded.json
    auth/               # JWT, OTP (Resend/console), user store
    personalization/    # Deterministic priority engine (rules.py + engine.py)
    llm/                # Gemma client + prompt/context builders
    alternatives/       # Healthier alternatives + marketplace links
  /repositories         # IngredientRepository, AdditiveRepository, RuleRepository
  /models               # Pydantic schemas (contracts between components)
  /data                 # common_ingredients_expanded.json, food_additives.json, care.db (dev)
/scripts
  build_ingredient_dataset.py   # offline dataset generation (Open Food Facts)
```

## 10a. Personalization Engine

- **Decisions are deterministic, never delegated to Gemma** — same guarantee as the base scorer.
- User health profile: subset of `{diabetes, hypertension, heart, allergies}` + free-text personal allergens.
- Per-priority keyword lists and thresholds in `services/personalization/rules.py`:
  - `flag_when_any` → warning shown on the report.
  - `block_when_any` → hard block (specific high-risk ingredients like HFCS, MSG, trans fats).
  - `block_when_many` → hard block when N+ distinct matches appear (e.g. 3+ sweeteners = very high sugar).
  - `block_when_dominant` → diabetes special case: sugar as the FIRST label ingredient (by weight) is a block.
- `evaluate_personalization` runs after the base report for authenticated users; anonymous scans get no personalization.
- Verdicts: `safe` / `flag` (warnings) / `block` (report hidden behind a red rejection screen).
- Block thresholds are heuristics; tune against real labels as data comes in.

## 10b. Auth & Session Model

- **Email sign-in**: `POST /otp/request` → 6-digit code (Resend email; console in dev) → `POST /otp/verify` → JWT. Codes are SHA-256 hashed, expire in 5 min, max 5 attempts, rate-limited (1/30s, ≤5 live per email).
- **JWT**: HS256. `JWT_SECRET_KEYS` comma-separated for rotation — first key signs, all verify. `Authorization: Bearer <token>`.
- **Scan memory**: every authenticated analysis stores a `ScanHistory` row (ingredient text + report JSON), surfaced as "recent scans" in the profile modal.

## 11. System Components

| Component              | Responsibility                                            | Must NOT do                          |
|------------------------|-----------------------------------------------------------|--------------------------------------|
| OCR Service            | Image → raw ingredient text                               | Interpret or classify text           |
| Ingredient Resolver    | Raw text → canonical ingredients + additives              | Score health                         |
| Health Rule Engine     | PRIMARY scorer — deterministic rule evaluation + fuzzy matching | Rely on external APIs for scoring   |
| Fuzzy Matcher          | Resolve unknowns via difflib against 846-item dataset     | Assign concerning impacts            |
| Gemma Service          | AI summary + explanation + chat + rare fallback classify  | Decide the score or ignore rules     |
| Alternatives Service   | Report → healthier alternatives + purchase links          | Score products itself                |
| Repositories           | Data access abstraction over JSON (future: PostgreSQL)    | Contain business logic               |
| Frontend               | Capture, crop, edit OCR text, render report, chat UI      | Any analysis logic                   |

## 12. Data Flow

1. Frontend: capture → preview → crop → upload.
2. Backend OCR service → Google Cloud Vision → raw text.
3. Frontend: user edits/confirms text.
4. Resolver: normalize → match canonical ingredients + additives → flag unresolved.
5. **Health Rule Engine (PRIMARY):** deterministic scoring — keyword matches for additives → fuzzy match against 846-ingredient dataset → compute score (base 80, deductions, bonuses) → return full report. ~1ms, zero API calls.
6. **Gemma (explainer):** receives deterministic report → generates AI summary + classifies any remnants.
7. Backend assembles structured report.
8. Gemma chat: follow-up questions answered by Gemma against the same structured context.

## 13. Scoring Rules

- Base: 80 (every real food starts here)
- High-severity concern: -15 (preservatives, trans fats, carcinogens like potassium bromate, sodium nitrite, partially hydrogenated oil)
- Moderate concern: -8 (additives with significant concerns — aspartame, BHA/BHT, HFCS, potassium benzoate)
- Low concern: -3 (minor additives — maltodextrin, MSG, carrageenan, sugar, palm oil)
- Ultra-processed: -12
- Processed: -5
- Positive ingredient: +5 (up to 3, then +2 thereafter — diminishing returns)
- Sugar density: -5 per sugar item beyond the 1st
- Wholesome bonus: +5 (if >3 positives AND <3 concerns)
- Clamp to [0, 100]

## 14. Fuzzy Matching

- Uses `difflib.get_close_matches` against 2500-item `common_ingredients_expanded.json`.
- Multi-stage matching: exact → fuzzy (word-boundary aware) → containment.
- Category-based impact: Vegetables/Fruits/Nuts/Legumes/Spices → positive only.
- Everything else → neutral. NEVER assigns "concerning" — real concerns come from keyword rules.
- Sugar/oil categories detected separately for density penalties.

## 15. Chat Banned Libraries

- **RECHARTS IS BANNED.** Never install or import recharts.
- Use Three.js (react-three-fiber) for 3D visualizations.
- Use pure SVG for simple gauges and bars.
- Use framer-motion for all animation.

## 16. Gemma Responsibilities

Gemma DOES (given the deterministic report):

- AI Summary of the report (consumer-friendly explanation).
- Classify ingredients unresolved after fuzzy matching.
- Conversational Q&A (multi-turn).
- Explain health report, ingredient concerns, positive ingredients.
- Personalized explanations and recommendations.

Gemma MUST NEVER:

- Decide or calculate the score — the rule engine is the sole judge of scoring.
- Ignore or override the scoring rules or report data.
- Perform OCR or receive raw OCR text without the scoring context.
- Invent ingredient properties or facts outside the report data.

## 17. Health Report Structure

Ordered sections of every analysis:

1. Health Score (3D interactive globe via Three.js)
2. Processing Level
3. At-a-Glance stats (concerns, positives, allergens, notes)
4. Score Breakdown (animated bars)
5. AI Summary (Gemma)
6. Positive Ingredients
7. Ingredients of Concern
8. Health Considerations
9. Allergens
10. Chat with Gemma

## 18. UI Design System

- **Color palette**: Dark theme: bg (#0f0f1a), bg-alt (#1a1a2e), bg-card (#1e1e32), bg-elevated (#252540). Primary amber (#f59e0b) with warm gradients. Score colors: Good (#34d399), Moderate (#fbbf24), Concerning (#fb923c), Poor (#f87171). NO neon colors. NO Google Blue/Green.
- **Components**: Glassmorphism on dark (bg-white/[0.03-0.06] backdrop-blur), rounded-2xl, border-white/5-10, subtle amber glow effects.
- **Layout**: Responsive 1-col mobile → 3-col desktop (max-w-6xl) with sticky header + floating modals.
- **3D viz**: Three.js ScoreGlobe (pulsing core + rotating arc + orbiting particles) + ParticleBackground (120-particle ambient field on hero).
- **Header/Footer**: Fixed top header (Code4Care logo + nav + sign-in button), full footer with links/copyright on content pages.
- **Animations**: framer-motion scroll-reveal (useInView) + spring transitions.
- **Icons**: lucide-react only.
- **Typography**: Poppins (headings), Inter (body). White text with 40-80% opacity hierarchy.
- **NO Recharts, NO Chart.js, NO D3**.

## 19. External APIs

| API                     | Use                | Runtime? |
|-------------------------|--------------------|----------|
| Google Cloud Vision     | OCR                | Yes      |
| Gemma 4 (aistudio)      | Explanation/chat   | Yes      |
| Open Food Facts         | Dataset generation | No (offline only) |
| FirstClub (marketplace) | Purchase links     | Yes (planned)     |

## 20. Error Handling Philosophy

- Fail visibly, never silently: unresolved ingredients, OCR failures, and LLM errors are surfaced to the user.
- Deterministic pipeline (resolver + health engine) must succeed independently of Gemma — report renders even if LLM is down.
- OCR errors are recoverable by design: user can retake, re-crop, or hand-edit text.
- Never fabricate data to fill gaps; report "unknown" explicitly.

## 21. Deployment Strategy

- Frontend: Vercel.
- Backend: deployed separately (FastAPI host TBD).
- Frontend ↔ backend via HTTP API; no shared runtime.
- Env vars: GEMINI_API_KEY (from aistudio.google.com) in backend/.env.

## 22. Coding Guidelines

- Python (backend): type hints everywhere; Pydantic schemas for all inter-component contracts; services stateless; dependency injection for repositories and external clients.
- React (frontend): no analysis logic client-side; API responses rendered as-is.
- No hardcoded thresholds/rules in code — all scoring data lives in rules.py (extractable to JSON later).
- Every external service (OCR, LLM, marketplace) behind an interface with one current implementation.
- Keep secrets in environment variables; never commit keys.
