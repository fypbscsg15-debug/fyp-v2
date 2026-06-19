import warnings
from itertools import combinations
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

MODEL_PATH = Path(__file__).resolve().parents[3] / "similarity_model.pkl"
THRESHOLD = 0.85

_cache: dict | None = None


def preload_model() -> None:
    """Call once at startup so the first verify request is fast."""
    global _cache
    if _cache is None:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _cache = joblib.load(MODEL_PATH)


def _get_model() -> dict:
    if _cache is None:
        preload_model()
    return _cache  # type: ignore[return-value]


def _severity(description: str) -> str:
    desc = description.lower()
    if any(w in desc for w in ["contraindicated", "avoid", "fatal", "life-threatening", "serious risk"]):
        return "high"
    if any(w in desc for w in ["monitor", "caution", "increase the risk", "risk or severity", "decrease", "increase"]):
        return "medium"
    return "low"


def check_drug_interactions(drug_names: list[str]) -> list[dict]:
    """
    Given a list of drug names (generic preferred), return interaction alerts
    for all pairs whose cosine similarity to a known interaction pair >= THRESHOLD.
    """
    clean = [d.strip() for d in drug_names if d.strip()]
    if len(clean) < 2:
        return []

    model = _get_model()
    tfidf = model["tfidf"]
    X = model["X"]
    df = model["df"]

    pairs = list(combinations(clean, 2))

    # Check both orderings for every pair in one batched call
    queries: list[str] = []
    for a, b in pairs:
        queries.append(f"{a} {b}")
        queries.append(f"{b} {a}")

    q_vecs = tfidf.transform(queries)
    sims = cosine_similarity(q_vecs, X)
    best_row_idx = np.argmax(sims, axis=1)
    best_scores = sims[np.arange(len(queries)), best_row_idx]

    alerts: list[dict] = []
    seen: set[frozenset] = set()

    for i, (a, b) in enumerate(pairs):
        i0, i1 = i * 2, i * 2 + 1
        if best_scores[i0] >= best_scores[i1]:
            score, row_idx = float(best_scores[i0]), int(best_row_idx[i0])
        else:
            score, row_idx = float(best_scores[i1]), int(best_row_idx[i1])

        pair_key: frozenset = frozenset([a.lower(), b.lower()])
        if score >= THRESHOLD and pair_key not in seen:
            seen.add(pair_key)
            row = df.iloc[row_idx]
            desc: str = row["Interaction Description"]
            alerts.append({
                "id": f"int_{i}",
                "severity": _severity(desc),
                "category": "interaction",
                "title": f"Drug Interaction: {a} + {b}",
                "description": desc,
                "reference": f"{row['Drug 1']} + {row['Drug 2']} (match: {round(score * 100)}%)",
            })

    # Sort by severity so high comes first
    order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda x: order[x["severity"]])
    return alerts
