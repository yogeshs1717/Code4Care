"""Ingredient-list parsing.

Splits a label's ingredient declaration into individual items. Bracketed
sub-lists are expanded into their own items while keeping a reference to the
parent, so "EMULSIFIERS [322(i) & 471]" yields the emulsifier plus each code.

Purely structural: nothing here interprets or classifies what it finds.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Tolerant of OCR clipping the leading capital ("NGREDIENTS:").
_HEADER = re.compile(r"[a-z]*ngredients?\s*[:\-–—]", re.IGNORECASE)
_HEADER_SEARCH_WINDOW = 120

# A quantity annotation, e.g. "(24%)" or "(0.7 %)". A percent sign is required:
# a bare number is an INS additive code ("(440)"), which is an ingredient.
_LETTER = re.compile(r"[a-z]", re.IGNORECASE)


def _is_quantity(text: str) -> bool:
    return "%" in text and not _LETTER.search(text)

# Separators inside a bracketed sub-list.
_CHILD_SPLIT = re.compile(r"\s*(?:[,;&]|\band\b)\s*", re.IGNORECASE)

_OPENERS = "([{"
_CLOSERS = ")]}"


@dataclass(frozen=True)
class ParsedItem:
    """One declared item. `parent` is set for members of a bracketed sub-list."""

    raw_text: str
    parent: str | None = None


def _strip_header(text: str) -> str:
    match = _HEADER.search(text[:_HEADER_SEARCH_WINDOW])
    return text[match.end():] if match else text


def _split_top_level(text: str) -> list[str]:
    """Split on separators that sit outside any bracket.

    "&" counts: labels routinely join two ingredients with it ("PALM OIL &
    VEGETABLE FAT"). The word "and" does not — it occurs inside ingredient
    names ("NATURE IDENTICAL AND ARTIFICIAL FLAVOURING SUBSTANCES").
    """
    parts: list[str] = []
    buffer: list[str] = []
    depth = 0
    for char in text:
        if char in _OPENERS:
            depth += 1
        elif char in _CLOSERS:
            depth = max(0, depth - 1)
        if char in ",;&" and depth == 0:
            parts.append("".join(buffer))
            buffer = []
        else:
            buffer.append(char)
    parts.append("".join(buffer))
    return [p.strip() for p in parts if p.strip()]


def _split_head_and_groups(chunk: str) -> tuple[str, list[str]]:
    """Separate an item's head text from its top-level bracketed groups.

    Nested brackets stay inside the group text: "322(i) & 471" survives intact.
    """
    head: list[str] = []
    groups: list[str] = []
    current: list[str] = []
    depth = 0

    for char in chunk:
        if char in _OPENERS:
            depth += 1
            if depth == 1:
                current = []
                continue
        elif char in _CLOSERS:
            depth = max(0, depth - 1)
            if depth == 0:
                groups.append("".join(current))
                continue
        if depth == 0:
            head.append(char)
        else:
            current.append(char)

    if depth > 0 and current:  # unbalanced bracket: keep what we collected
        groups.append("".join(current))

    return "".join(head).strip(), [g.strip() for g in groups if g.strip()]


def parse_ingredient_list(text: str) -> list[ParsedItem]:
    """Parse `text` into declared items, parents before their children.

    Newlines are treated as spaces: OCR wraps mid-phrase, so only commas and
    semicolons are trusted as separators.
    """
    if not text or not text.strip():
        return []

    flattened = _strip_header(text).replace("\n", " ").replace("\r", " ")

    items: list[ParsedItem] = []
    for chunk in _split_top_level(flattened):
        head, groups = _split_head_and_groups(chunk)
        if head:
            items.append(ParsedItem(raw_text=head))

        parent = head or None
        for group in groups:
            if _is_quantity(group):
                continue  # a quantity annotation, not an ingredient
            for child in _CHILD_SPLIT.split(group):
                child = child.strip()
                if child and not _is_quantity(child):
                    items.append(ParsedItem(raw_text=child, parent=parent))

    return items
