#!/usr/bin/env python3
"""
build_ingredient_dataset.py
===========================
One-time / repeatable OFFLINE pipeline that generates `common_ingredients.json`
from Open Food Facts (OFF) official data artifacts. No OFF API calls at runtime
of your app; this script is the only thing that ever touches OFF, and it can be
re-run whenever OFF publishes newer data.

Data sources (all official OFF artifacts, no page scraping):
  1. Ingredients taxonomy  https://static.openfoodfacts.org/data/taxonomies/ingredients.json
       -> canonical ids, multilingual names, synonyms (= aliases), parent links
  2. Additives taxonomies  additives.json, additives_classes.json
       -> exclusion sets (E/INS numbers and functional classes)
  3. Product dump for frequencies (choose one, in order of preference):
       a. Parquet on Hugging Face: hf://datasets/openfoodfacts/product-database
          (queried with DuckDB; only needed columns are read)
       b. JSONL dump: openfoodfacts-products.jsonl.gz (huge; use --jsonl-path
          if you already have it locally)

Pipeline stages:
  fetch -> count tag frequencies (world + India) -> resolve tags to taxonomy
  concepts (merging synonyms) -> exclude additives/nutrients/abstract classes
  -> categorize via taxonomy ancestors -> select top-N (global) UNION top-M
  (India) -> harvest label-gloss aliases from Indian products (optional)
  -> emit JSON + build report.

Usage:
  pip install duckdb requests
  python build_ingredient_dataset.py --out common_ingredients.json
  python build_ingredient_dataset.py --fixture   # offline self-test, sample out

Determinism: given the same cached inputs (--cache-dir), output is stable.
Commit the generated JSON *and* the report; regenerate quarterly.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

# --------------------------------------------------------------------------
# Configuration (versioned pipeline config -- NOT hand-authored data)
# --------------------------------------------------------------------------

TAXONOMY_URLS = {
    "ingredients": "https://static.openfoodfacts.org/data/taxonomies/ingredients.json",
    "additives": "https://static.openfoodfacts.org/data/taxonomies/additives.json",
    "additives_classes": "https://static.openfoodfacts.org/data/taxonomies/additives_classes.json",
}

PARQUET_CANDIDATES = [
    "hf://datasets/openfoodfacts/product-database@main/food.parquet",
    "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet",
]

E_NUMBER_RE = re.compile(r"^en:e\d{3}[a-z]?(\([ivx]+\))?$", re.IGNORECASE)

# Concepts excluded if the node itself, or ANY taxonomy ancestor, is listed.
# These are OFF taxonomy node ids for additive functional classes + nutrients.
EXCLUDE_ROOTS = {
    "en:additive", "en:e-number",
    "en:preservative", "en:colour", "en:color",
    "en:emulsifier", "en:stabiliser", "en:stabilizer", "en:thickener",
    "en:gelling-agent", "en:glazing-agent", "en:humectant",
    "en:sweetener", "en:artificial-sweetener",
    "en:flavour-enhancer", "en:flavor-enhancer",
    "en:acidity-regulator", "en:acid", "en:anti-caking-agent",
    "en:raising-agent", "en:antioxidant", "en:firming-agent",
    "en:flour-treatment-agent", "en:sequestrant", "en:bulking-agent",
    "en:vitamins", "en:minerals", "en:added-vitamins", "en:added-minerals",
    "en:flavouring", "en:flavoring", "en:natural-flavouring",
    "en:artificial-flavouring", "en:nature-identical-flavouring",
}

# Abstract taxonomy parents that are real nodes but not label-level food
# ingredients. Excluded from OUTPUT; still counted for the coverage report.
EXCLUDE_ABSTRACT = {
    "en:ingredient", "en:plant", "en:animal", "en:food",
    "en:monosaccharide", "en:disaccharide", "en:carbohydrate",
    "en:protein", "en:animal-protein", "en:plant-protein",
    "en:fat", "en:oil-and-fat", "en:vegetable-oil-and-fat",
    "en:oil", "en:vegetable-oil", "en:vegetable-fat",
    "en:cereal", "en:cereal-flour", "en:flour", "en:starch",
    "en:dairy", "en:vegetable", "en:root-vegetable", "en:taproot-vegetable",
    "en:fruit-vegetable", "en:onion-family-vegetable", "en:leaf-vegetable",
    "en:tuber", "en:fruit", "en:berries", "en:citrus-fruit",
    "en:nut", "en:tree-nut", "en:seed", "en:legume", "en:pulse",
    "en:spice", "en:herb", "en:condiment", "en:ferment",
    "en:microbial-culture", "en:enzyme", "en:added-sugar", "en:sugar-syrup",
    "en:palm-oil-and-fat", "en:palm", "en:meat", "en:fish", "en:seafood",
    "en:gluten", "en:milk-proteins",
}

# Category assignment: nearest ancestor present in this map wins (BFS upward).
# Keys are OFF taxonomy node ids; values are your app's category labels.
# This is routing config, versioned with the code -- extend freely.
CATEGORY_BUCKETS = {
    "en:cereal": "Cereals & grains", "en:flour": "Cereals & grains",
    "en:cereal-flour": "Cereals & grains", "en:starch": "Cereals & grains",
    "en:oil-and-fat": "Oils & fats", "en:vegetable-oil-and-fat": "Oils & fats",
    "en:palm-oil-and-fat": "Oils & fats",
    "en:dairy": "Dairy", "en:milk-proteins": "Dairy",
    "en:egg": "Eggs",
    "en:fruit": "Fruits", "en:berries": "Fruits",
    "en:vegetable": "Vegetables", "en:tuber": "Vegetables",
    "en:mushroom": "Fungi",
    "en:legume": "Legumes & pulses", "en:pulse": "Legumes & pulses",
    "en:nut": "Nuts & seeds", "en:tree-nut": "Nuts & seeds",
    "en:seed": "Nuts & seeds",
    "en:spice": "Spices & herbs", "en:herb": "Spices & herbs",
    "en:condiment": "Condiments & sauces",
    "en:added-sugar": "Sugars & syrups", "en:sugar-syrup": "Sugars & syrups",
    "en:monosaccharide": "Sugars & syrups",
    "en:disaccharide": "Sugars & syrups",
    "en:cocoa": "Cocoa & chocolate", "en:chocolate": "Cocoa & chocolate",
    "en:meat": "Meat & seafood", "en:fish": "Meat & seafood",
    "en:seafood": "Meat & seafood",
    "en:salt": "Salt & seasoning",
    "en:water": "Water & beverage bases", "en:tea": "Water & beverage bases",
    "en:coffee": "Water & beverage bases",
    "en:yeast": "Ferments & cultures",
    "en:microbial-culture": "Ferments & cultures",
    "en:ferment": "Ferments & cultures",
    "en:protein": "Proteins",
}

ALIAS_LANGS = ["en", "hi"]  # languages harvested from taxonomy synonyms

GLOSS_RE = re.compile(
    r"([A-Za-z][A-Za-z ]{2,40}?)\s*\(\s*([A-Za-z][A-Za-z ]{1,30}?)\s*\)"
)

# --------------------------------------------------------------------------
# Small pure helpers (unit-testable, no I/O)
# --------------------------------------------------------------------------

def normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower()
    s = s.replace("flavouring", "flavoring").replace("colour", "color")
    s = " ".join(w for w in re.split(r"[^a-z0-9]+", s) if w)
    return s.strip()


def tag_to_text(tag: str) -> str:
    """'en:milk-solids' -> 'milk solids'"""
    return tag.split(":", 1)[-1].replace("-", " ")


class Taxonomy:
    def __init__(self, nodes: dict):
        self.nodes = nodes
        self._anc_cache: dict[str, frozenset] = {}
        self.synonym_index = self._build_synonym_index()

    def _build_synonym_index(self) -> dict[str, str]:
        idx: dict[str, str] = {}
        for nid, node in self.nodes.items():
            forms = {tag_to_text(nid)}
            for lang in ALIAS_LANGS:
                name = (node.get("name") or {}).get(lang)
                if name:
                    forms.add(name)
                forms.update((node.get("synonyms") or {}).get(lang) or [])
            for f in forms:
                key = normalize(f)
                if key:
                    idx.setdefault(key, nid)  # first writer wins; stable
        return idx

    def parents(self, nid: str) -> list[str]:
        return (self.nodes.get(nid) or {}).get("parents") or []

    def ancestors(self, nid: str) -> frozenset:
        if nid in self._anc_cache:
            return self._anc_cache[nid]
        seen, stack = set(), list(self.parents(nid))
        while stack:
            p = stack.pop()
            if p in seen:
                continue
            seen.add(p)
            stack.extend(self.parents(p))
        fs = frozenset(seen)
        self._anc_cache[nid] = fs
        return fs

    def display_name(self, nid: str) -> str:
        name = ((self.nodes.get(nid) or {}).get("name") or {}).get("en")
        return name or tag_to_text(nid).title()

    def resolve(self, tag: str) -> str | None:
        """Map a product tag to a canonical taxonomy id (merging synonyms)."""
        if tag in self.nodes:
            return tag
        return self.synonym_index.get(normalize(tag_to_text(tag)))

    def aliases(self, nid: str) -> list[str]:
        node = self.nodes.get(nid) or {}
        canonical = self.display_name(nid)
        out, seen = [], {normalize(canonical)}
        for lang in ALIAS_LANGS:
            forms = [(node.get("name") or {}).get(lang)] + list(
                (node.get("synonyms") or {}).get(lang) or []
            )
            for f in forms:
                if not f:
                    continue
                k = normalize(f)
                if k and k not in seen:
                    seen.add(k)
                    out.append(f)
        return out

    def nearest_bucket(self, nid: str) -> tuple[str, str]:
        """(category, subcategory) via BFS up the parent links."""
        if nid in CATEGORY_BUCKETS:
            cat = CATEGORY_BUCKETS[nid]
        else:
            cat = None
            frontier = self.parents(nid)
            visited = set()
            while frontier and cat is None:
                nxt = []
                for p in frontier:
                    if p in visited:
                        continue
                    visited.add(p)
                    if p in CATEGORY_BUCKETS:
                        cat = CATEGORY_BUCKETS[p]
                        break
                    nxt.extend(self.parents(p))
                frontier = nxt
        subcat = self.display_name(self.parents(nid)[0]) if self.parents(nid) else ""
        return cat or "Other", subcat


def is_excluded(nid: str, tax: Taxonomy) -> str | None:
    """Return exclusion reason or None."""
    if E_NUMBER_RE.match(nid):
        return "e-number"
    if nid in EXCLUDE_ROOTS:
        return "additive-class"
    anc = tax.ancestors(nid)
    if anc & EXCLUDE_ROOTS:
        return "additive-descendant"
    if nid in EXCLUDE_ABSTRACT:
        return "abstract-class"
    return None


# --------------------------------------------------------------------------
# Stage 1: fetch taxonomies (cached)
# --------------------------------------------------------------------------

def fetch_json(url: str, cache_dir: Path) -> dict:
    import requests  # lazy: fixture mode must run with stdlib only

    cache_dir.mkdir(parents=True, exist_ok=True)
    cache = cache_dir / re.sub(r"[^A-Za-z0-9.]+", "_", url.split("/")[-1])
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    print(f"[fetch] {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    r = requests.get(url, headers=headers, timeout=300)
    r.raise_for_status()
    cache.write_bytes(r.content)
    return r.json()


# --------------------------------------------------------------------------
# Stage 2: frequency counts from the product dump
# --------------------------------------------------------------------------

def _duckdb_tag_expr(cols: list[str]) -> tuple[str, str] | None:
    """Pick the best available column. Prefer *_original_tags: it holds only
    what the label actually said; ingredients_tags also contains every taxonomy
    PARENT of each ingredient, which massively inflates abstract classes."""
    if "ingredients_original_tags" in cols:
        return "ingredients_original_tags", "unnest(ingredients_original_tags)"
    if "ingredients" in cols:
        return "ingredients", "unnest(ingredients)['id']"
    if "ingredients_tags" in cols:
        print("[warn] only ingredients_tags available: parent classes will be "
              "over-counted; EXCLUDE_ABSTRACT mitigates this in the output.")
        return "ingredients_tags", "unnest(ingredients_tags)"
    return None


def load_frequencies_duckdb(country_tag: str | None) -> Counter:
    import duckdb

    con = duckdb.connect()
    try:
        con.execute("INSTALL httpfs; LOAD httpfs;")
    except Exception:
        pass
    last_err = None
    for src in PARQUET_CANDIDATES:
        try:
            cols = [r[0] for r in con.execute(
                f"DESCRIBE SELECT * FROM read_parquet('{src}') LIMIT 0"
            ).fetchall()]
            picked = _duckdb_tag_expr(cols)
            if not picked:
                raise RuntimeError(f"no ingredient column in {src}: {cols[:20]}")
            col, expr = picked
            where = f"WHERE {col} IS NOT NULL"
            if country_tag and "countries_tags" in cols:
                where += (" AND list_contains(countries_tags, "
                          f"'{country_tag}')")
            q = (f"SELECT tag, COUNT(*) AS c FROM "
                 f"(SELECT {expr} AS tag FROM read_parquet('{src}') {where}) "
                 f"WHERE tag IS NOT NULL GROUP BY 1")
            print(f"[freq] querying {src} (col={col}, country={country_tag})")
            return Counter({t: int(c) for t, c in con.execute(q).fetchall()})
        except Exception as e:  # try next candidate
            last_err = e
            print(f"[freq] {src} failed: {e}")
    raise RuntimeError(f"all parquet sources failed; last error: {last_err}. "
                       f"Fall back to --jsonl-path.") 


def _walk_ingredient_ids(entries) -> list[str]:
    out = []
    for e in entries or []:
        if isinstance(e, dict):
            if e.get("id"):
                out.append(e["id"])
            out.extend(_walk_ingredient_ids(e.get("ingredients")))
    return out


def load_frequencies_jsonl(path: Path, country_tag: str | None) -> Counter:
    """Fallback: stream the official JSONL dump (very large; local file)."""
    counts: Counter = Counter()
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8", errors="replace") as fh:
        for i, line in enumerate(fh):
            if i % 500_000 == 0:
                print(f"[freq] jsonl line {i:,}")
            try:
                p = json.loads(line)
            except json.JSONDecodeError:
                continue
            if country_tag and country_tag not in (p.get("countries_tags") or []):
                continue
            tags = (p.get("ingredients_original_tags")
                    or _walk_ingredient_ids(p.get("ingredients"))
                    or [])
            counts.update(tags)
    return counts


# --------------------------------------------------------------------------
# Stage 6b (optional): harvest '(gloss)' aliases from Indian labels
# --------------------------------------------------------------------------

def harvest_glosses(tax: Taxonomy, kept_ids: set[str],
                    country_tag: str = "en:india") -> dict[str, list[str]]:
    """'Refined Wheat Flour (Maida)' on real labels => alias 'Maida'.
    Entirely OFF-derived; no hand-authored aliases."""
    import duckdb

    con = duckdb.connect()
    try:
        con.execute("INSTALL httpfs; LOAD httpfs;")
    except Exception:
        pass
    texts = []
    for src in PARQUET_CANDIDATES:
        try:
            cols = [r[0] for r in con.execute(
                f"DESCRIBE SELECT * FROM read_parquet('{src}') LIMIT 0"
            ).fetchall()]
            if "ingredients_text" not in cols or "countries_tags" not in cols:
                continue
            q = (f"SELECT ingredients_text FROM read_parquet('{src}') "
                 f"WHERE list_contains(countries_tags, '{country_tag}') "
                 f"AND ingredients_text IS NOT NULL")
            texts = [r[0] for r in con.execute(q).fetchall()]
            break
        except Exception as e:
            print(f"[gloss] {src} failed: {e}")
    found: dict[str, Counter] = {}
    for txt in texts:
        for left, right in GLOSS_RE.findall(txt or ""):
            cid = tax.synonym_index.get(normalize(left))
            if not cid or cid not in kept_ids:
                continue
            rid = tax.synonym_index.get(normalize(right))
            if rid and rid != cid:      # '(Sugar, ...)' style sub-lists etc.
                continue
            found.setdefault(cid, Counter())[right.strip().title()] += 1
    # keep a gloss only if seen on >= 3 distinct labels (OCR noise floor)
    return {cid: [g for g, n in ctr.items() if n >= 3]
            for cid, ctr in found.items()}


# --------------------------------------------------------------------------
# Stages 3-7: resolve, exclude, categorize, select, emit
# --------------------------------------------------------------------------

def build_dataset(tax: Taxonomy, world: Counter, india: Counter,
                  top_global: int, top_india: int, min_count: int):
    resolved_world: Counter = Counter()
    resolved_india: Counter = Counter()
    unresolved: Counter = Counter()
    excluded: Counter = Counter()
    reasons: Counter = Counter()

    for src_counter, dst in ((world, resolved_world), (india, resolved_india)):
        for tag, c in src_counter.items():
            cid = tax.resolve(tag)
            if cid is None:
                if dst is resolved_world:
                    unresolved[tag] += c
                continue
            dst[cid] += c

    keep_world: Counter = Counter()
    keep_india: Counter = Counter()
    for cid, c in resolved_world.items():
        reason = is_excluded(cid, tax)
        if reason:
            excluded[cid] += c
            reasons[reason] += c
        elif c >= min_count:
            keep_world[cid] = c
    for cid, c in resolved_india.items():
        if not is_excluded(cid, tax):
            keep_india[cid] = c

    selected = {cid for cid, _ in keep_world.most_common(top_global)}
    selected |= {cid for cid, _ in keep_india.most_common(top_india)}

    records = []
    for cid in selected:
        cat, subcat = tax.nearest_bucket(cid)
        records.append({
            "id": cid,
            "canonical_name": tax.display_name(cid),
            "aliases": tax.aliases(cid),
            "category": cat,
            "subcategory": subcat,
            "source_frequency": int(keep_world.get(cid, 0)),
            "source": "Open Food Facts",
        })
    records.sort(key=lambda r: (-r["source_frequency"], r["id"]))

    kept_occ = sum(keep_world[c] for c in selected if c in keep_world)
    all_food_occ = sum(keep_world.values()) or 1
    report = {
        "concepts_emitted": len(records),
        "coverage_of_food_ingredient_occurrences":
            round(kept_occ / all_food_occ, 4),
        "excluded_occurrences_by_reason": dict(reasons),
        "top_excluded": [
            {"id": k, "count": v} for k, v in excluded.most_common(50)],
        "top_unresolved_tags": [
            {"tag": k, "count": v} for k, v in unresolved.most_common(50)],
    }
    return records, report


# --------------------------------------------------------------------------
# Fixture mode: validates the full pipeline offline with real, previously
# retrieved OFF facet counts (in.openfoodfacts.org & ro-en.openfoodfacts.org,
# retrieved 2026-07-27). Aliases here come only from tag forms actually
# observed in that data -- nothing is invented.
# --------------------------------------------------------------------------

FIXTURE_TAXONOMY = {
    "en:sugar": {"name": {"en": "Sugar"}, "parents": ["en:added-sugar"]},
    "en:added-sugar": {"name": {"en": "Added sugar"}, "parents": ["en:disaccharide"]},
    "en:disaccharide": {"name": {"en": "Disaccharide"}, "parents": []},
    "en:salt": {"name": {"en": "Salt"}, "parents": []},
    "en:iodised-salt": {"name": {"en": "Iodised salt"}, "parents": ["en:salt"]},
    "en:water": {"name": {"en": "Water"}, "parents": []},
    "en:wheat-flour": {"name": {"en": "Wheat flour"},
                       "parents": ["en:cereal-flour"]},
    "en:refined-wheat-flour": {"name": {"en": "Refined wheat flour"},
                               "parents": ["en:wheat-flour"]},
    "en:cereal-flour": {"name": {"en": "Cereal flour"}, "parents": ["en:flour"]},
    "en:flour": {"name": {"en": "Flour"}, "parents": ["en:cereal"]},
    "en:cereal": {"name": {"en": "Cereal"}, "parents": ["en:plant"]},
    "en:plant": {"name": {"en": "Plant"}, "parents": []},
    "en:palm-oil": {"name": {"en": "Palm oil"},
                    "parents": ["en:palm-oil-and-fat"]},
    "en:palm-olein": {"name": {"en": "Palm olein"}, "parents": ["en:palm-oil"]},
    "en:palm-oil-and-fat": {"name": {"en": "Palm oil and fat"},
                            "parents": ["en:vegetable-oil-and-fat"]},
    "en:vegetable-oil-and-fat": {"name": {"en": "Vegetable oil and fat"},
                                 "parents": ["en:oil-and-fat"]},
    "en:oil-and-fat": {"name": {"en": "Oil and fat"}, "parents": []},
    "en:sunflower-oil": {"name": {"en": "Sunflower oil"},
                         "parents": ["en:vegetable-oil-and-fat"]},
    "en:milk": {"name": {"en": "Milk"}, "parents": ["en:dairy"]},
    "en:milk-solids": {"name": {"en": "Milk solids"},
                       "synonyms": {"en": ["milk-solids"]},
                       "parents": ["en:dairy"]},
    "en:skimmed-milk-powder": {"name": {"en": "Skimmed milk powder"},
                               "parents": ["en:dairy"]},
    "en:dairy": {"name": {"en": "Dairy"}, "parents": ["en:animal"]},
    "en:animal": {"name": {"en": "Animal"}, "parents": []},
    "en:cocoa": {"name": {"en": "Cocoa"}, "parents": ["en:plant"]},
    "en:cocoa-butter": {"name": {"en": "Cocoa butter"}, "parents": ["en:cocoa"]},
    "en:cocoa-solids": {"name": {"en": "Cocoa solids"}, "parents": ["en:cocoa"]},
    "en:turmeric": {"name": {"en": "Turmeric"}, "parents": ["en:spice"]},
    "en:cumin": {"name": {"en": "Cumin"}, "parents": ["en:spice"]},
    "en:black-pepper": {"name": {"en": "Black pepper"}, "parents": ["en:spice"]},
    "en:cardamom": {"name": {"en": "Cardamom"}, "parents": ["en:spice"]},
    "en:spice": {"name": {"en": "Spice"}, "parents": ["en:plant"]},
    "en:onion": {"name": {"en": "Onion"}, "parents": ["en:vegetable"]},
    "en:garlic": {"name": {"en": "Garlic"}, "parents": ["en:vegetable"]},
    "en:potato": {"name": {"en": "Potato"}, "parents": ["en:vegetable"]},
    "en:vegetable": {"name": {"en": "Vegetable"}, "parents": ["en:plant"]},
    "en:mango": {"name": {"en": "Mango"}, "parents": ["en:fruit"]},
    "en:fruit": {"name": {"en": "Fruit"}, "parents": ["en:plant"]},
    "en:peanut": {"name": {"en": "Peanut"}, "parents": ["en:legume"]},
    "en:almond": {"name": {"en": "Almond"}, "parents": ["en:tree-nut"]},
    "en:tree-nut": {"name": {"en": "Tree nut"}, "parents": ["en:nut"]},
    "en:nut": {"name": {"en": "Nut"}, "parents": ["en:plant"]},
    "en:legume": {"name": {"en": "Legume"}, "parents": ["en:plant"]},
    "en:yeast": {"name": {"en": "Yeast"}, "parents": ["en:ferment"]},
    "en:ferment": {"name": {"en": "Ferment"}, "parents": []},
    "en:glucose": {"name": {"en": "Glucose"}, "parents": ["en:monosaccharide"]},
    "en:monosaccharide": {"name": {"en": "Monosaccharide"}, "parents": []},
    "en:maltodextrin": {"name": {"en": "Maltodextrin"}, "parents": []},
    "en:e330": {"name": {"en": "E330"}, "parents": ["en:acidity-regulator"]},
    "en:acidity-regulator": {"name": {"en": "Acidity regulator"},
                             "parents": ["en:additive"]},
    "en:additive": {"name": {"en": "Additive"}, "parents": []},
    "en:soya-lecithin": {"name": {"en": "Soya lecithin"},
                         "parents": ["en:emulsifier"]},
    "en:emulsifier": {"name": {"en": "Emulsifier"}, "parents": ["en:additive"]},
    "en:natural-flavouring": {"name": {"en": "Natural flavouring"},
                              "parents": ["en:flavouring"]},
    "en:flavouring": {"name": {"en": "Flavouring"}, "parents": []},
}

# Real product counts from the OFF ingredient facets retrieved 2026-07-27.
FIXTURE_WORLD = Counter({
    "en:sugar": 1948, "en:salt": 1330, "en:iodised-salt": 566,
    "en:water": 757, "en:wheat-flour": 827, "en:refined-wheat-flour": 575,
    "en:palm-oil": 862, "en:palm-olein": 438, "en:sunflower-oil": 811,
    "en:milk": 986, "en:milk-solids": 465, "en:skimmed-milk-powder": 598,
    "en:cocoa": 522, "en:cocoa-butter": 540, "en:cocoa-solids": 348,
    "en:turmeric": 248, "en:cumin": 293, "en:black-pepper": 280,
    "en:cardamom": 236, "en:onion": 466, "en:garlic": 373, "en:potato": 165,
    "en:mango": 217, "en:peanut": 247, "en:almond": 196, "en:yeast": 545,
    "en:glucose": 1138, "en:maltodextrin": 291,
    "en:e330": 1056, "en:soya-lecithin": 505, "en:natural-flavouring": 784,
    "en:disaccharide": 2604, "en:plant": 1292,
})
FIXTURE_INDIA = Counter({
    "en:refined-wheat-flour": 575, "en:milk-solids": 465, "en:mango": 217,
    "en:turmeric": 248, "en:cumin": 293, "en:cardamom": 236,
    "en:palm-olein": 438, "en:iodised-salt": 566,
})


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="common_ingredients.json")
    ap.add_argument("--report", default="build_report.json")
    ap.add_argument("--cache-dir", default=".off_cache", type=Path)
    ap.add_argument("--top-global", type=int, default=800)
    ap.add_argument("--top-india", type=int, default=300)
    ap.add_argument("--min-count", type=int, default=25,
                    help="drop concepts seen on fewer than N products globally")
    ap.add_argument("--country", default="en:india",
                    help="secondary market to union into the selection")
    ap.add_argument("--jsonl-path", type=Path, default=None,
                    help="local openfoodfacts-products.jsonl(.gz) fallback")
    ap.add_argument("--harvest-glosses", action="store_true",
                    help="mine '(Maida)'-style aliases from labels of the "
                         "--country subset (OFF-derived, recommended)")
    ap.add_argument("--fixture", action="store_true",
                    help="offline self-test on embedded verified facet data")
    args = ap.parse_args()

    if args.fixture:
        print("[mode] fixture: offline pipeline validation on verified counts")
        tax = Taxonomy(FIXTURE_TAXONOMY)
        world, india = FIXTURE_WORLD, FIXTURE_INDIA
        if args.out == "common_ingredients.json":
            args.out = "common_ingredients.sample.json"
    else:
        raw = fetch_json(TAXONOMY_URLS["ingredients"], args.cache_dir)
        # additives taxonomy ids are folded into the ingredients taxonomy by
        # OFF; fetching additives.json lets us extend EXCLUDE via E-number ids
        try:
            additives = fetch_json(TAXONOMY_URLS["additives"], args.cache_dir)
            EXCLUDE_ROOTS.update(additives.keys())
        except Exception as e:
            print(f"[warn] additives taxonomy unavailable ({e}); "
                  f"relying on E-number regex + class ancestors")
        tax = Taxonomy(raw)
        print(f"[taxonomy] {len(tax.nodes):,} nodes, "
              f"{len(tax.synonym_index):,} synonym forms")
        if args.jsonl_path:
            world = load_frequencies_jsonl(args.jsonl_path, None)
            india = load_frequencies_jsonl(args.jsonl_path, args.country)
        else:
            world = load_frequencies_duckdb(None)
            india = load_frequencies_duckdb(args.country)
        print(f"[freq] {len(world):,} distinct tags world, "
              f"{len(india):,} in {args.country}")

    records, report = build_dataset(
        tax, world, india, args.top_global, args.top_india,
        args.min_count if not args.fixture else 1)

    if args.harvest_glosses and not args.fixture:
        glosses = harvest_glosses(tax, {r["id"] for r in records}, args.country)
        for r in records:
            extra = [g for g in glosses.get(r["id"], [])
                     if normalize(g) not in
                     {normalize(a) for a in r["aliases"]}
                     and normalize(g) != normalize(r["canonical_name"])]
            r["aliases"].extend(extra)
        report["label_gloss_aliases_added"] = sum(
            len(v) for v in glosses.values())

    Path(args.out).write_text(
        json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
    Path(args.report).write_text(
        json.dumps(report, indent=2), encoding="utf-8")
    print(f"[done] {len(records)} concepts -> {args.out}")
    print(f"[done] coverage of food-ingredient occurrences: "
          f"{report['coverage_of_food_ingredient_occurrences']:.1%}")
    print(f"[done] report -> {args.report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
