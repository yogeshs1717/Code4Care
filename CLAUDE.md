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

## 7. Innovation

- Deterministic rule engine + LLM reasoning, strictly separated:
  - **Rule Engine determines facts. Gemma explains facts. Gemma never decides facts.**

## 8. Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React, mobile-first responsive web  |
| Backend    | FastAPI (Python)                    |
| OCR        | Google Cloud Vision API             |
| LLM        | Gemma 4                             |
| Datasets   | Static JSON (offline-generated)     |
| Deployment | Vercel (frontend); backend separate |
| Database   | None (MVP) → PostgreSQL (future)    |

## 9. Architecture

Pipeline (each stage independently replaceable):

```
Image → OCR → Editable Text → Ingredient Resolver → Health Rule Engine → Report → Gemma → Conversation
```

- Strict one-directional data flow.
- Each component has a single responsibility and a defined input/output contract.
- All data access goes through repository abstractions — business logic never reads JSON files directly.

## 10. High-Level Folder Structure

> Indicative layout; refine when scaffolding. Keep boundaries as shown.

```
/frontend               # React app (Vercel)
/backend
  /api                  # FastAPI routes (thin controllers)
  /services
    ocr/                # OCR provider abstraction + GCV implementation
    resolver/           # Ingredient resolution
    health_engine/      # Deterministic rule evaluation
    llm/                # Gemma client + prompt/context builders
    alternatives/       # Healthier alternatives + marketplace links
  /repositories         # IngredientRepository, AdditiveRepository, RuleRepository
  /models               # Pydantic schemas (contracts between components)
  /data                 # common_ingredients.json, food_additives.json, health_rules.json
/scripts
  build_ingredient_dataset.py   # offline dataset generation (Open Food Facts)
```

## 11. System Components

| Component            | Responsibility                                            | Must NOT do                          |
|----------------------|-----------------------------------------------------------|--------------------------------------|
| OCR Service          | Image → raw ingredient text                               | Interpret or classify text           |
| Ingredient Resolver  | Raw text → canonical ingredients + additives              | Score health                         |
| Health Rule Engine   | Canonical ingredients → deterministic report facts        | Use LLM, invent rules                |
| Gemma Service        | Structured facts → summary, explanations, chat            | Decide/alter facts (see §15)         |
| Alternatives Service | Report → healthier alternatives + purchase links          | Score products itself                |
| Repositories         | Data access abstraction over JSON (future: PostgreSQL)    | Contain business logic               |
| Frontend             | Capture, crop, edit OCR text, render report, chat UI      | Any analysis logic                   |

## 12. Data Flow

1. Frontend: capture → preview → crop → upload.
2. Backend OCR service → Google Cloud Vision → raw text.
3. Frontend: user edits/confirms text.
4. Resolver: normalize → match canonical ingredients + additives → flag unresolved.
5. Health Engine: apply `health_rules.json` → score, processing level, concerns, positives, allergens.
6. Backend assembles structured report (deterministic facts only).
7. Gemma receives structured context → AI summary, explanations.
8. Chat: follow-up questions answered by Gemma against the same structured context.

## 13. OCR Pipeline

- Flow: Capture → Preview → Crop → OCR → Editable ingredient list → Analyze.
- User can always: crop, retake, upload another image, edit OCR text before analysis.
- OCR provider behind an interface (Google Cloud Vision is the current implementation, swappable).
- Raw OCR text is never sent to Gemma.

## 14. Ingredient Resolver Pipeline

- Input: user-confirmed ingredient text.
- Steps: split/normalize → alias/fuzzy match against `common_ingredients.json` → additive lookup (`food_additives.json`, INS numbers) → output canonical list + unresolved items.
- Unresolved ingredients are surfaced explicitly, never guessed.

## 15. Health Engine Pipeline

- Input: canonical ingredients + additives.
- Applies deterministic rules from `health_rules.json`.
- Outputs (all rule-derived, reproducible):
  - Health Score
  - Processing Level
  - Positive Ingredients
  - Ingredients of Concern
  - Health Considerations
  - Allergens
- Same input ⇒ same output, always. No LLM involvement.

## 16. Gemma Responsibilities

Gemma DOES (given structured backend context only):

- AI Summary of the report.
- Explain health report, ingredient concerns, positive ingredients.
- Conversational Q&A (multi-turn).
- Personalized explanations and recommendations.
- Suggest healthier alternatives and explain WHY they are healthier.
- General product understanding.

Gemma MUST NEVER:

- Calculate health scores.
- Classify ingredients.
- Decide ingredient safety.
- Perform OCR or receive raw OCR text.
- Replace or override deterministic logic.
- Invent ingredient properties or facts.
- Perform hidden calculations.

## 17. Health Report Structure

Ordered sections of every analysis:

1. Health Score
2. Processing Level
3. Positive Ingredients
4. Ingredients of Concern
5. Health Considerations
6. Allergens
7. AI Summary (Gemma)
8. Recommended Healthier Alternatives (Gemma explains why)
9. Purchase Links
10. Chat with Gemma

## 18. Healthier Alternatives

- Default part of every analysis.
- Gemma explains why each alternative is healthier.
- Purchase links where possible; FirstClub is the preferred marketplace (health-focused).
- Marketplace layer must be pluggable — additional marketplaces addable without core changes.

## 19. JSON Datasets

| Dataset                   | Status  | Contents                                                                  |
|---------------------------|---------|---------------------------------------------------------------------------|
| `common_ingredients.json` | Built   | 846 canonical ingredients, ~94.5% occurrence coverage                     |
| `food_additives.json`     | Planned | Preservatives, emulsifiers, sweeteners, colours, stabilizers, INS numbers, classifications |
| `health_rules.json`       | Planned | Deterministic health scoring rules                                        |

- `common_ingredients.json` generated offline by `build_ingredient_dataset.py` from Open Food Facts.
- No runtime dependency on Open Food Facts.
- Datasets accessed only through repositories.

## 20. External APIs

| API                     | Use                | Runtime? |
|-------------------------|--------------------|----------|
| Google Cloud Vision     | OCR                | Yes      |
| Gemma 4                 | Explanation/chat   | Yes      |
| Open Food Facts         | Dataset generation | No (offline only) |
| FirstClub (marketplace) | Purchase links     | Yes (planned)     |

## 21. Deployment Strategy

- Frontend: Vercel.
- Backend: deployed separately (FastAPI host TBD).
- Frontend ↔ backend via HTTP API; no shared runtime.

## 22. Design Principles

Prioritize: explainability, transparency, deterministic outputs, low coupling, high cohesion, modularity, replaceable components, future extensibility.

Avoid: LLM deciding scores, hidden calculations, hardcoded business logic in code (rules live in `health_rules.json`), runtime Open Food Facts dependency, premature database usage.

## 23. Error Handling Philosophy

- Fail visibly, never silently: unresolved ingredients, OCR failures, and LLM errors are surfaced to the user.
- Deterministic pipeline (resolver + health engine) must succeed independently of Gemma — report renders even if LLM is down.
- OCR errors are recoverable by design: user can retake, re-crop, or hand-edit text.
- Never fabricate data to fill gaps; report "unknown" explicitly.

## 24. Architecture Constraints

- One-directional pipeline; no stage reaches back upstream.
- All component boundaries defined by typed schemas (Pydantic models).
- Business logic depends on repository interfaces, never on file paths or storage format.
- Rules are data (`health_rules.json`), not code.
- Gemma consumes only structured context assembled by the backend.

## 25. Database Migration Strategy

- MVP: no database — all knowledge static JSON.
- Repository abstraction from day one:

```
IngredientRepository  →  JSON (today)  →  PostgreSQL (future)
```

- Future PostgreSQL adds: user accounts, scan history, personalization, learned aliases, cached products, analytics.
- Migration = new repository implementations only; zero business-logic changes.

## 26. Coding Guidelines

- Python (backend): type hints everywhere; Pydantic schemas for all inter-component contracts; services stateless; dependency injection for repositories and external clients.
- React (frontend): mobile-first; no analysis logic client-side; API responses rendered as-is.
- No hardcoded thresholds/rules in code — all scoring data lives in `health_rules.json`.
- Every external service (OCR, LLM, marketplace) behind an interface with one current implementation.
- Keep secrets in environment variables; never commit keys.

## 27. Deferred Features

- User accounts / authentication.
- Scan history.
- Persistent personalization profiles.
- Learned ingredient aliases.
- Product caching.
- Analytics.
- Additional marketplaces beyond FirstClub.

## 28. Future Roadmap

1. MVP: full pipeline (OCR → resolver → engine → report → Gemma chat) on static JSON.
2. Complete `food_additives.json` and `health_rules.json`.
3. Alternatives + FirstClub purchase links.
4. Repository-backed PostgreSQL migration (deferred features above).
5. Multi-marketplace support.
