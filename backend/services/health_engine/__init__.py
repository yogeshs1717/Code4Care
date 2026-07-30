"""Deterministic health rule engine -- no LLM involvement.

Same input → same output. Every scoring rule lives in this module, not in code
scattered across the backend. Rules are simple additive-keyword heuristics that
are transparent and explainable.

Gemma explains these outputs. Gemma never produces them.
"""
