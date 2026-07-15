"""
Genre normalisation and filtering.

Provides a curated allowlist of common English genres and a normalization
mapping so that variant spellings and foreign-language labels are either
canonicalized or dropped before being stored.
"""

from __future__ import annotations
import re
import unicodedata
from typing import Optional

# ---------------------------------------------------------------------------
# Canonical genres
# Maps normalized (lowercase, stripped) name -> display name.
# Only genres in this dict will be accepted.
# ---------------------------------------------------------------------------
CANONICAL_GENRES: dict[str, str] = {
    # --- Fiction ---
    "fiction": "Fiction",
    "literary fiction": "Literary Fiction",
    "science fiction": "Science Fiction",
    "fantasy": "Fantasy",
    "epic fantasy": "Epic Fantasy",
    "urban fantasy": "Urban Fantasy",
    "dark fantasy": "Dark Fantasy",
    "mystery": "Mystery",
    "cozy mystery": "Mystery",
    "thriller": "Thriller",
    "psychological thriller": "Thriller",
    "legal thriller": "Thriller",
    "medical thriller": "Thriller",
    "political thriller": "Thriller",
    "horror": "Horror",
    "gothic fiction": "Horror",
    "gothic horror": "Horror",
    "romance": "Romance",
    "contemporary romance": "Romance",
    "historical romance": "Romance",
    "paranormal romance": "Paranormal",
    "historical fiction": "Historical Fiction",
    "adventure": "Adventure",
    "action": "Adventure",
    "action & adventure": "Adventure",
    "young adult": "Young Adult",
    "ya fiction": "Young Adult",
    "teen fiction": "Young Adult",
    "middle grade": "Children's Fiction",
    "children's fiction": "Children's Fiction",
    "children's literature": "Children's Fiction",
    "juvenile fiction": "Children's Fiction",
    "picture books": "Children's Fiction",
    "picture book": "Children's Fiction",
    "graphic novels": "Graphic Novels & Comics",
    "graphic novel": "Graphic Novels & Comics",
    "comics": "Graphic Novels & Comics",
    "manga": "Graphic Novels & Comics",
    "short stories": "Short Stories",
    "short story": "Short Stories",
    "anthology": "Short Stories",
    "humor": "Humor",
    "humour": "Humor",
    "comedy": "Humor",
    "satire": "Satire",
    "dystopian": "Dystopian",
    "dystopia": "Dystopian",
    "paranormal": "Paranormal",
    "supernatural": "Paranormal",
    "contemporary fiction": "Contemporary Fiction",
    "magical realism": "Magical Realism",
    "crime": "Crime",
    "crime fiction": "Crime",
    "detective fiction": "Crime",
    "suspense": "Suspense",
    "espionage": "Espionage",
    "spy fiction": "Espionage",
    "spy thriller": "Espionage",
    "western": "Western",
    "war fiction": "War Fiction",
    "military fiction": "War Fiction",
    "mythology": "Mythology",
    "folklore": "Mythology",
    "fairy tales": "Mythology",
    "fairy tale": "Mythology",
    "poetry": "Poetry",
    "poems": "Poetry",
    "drama": "Drama",
    "plays": "Drama",
    "coming of age": "Coming of Age",
    "bildungsroman": "Coming of Age",
    "family saga": "Family",
    "family drama": "Family",
    "inspirational fiction": "Inspirational",
    "christian fiction": "Inspirational",
    "chick lit": "Contemporary Fiction",
    "women's fiction": "Contemporary Fiction",
    "new adult": "Young Adult",
    "apocalyptic": "Dystopian",
    "post-apocalyptic": "Dystopian",
    "space opera": "Science Fiction",
    "cyberpunk": "Science Fiction",
    "steampunk": "Science Fiction",
    "time travel": "Science Fiction",
    "alternate history": "Historical Fiction",
    "alternate history fiction": "Historical Fiction",
    # --- Nonfiction ---
    "nonfiction": "Nonfiction",
    "non-fiction": "Nonfiction",
    "biography": "Biography",
    "autobiography": "Biography",
    "biography & autobiography": "Biography",
    "memoir": "Memoir",
    "memoirs": "Memoir",
    "personal memoir": "Memoir",
    "history": "History",
    "ancient history": "History",
    "military history": "History",
    "american history": "History",
    "world history": "History",
    "european history": "History",
    "political history": "History",
    "social history": "History",
    "art history": "History",
    "science": "Science",
    "natural science": "Science",
    "life science": "Science",
    "physics": "Science",
    "chemistry": "Science",
    "biology": "Science",
    "astronomy": "Science",
    "earth science": "Science",
    "technology": "Technology",
    "computers": "Technology",
    "computer science": "Technology",
    "programming": "Technology",
    "artificial intelligence": "Technology",
    "software": "Technology",
    "internet": "Technology",
    "business": "Business",
    "entrepreneurship": "Business",
    "management": "Business",
    "leadership": "Business",
    "marketing": "Business",
    "sales": "Business",
    "economics": "Economics",
    "finance": "Finance",
    "personal finance": "Finance",
    "investing": "Finance",
    "money": "Finance",
    "accounting": "Finance",
    "self-help": "Self-Help",
    "self help": "Self-Help",
    "personal development": "Self-Help",
    "personal growth": "Self-Help",
    "motivational": "Self-Help",
    "success": "Self-Help",
    "psychology": "Psychology",
    "cognitive science": "Psychology",
    "behavioral science": "Psychology",
    "philosophy": "Philosophy",
    "ethics": "Philosophy",
    "logic": "Philosophy",
    "religion": "Religion",
    "spirituality": "Religion",
    "theology": "Religion",
    "christianity": "Christianity",
    "christian": "Christianity",
    "christian living": "Christianity",
    "christian nonfiction": "Christianity",
    "biblical studies": "Christianity",
    "bible study": "Christianity",
    "devotional": "Christianity",
    "devotionals": "Christianity",
    "islam": "Religion",
    "judaism": "Religion",
    "buddhism": "Religion",
    "politics": "Politics",
    "political science": "Politics",
    "government": "Politics",
    "current events": "Current Events",
    "social science": "Social Science",
    "sociology": "Social Science",
    "anthropology": "Social Science",
    "cultural studies": "Social Science",
    "health": "Health",
    "health & fitness": "Health",
    "fitness": "Health",
    "nutrition": "Health",
    "wellness": "Health",
    "medicine": "Health",
    "mental health": "Health",
    "cooking": "Cooking",
    "food": "Cooking",
    "baking": "Cooking",
    "cookbooks": "Cooking",
    "cookbook": "Cooking",
    "recipes": "Cooking",
    "travel": "Travel",
    "travel writing": "Travel",
    "adventure travel": "Travel",
    "art": "Art",
    "fine art": "Art",
    "photography": "Art",
    "design": "Art",
    "architecture": "Art",
    "music": "Music",
    "musicology": "Music",
    "sports": "Sports",
    "games": "Sports",
    "true crime": "True Crime",
    "crime & punishment": "True Crime",
    "nature": "Nature",
    "environment": "Nature",
    "ecology": "Nature",
    "animals": "Nature",
    "wildlife": "Nature",
    "mathematics": "Mathematics",
    "math": "Mathematics",
    "statistics": "Mathematics",
    "education": "Education",
    "teaching": "Education",
    "parenting": "Parenting",
    "child rearing": "Parenting",
    "family": "Parenting",
    "relationships": "Relationships",
    "dating": "Relationships",
    "marriage": "Relationships",
    "reference": "Reference",
    "dictionaries": "Reference",
    "encyclopedias": "Reference",
    "essays": "Essays",
    "journalism": "Essays",
    "narrative nonfiction": "Essays",
    "children's nonfiction": "Children's Nonfiction",
    "juvenile nonfiction": "Children's Nonfiction",
    "productivity": "Self-Help",
    "mindfulness": "Self-Help",
    "grief": "Self-Help",
    "communication": "Self-Help",
    "language": "Reference",
    "linguistics": "Reference",
    "humor & entertainment": "Humor",
    "science & nature": "Science",
    "science & technology": "Technology",
}

# ---------------------------------------------------------------------------
# Extra aliases not already covered by CANONICAL_GENRES
# Maps normalized alias -> canonical key in CANONICAL_GENRES
# ---------------------------------------------------------------------------
_EXTRA_ALIASES: dict[str, str] = {
    "sci-fi": "science fiction",
    "scifi": "science fiction",
    "sf": "science fiction",
    "science fiction & fantasy": "science fiction",
    "science fiction and fantasy": "science fiction",
    "speculative fiction": "science fiction",
    "fantasy & science fiction": "fantasy",
    "crime & mystery": "crime",
    "mysteries": "mystery",
    "thrillers": "thriller",
    "mystery & thriller": "thriller",
    "mystery & crime": "crime",
    "mystery, thriller & suspense": "thriller",
    "comics & graphic novels": "graphic novels",
    "biographies": "biography",
    "biographies & memoirs": "biography",
    "historical": "historical fiction",
    "history & historical fiction": "historical fiction",
    "self improvement": "self-help",
    "business & economics": "business",
    "business & money": "business",
    "business & investing": "business",
    "computers & technology": "technology",
    "computer & internet": "technology",
    "health, mind & body": "health",
    "health & wellness": "health",
    "religion & spirituality": "religion",
    "christian books & bibles": "christianity",
    "christian books": "christianity",
    "politics & social sciences": "politics",
    "politics & government": "politics",
    "social sciences": "social science",
    "arts & photography": "art",
    "crafts, hobbies & home": "art",
    "cooking, food & wine": "cooking",
    "food & drink": "cooking",
    "travel & geography": "travel",
    "parenting & families": "parenting",
    "family & relationships": "relationships",
    "humor & comedy": "humor",
    "literature": "literary fiction",
    "classics": "literary fiction",
    "classic literature": "literary fiction",
    "adventure stories": "adventure",
    "adventure & explorers": "adventure",
    "superheroes": "graphic novels",
    "spy": "espionage",
    "espionage & spy": "espionage",
    "environment & ecology": "nature",
    "earth sciences": "science",
    "general fiction": "fiction",
    "general nonfiction": "nonfiction",
    "general": "fiction",
    "adult fiction": "fiction",
    "adult nonfiction": "nonfiction",
    "language arts & disciplines": "reference",
    "literary collections": "short stories",
    "poetry collections": "poetry",
    "drama collections": "drama",
    "performing arts": "drama",
    "performing arts & drama": "drama",
    "theater": "drama",
    "theatre": "drama",
}

# Merge extras into canonical lookup
_ALIAS_LOOKUP: dict[str, str] = {}
for _alias, _canon_key in _EXTRA_ALIASES.items():
    _canonical_display = CANONICAL_GENRES.get(_canon_key)
    if _canonical_display:
        _ALIAS_LOOKUP[_alias] = _canonical_display


def _norm(text: str) -> str:
    """Lowercase, strip, and collapse whitespace."""
    return re.sub(r"\s+", " ", text.strip().lower())


# Words that look English but are actually common foreign-language genre labels
# (German, French, Italian, Dutch, etc.) that should be dropped.
_FOREIGN_WORD_BLOCKLIST: frozenset[str] = frozenset({
    "roman", "romans", "romane",           # French/German for "novel"
    "belletristik",                         # German for "fiction/belles-lettres"
    "unterhaltung",                         # German for "entertainment"
    "krimi",                               # German for "crime novel"
    "literatur",                           # German for "literature"
    "literatur & fiktion",
    "freizeit",                            # German for "leisure"
    "kinder",                              # German for "children"
    "jugendbuch",                          # German for "young-adult book"
    "sachbuch",                            # German for "nonfiction"
    "ratgeber",                            # German for "self-help/guide"
    "biografie",                           # German/Dutch for "biography"
    "geschichte",                          # German for "history/story"
    "thriller & krimis",
    "roman policier",                      # French for "detective novel"
    "policier",
    "polar",                               # French slang for "crime novel"
    "policier et thriller",
    "drame",                               # French for "drama"
    "fantastique",                         # French for "fantasy/sci-fi"
    "science-fiction",                     # Often acceptable; keep English form only
    "litterature",
    "littérature",
    "poésie",
    "poesie",
    "biographie",
    "histoire",
    "romans historiques",
    "romanzo",                             # Italian
    "narrativa",                           # Italian/Spanish for "fiction"
    "fictie",                              # Dutch
    "thriller en misdaad",                 # Dutch
    "detectiveverhalen",
    "avontuur",                            # Dutch for "adventure"
    "historische fictie",                  # Dutch
    "romantiek",                           # Dutch
    "manga y cómics",                      # Spanish
    "ficción",
    "novela",
    "novelas",
    "humor e sátira",                      # Portuguese
    "ficção",
    "ação e aventura",
})


def _is_likely_non_english(text: str) -> bool:
    """Return True if the text looks like a non-English genre label.

    Two checks:
    1. More than 15 % of characters are non-ASCII
    2. The normalized text is in the foreign-word blocklist
    """
    if not text:
        return False
    non_ascii = sum(1 for c in text if ord(c) > 127)
    if non_ascii / max(len(text), 1) > 0.15:
        return True
    return _norm(text) in _FOREIGN_WORD_BLOCKLIST


def normalize_genre(name: str) -> Optional[str]:
    """Map a raw genre string to a canonical display name, or return None.

    Returns None for:
    - non-English or blocklisted labels
    - genres not in the allowlist or alias table
    - empty strings
    """
    if not name or not name.strip():
        return None

    stripped = name.strip()

    # Drop non-English / foreign-language labels early
    if _is_likely_non_english(stripped):
        return None

    key = _norm(stripped)

    # Remove trailing punctuation noise (e.g., "Fiction.")
    key = key.rstrip(".,;:/")

    # Direct canonical match
    if key in CANONICAL_GENRES:
        return CANONICAL_GENRES[key]

    # Alias match
    if key in _ALIAS_LOOKUP:
        return _ALIAS_LOOKUP[key]

    # Conservative partial match: only when the raw key contains a canonical key
    # as a complete word segment, and the canonical key is at least 6 chars.
    for canon_key, display in CANONICAL_GENRES.items():
        if len(canon_key) >= 6 and canon_key in key:
            # Require the canonical key to fill at least 55% of the raw key
            if len(canon_key) / len(key) >= 0.55:
                return display

    return None


def normalize_hierarchical_genre(parts: list[str]) -> Optional[str]:
    """Pick the best canonical genre from a hierarchical path.

    Tries segments from most-specific to least-specific.
    Example: ["Fiction", "Science Fiction", "Space Opera"]
        -> tries "Space Opera" (no match), then "Science Fiction" (match) -> "Science Fiction"
    """
    for part in reversed(parts):
        result = normalize_genre(part)
        if result:
            return result
    return None


def filter_genres(raw: list[str], max_count: int = 5) -> list[str]:
    """Normalize and filter a list of raw genre strings.

    - Handles both flat names and hierarchical paths (separated by / or >)
    - Keeps only genres in the canonical allowlist
    - Removes duplicates (case-insensitive)
    - Limits to max_count
    """
    seen: set[str] = set()
    result: list[str] = []

    for raw_name in raw:
        if not raw_name or not isinstance(raw_name, str):
            continue

        raw_name = raw_name.strip()

        # Hierarchical path
        if "/" in raw_name or ">" in raw_name:
            parts = [p.strip() for p in re.split(r"[>/]", raw_name) if p.strip()]
            canonical = normalize_hierarchical_genre(parts)
        else:
            canonical = normalize_genre(raw_name)

        if canonical and canonical.lower() not in seen:
            seen.add(canonical.lower())
            result.append(canonical)

        if len(result) >= max_count:
            break

    return result
