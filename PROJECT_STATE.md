# PROJECT_STATE.md — Current Implementation State

> Tracks progress only. Architecture and specifications live in `CLAUDE.md`.

**Version:** 0.1.0
**Last Updated:** 2026-07-28

---

## Current Phase

- Pre-development / specification. No application code exists yet.

## Completed Milestones

- [x] Project scope, philosophy, and architecture defined (`CLAUDE.md`).
- [x] `common_ingredients_expanded.json` generated offline (2500 canonical ingredients, expanded coverage) via `build_ingredient_dataset.py`.

## Pending Milestones

- [ ] Backend scaffold (FastAPI, folder structure, Pydantic schemas).
- [ ] Repository layer (Ingredient / Additive / Rule repositories over JSON).
- [ ] `food_additives.json` dataset.
- [ ] `health_rules.json` dataset.
- [ ] OCR service (Google Cloud Vision integration).
- [ ] Ingredient Resolver.
- [ ] Health Rule Engine.
- [ ] Gemma integration (summary, explanations, chat).
- [ ] Alternatives service + FirstClub purchase links.
- [ ] Frontend (capture → crop → OCR edit → report → chat).
- [ ] Deployment (Vercel frontend; backend host TBD).

## Current Architecture Status

| Component            | Status      |
|----------------------|-------------|
| Frontend             | Not started |
| Backend API          | Not started |
| OCR Service          | Not started |
| Ingredient Resolver  | Not started |
| Health Rule Engine   | Not started |
| Gemma Service        | Not started |
| Alternatives Service | Not started |
| Repositories         | Not started |

## Dataset Status

| Dataset                   | Status  | Notes                                   |
|---------------------------|---------|-----------------------------------------|
| `common_ingredients_expanded.json` | ✅ Built | 2500 ingredients, expanded coverage |
| `food_additives.json`     | Planned | Additives, INS numbers, classifications |
| `health_rules.json`       | Planned | Deterministic scoring rules             |

## API Integration Status

| API                 | Status         |
|---------------------|----------------|
| Google Cloud Vision | Not integrated |
| Gemma 4             | Not integrated |
| FirstClub           | Not integrated |

## Current Decisions

- No database in MVP; static JSON behind repository abstractions.
- Rule Engine decides facts; Gemma only explains — never scores or classifies.
- Gemma receives structured context only; never raw OCR.
- Open Food Facts used offline only; no runtime dependency.
- FirstClub is the preferred (first) marketplace; layer must stay pluggable.

## Deferred Decisions

- Backend hosting platform.
- Gemma 4 hosting/serving method (API vs self-hosted).
- `health_rules.json` schema and scoring formula.
- Resolver matching strategy details (fuzzy threshold, alias handling).
- FirstClub integration mechanism (API vs links).

## Current Blockers

- None.

## Immediate Next Task

- Awaiting additional project details from owner before generating code or further documentation.

## Risks

- OCR accuracy on real-world labels (glare, curvature, small fonts).
- Resolver coverage gaps (~5.5% of ingredient occurrences unmatched).
- `health_rules.json` credibility — rules need a defensible evidence basis.
- Gemma hallucination risk if context contract is not strictly enforced.
- FirstClub integration feasibility unknown.

## TODO Checklist

- [ ] Define Pydantic schemas for pipeline contracts (OCR → Resolver → Engine → Gemma).
- [ ] Design `health_rules.json` schema.
- [ ] Design `food_additives.json` schema.
- [ ] Scaffold backend per `CLAUDE.md` §10.
- [ ] Scaffold frontend flow (capture → crop → edit → report → chat).
- [ ] Set up Google Cloud Vision credentials/env config.
- [ ] Decide Gemma serving method.
- [ ] Decide backend host.
