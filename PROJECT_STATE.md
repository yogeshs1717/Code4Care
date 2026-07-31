# PROJECT_STATE.md — Current Implementation State

> Tracks progress only. Architecture and specifications live in `CLAUDE.md`.

**Version:** 0.2.0
**Last Updated:** 2026-07-31

---

## Current Phase

- MVP feature-complete: label photo → OCR → editable text → deterministic report → Gemma explanation → chat.
- **Personalization milestone complete** (v0.2.0): accounts (email OTP), health priorities, scan memory.
- Awaiting credentials from owner to enable live email OTP in production (see § Credentials Needed).

## Completed Milestones

- [x] Project scope, philosophy, and architecture defined (`CLAUDE.md`).
- [x] `common_ingredients_expanded.json` generated offline (2500 canonical ingredients, expanded coverage) via `build_ingredient_dataset.py`.
- [x] Backend scaffold (FastAPI, folder structure, Pydantic schemas).
- [x] Repository layer (Ingredient / Additive / Rule repositories over JSON).
- [x] `food_additives.json` dataset.
- [x] Health Rule Engine — deterministic scorer + fuzzy matcher (`services/health_engine`).
- [x] OCR service (Google Cloud Vision integration, `services/ocr`).
- [x] Ingredient Resolver (`services/resolver`).
- [x] Gemma integration — summary, explanations, chat (`services/llm`).
- [x] Frontend UI redesign — dark amber theme, Three.js particles, header/footer, restyled flows.
- [x] Frontend capture → crop → edit → report → chat flow.
- [x] **Personalization: email OTP auth, user health profiles, deterministic priority engine, scan memory.**
- [ ] Alternatives service + FirstClub purchase links.
- [ ] Deployment (Vercel frontend; backend host TBD — Render config drafted).

## Current Architecture Status

| Component            | Status      |
|----------------------|-------------|
| Frontend             | ✅ Built     |
| Backend API          | ✅ Built     |
| OCR Service          | ✅ Built     |
| Ingredient Resolver  | ✅ Built     |
| Health Rule Engine   | ✅ Built     |
| Gemma Service        | ✅ Built     |
| Alternatives Service | Planned     |
| Repositories         | ✅ Built     |
| Auth (email OTP)     | ✅ Built     |
| Personalization      | ✅ Built     |
| Scan history         | ✅ Built     |

## Dataset Status

| Dataset                   | Status  | Notes                                   |
|---------------------------|---------|-----------------------------------------|
| `common_ingredients_expanded.json` | ✅ Built | 2500 ingredients, expanded coverage |
| `food_additives.json`     | ✅ Built | Additives, INS numbers, classifications |
| `health_rules.json`       | ✅ Built | Deterministic scoring rules (as `health_engine/rules.py`) |

## API Integration Status

| API                 | Status         |
|---------------------|----------------|
| Google Cloud Vision | ✅ Integrated  |
| Gemma 4             | ✅ Integrated  |
| Resend (OTP email)  | ⚠️ Dev fallback active (prints code to console) — needs `RESEND_API_KEY` |
| FirstClub           | Not integrated |

## Current Decisions

- **Database: SQLite locally, PostgreSQL in production** — async SQLAlchemy 2.0, `init_db()` creates tables at startup (Alembic migrations deferred).
- Rule Engine decides facts; Gemma only explains — never scores or classifies.
- **Personalization is deterministic** — a dedicated keyword engine decides flag/block; Gemma never overrides a personal verdict.
- Block UX = hard block only: report renders normally but the verdict is replaced with a red rejection; no way to reveal the score.
- Sign-in via email OTP (Resend); JWT access tokens (HS256, key rotation supported).
- Gemma receives structured context only; never raw OCR.
- Open Food Facts used offline only; no runtime dependency.
- FirstClub is the preferred (first) marketplace; layer must stay pluggable.

## Credentials Needed (owner to provide)

| Credential              | Where to get it                                   | Where it goes                                   | What breaks without it                      |
|-------------------------|---------------------------------------------------|-------------------------------------------------|---------------------------------------------|
| `RESEND_API_KEY`        | https://resend.com/api-keys                       | `backend/.env` (`RESEND_API_KEY`)               | OTP codes print to server console instead of email |
| `JWT_SECRET_KEYS`       | Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` | `backend/.env` (`JWT_SECRET_KEYS`) | Already generated for local dev; set a fresh one in prod |
| `DATABASE_URL` (optional) | Postgres provider (e.g. Render)                  | `backend/.env` (`DATABASE_URL`)                 | Dev uses SQLite; fine until production |

## Deferred Decisions

- Backend hosting platform (Render config drafted in `backend/render.yaml`).
- Gemma 4 hosting/serving method (API vs self-hosted).
- FirstClub integration mechanism (API vs links).
- Alembic migrations for schema evolution.

## Current Blockers

- None. Live email OTP needs the credentials above.

## Immediate Next Task

- Owner supplies credentials above → test live OTP email.
- Alternatives service + FirstClub purchase links.
- Deployment.

## Risks

- OCR accuracy on real-world labels (glare, curvature, small fonts).
- Resolver coverage gaps (~5.5% of ingredient occurrences unmatched).
- `health_rules.json` credibility — rules need a defensible evidence basis.
- Gemma hallucination risk if context contract is not strictly enforced.
- FirstClub integration feasibility unknown.
- Personalization thresholds (e.g. diabetes block on 3+ sweeteners) are heuristic — may need tuning with real-world labels.

## TODO Checklist

- [ ] Owner provides `RESEND_API_KEY`, prod `JWT_SECRET_KEYS`.
- [ ] Live-test email OTP (Resend).
- [ ] Alternatives service + FirstClub purchase links.
- [ ] Alembic migrations.
- [ ] Deployment (Vercel frontend + Render backend).
