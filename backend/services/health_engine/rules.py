"""Keyword-based rules for deterministic ingredient scoring.

These are the rules the project's architecture calls "health_rules.json".
For the MVP, they live here as Python data structures; a future extraction
to a JSON dataset is straightforward.
"""
from __future__ import annotations

# ── Ingredients of Concern ──────────────────────────────────────────────────────

CONCERN_INGREDIENTS: dict[str, dict] = {
    # Preservatives
    "sodium benzoate": {"concern": "May form benzene when combined with ascorbic acid.", "severity": "moderate"},
    "potassium sorbate": {"concern": "Common preservative; generally safe in small amounts.", "severity": "low"},
    "sodium nitrite": {"concern": "Can form nitrosamines linked to cancer risk.", "severity": "high"},
    "sodium nitrate": {"concern": "Linked to increased cancer risk in processed meats.", "severity": "high"},
    "bha": {"concern": "Suspected endocrine disruptor.", "severity": "moderate"},
    "bht": {"concern": "Suspected endocrine disruptor.", "severity": "moderate"},
    "sodium metabisulfite": {"concern": "Can trigger asthma in sensitive individuals.", "severity": "moderate"},
    "potassium metabisulfite": {"concern": "Can trigger asthma in sensitive individuals.", "severity": "moderate"},
    "calcium propionate": {"concern": "Generally safe; may cause migraines in some.", "severity": "low"},
    # Artificial sweeteners
    "aspartame": {"concern": "Potential neurotoxic effects; controversial.", "severity": "moderate"},
    "saccharin": {"concern": "Artificial sweetener with historical safety concerns.", "severity": "low"},
    "sucralose": {"concern": "May affect gut microbiome.", "severity": "low"},
    "acesulfame potassium": {"concern": "Artificial sweetener; long-term effects studied.", "severity": "low"},
    "neotame": {"concern": "Artificial sweetener, similar to aspartame.", "severity": "moderate"},
    # Artificial colours
    "red 40": {"concern": "Linked to hyperactivity in children.", "severity": "moderate"},
    "yellow 5": {"concern": "May cause allergic reactions; linked to hyperactivity.", "severity": "moderate"},
    "yellow 6": {"concern": "Linked to hyperactivity in children.", "severity": "moderate"},
    "blue 1": {"concern": "Generally safe; some studies raise questions.", "severity": "low"},
    "blue 2": {"concern": "Linked to hyperactivity in some studies.", "severity": "low"},
    "titanium dioxide": {"concern": "Genotoxicity concerns; banned in EU.", "severity": "high"},
    "tartrazine": {"concern": "Synthetic azo dye; linked to hyperactivity and allergic reactions.", "severity": "moderate"},
    "sunset yellow": {"concern": "Synthetic azo dye; may cause allergic reactions; linked to hyperactivity.", "severity": "moderate"},
    "ponceau 4r": {"concern": "Synthetic red azo dye; linked to hyperactivity in children.", "severity": "moderate"},
    "brilliant blue": {"concern": "Synthetic blue dye; may cause allergic reactions in sensitive individuals.", "severity": "low"},

    # Artificial flavours
    "monosodium glutamate": {"concern": "Excitotoxin; may cause headaches, sensitivity, and metabolic issues in some people.", "severity": "moderate"},
    "disodium inosinate": {"concern": "Flavour enhancer; often paired with MSG.", "severity": "low"},
    "disodium guanylate": {"concern": "Flavour enhancer; often paired with MSG.", "severity": "low"},
    # Trans fats / oils
    "partially hydrogenated oil": {"concern": "Primary source of artificial trans fat; banned in many countries.", "severity": "high"},
    "shortening": {"concern": "May contain trans fats.", "severity": "moderate"},
    "palm oil": {"concern": "High in saturated fat; environmental concerns.", "severity": "low"},
    "hydrogenated vegetable oil": {"concern": "May contain trans fats.", "severity": "high"},
    # High-fructose sweeteners
    "high fructose corn syrup": {"concern": "Linked to obesity and metabolic issues.", "severity": "moderate"},
    "corn syrup": {"concern": "Added sugar with no nutritional value.", "severity": "low"},
    "maltodextrin": {"concern": "High glycemic impact; may spike blood sugar.", "severity": "low"},
    # Thickeners / emulsifiers
    "carrageenan": {"concern": "May cause digestive inflammation in sensitive individuals.", "severity": "low"},
    "carboxymethyl cellulose": {"concern": "May disrupt gut microbiome.", "severity": "low"},
    "polysorbate 80": {"concern": "May disrupt gut microbiome; linked to inflammation.", "severity": "moderate"},
    # Others
    "propylene glycol": {"concern": "Generally safe in food; also used in antifreeze.", "severity": "low"},
    "sodium tripolyphosphate": {"concern": "May affect kidney function in sensitive individuals.", "severity": "low"},
    "potassium bromate": {"concern": "Possible carcinogen; banned in many countries.", "severity": "high"},
    "azodicarbonamide": {"concern": "Possible carcinogen; banned in EU and Australia.", "severity": "high"},
    "tertiary butylhydroquinone": {"concern": "Suspected health risks at high doses.", "severity": "moderate"},
    # Additional additives
    "potassium benzoate": {"concern": "Can form benzene, a carcinogen, when combined with ascorbic acid.", "severity": "moderate"},
    "caramel color": {"concern": "May contain 4-MEI, a possible carcinogen; varies by manufacturing.", "severity": "low"},
    "phosphoric acid": {"concern": "Can erode tooth enamel and may affect bone density with chronic intake.", "severity": "low"},
    "caffeine": {"concern": "Stimulant; may cause anxiety, sleep issues, or dependency.", "severity": "low"},
    "citric acid": {"concern": "Generally safe; may erode tooth enamel in high concentrations.", "severity": "low"},
}

# ── Positive Ingredients ─────────────────────────────────────────────────────────

POSITIVE_INGREDIENTS: dict[str, str] = {
    "whole grain": "Good source of fibre and complex carbohydrates.",
    "whole wheat": "Provides more fibre and nutrients than refined flour.",
    "oats": "Rich in beta-glucan, which supports heart health.",
    "rolled oats": "Good source of soluble fibre.",
    "almonds": "Rich in vitamin E, healthy fats, and magnesium.",
    "walnuts": "High in omega-3 fatty acids, good for brain health.",
    "chia seeds": "Excellent source of omega-3, fibre, and protein.",
    "flaxseed": "Rich in lignans and omega-3 fatty acids.",
    "quinoa": "Complete protein with all nine essential amino acids.",
    "spinach": "High in iron, calcium, and vitamins A and C.",
    "kale": "Nutrient-dense leafy green rich in antioxidants.",
    "broccoli": "Rich in fibre, vitamin C, and sulforaphane.",
    "berries": "High in antioxidants and vitamin C.",
    "blueberries": "Rich in antioxidants that support brain health.",
    "strawberries": "High in vitamin C and antioxidants.",
    "tomatoes": "Rich in lycopene, an antioxidant linked to heart health.",
    "avocado": "Rich in healthy monounsaturated fats and potassium.",
    "olive oil": "Heart-healthy monounsaturated fat; cornerstone of Mediterranean diet.",
    "extra virgin olive oil": "Highest quality olive oil with maximum antioxidants.",
    "coconut oil": "Contains MCTs; moderate use can be part of a balanced diet.",
    "salmon": "Excellent source of omega-3 fatty acids and protein.",
    "tuna": "Lean protein rich in selenium and B vitamins.",
    "eggs": "High-quality protein with essential amino acids.",
    "greek yogurt": "High in protein, probiotics, and calcium.",
    "legumes": "Excellent source of plant protein and soluble fibre.",
    "chickpeas": "Rich in fibre, protein, and folate.",
    "lentils": "High in fibre, protein, and iron.",
    "beans": "Excellent source of fibre, plant protein, and minerals.",
    "tofu": "Complete plant protein; good source of calcium and iron.",
    "mushrooms": "Source of B vitamins, selenium, and immune-supporting compounds.",
    "garlic": "Supports immune function and heart health.",
    "ginger": "Anti-inflammatory properties; aids digestion.",
    "turmeric": "Powerful anti-inflammatory compound curcumin.",
    "dark chocolate": "Rich in antioxidants; may support heart health (70%+ cocoa).",
    "cocoa": "Contains flavanols that support cardiovascular health.",
    "green tea": "Rich in catechins, powerful antioxidants.",
    "honey": "Natural sweetener with antimicrobial properties.",
}

# ── Processing Level Keywords ────────────────────────────────────────────────────

ULTRA_PROCESSED_KEYWORDS = [
    "high fructose corn syrup", "invert syrup", "maltodextrin", "modified starch",
    "hydrolyzed protein", "soy protein isolate", "emulsifier", "stabilizer",
    "artificial flavour", "artificial flavor", "artificial colour", "artificial color",
    "flavour enhancer", "flavor enhancer", "preservative", "sweetener",
    "hydrogenated oil", "partially hydrogenated", "thickener", "humectant",
    "anti-caking agent", "glazing agent", "bulking agent", "firming agent",
    "raising agent", "gelling agent", "carrageenan", "cellulose gum",
    "xanthan gum", "guar gum", "soy lecithin", "sunflower lecithin",
]

# ── Common Allergens ─────────────────────────────────────────────────────────────

ALLERGEN_KEYWORDS: dict[str, list[str]] = {
    "Milk / Dairy": ["milk", "cream", "butter", "cheese", "whey", "casein", "lactose",
                     "milk solids", "dairy", "yogurt", "yoghurt", "sour cream",
                     "condensed milk", "evaporated milk"],
    "Eggs": ["egg", "eggs", "egg white", "egg yolk", "albumin", "mayonnaise", "meringue"],
    "Peanuts": ["peanut", "peanuts", "peanut butter", "peanut flour", "groundnut"],
    "Tree nuts": ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut",
                  "brazil nut", "macadamia", "pine nut", "nut meal"],
    "Soy": ["soy", "soya", "soybean", "tofu", "edamame", "tempeh", "soy lecithin",
            "soy protein", "soybean oil", "miso"],
    "Wheat / Gluten": ["wheat", "flour", "bread", "pasta", "gluten", "semolina",
                       "spelt", "rye", "barley", "triticale", "couscous", "farina",
                       "durum", "farro", "graham flour", "malt", "malt extract"],
    "Fish": ["fish", "salmon", "tuna", "cod", "mackerel", "sardine", "anchovy",
             "herring", "trout", "bass", "halibut", "pollock"],
    "Shellfish": ["shrimp", "prawn", "crab", "lobster", "crayfish", "clam", "mussel",
                  "oyster", "scallop", "krill"],
    "Sesame": ["sesame", "sesame seed", "sesame oil", "tahini", "benne"],
    "Sulfites": ["sulfur dioxide", "sodium sulfite", "sodium bisulfite",
                 "sodium metabisulfite", "potassium metabisulfite", "sulfite"],
}
