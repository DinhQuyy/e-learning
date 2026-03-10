import re
import unicodedata

BLOCK_PATTERNS = [
    r"\bdap an\b",
    r"\bdap so\b",
    r"\bdap an cuoi cung\b",
    r"\bfinal answer\b",
    r"\bfull code\b",
    r"\bcode hoan chinh\b",
    r"\bloi giai\b",
    r"\bgiai ho\b",
    r"\blam ho\b",
    r"\bcomplete solution\b",
]


def _normalize_text(value: str) -> str:
    # Normalize Vietnamese accents so regex can match both accented and plain text.
    normalized = unicodedata.normalize("NFKD", value)
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return without_marks.replace("đ", "d").replace("Đ", "D").lower()


def should_block_assignment(question: str, student_attempt: str | None = None) -> tuple[bool, str]:
    text = _normalize_text(f"{question}\n{student_attempt or ''}")
    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            return (
                True,
                "Request contains direct-answer intent. Hint-only policy is enforced.",
            )
    return False, ""
