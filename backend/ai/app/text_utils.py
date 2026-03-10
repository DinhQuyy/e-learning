import re
from bs4 import BeautifulSoup


WHITESPACE_RE = re.compile(r'\s+')


def normalize_text(raw: str) -> str:
    if not raw:
        return ''
    soup = BeautifulSoup(raw, 'html.parser')
    text = soup.get_text(separator='\n')
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    compact = '\n'.join(lines)
    return WHITESPACE_RE.sub(' ', compact).strip()


def chunk_text(text: str, chunk_size_words: int = 420, overlap_words: int = 60) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    step = max(chunk_size_words - overlap_words, 1)

    while start < len(words):
        end = min(start + chunk_size_words, len(words))
        chunk = ' '.join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break
        start += step

    return chunks


def count_tokens_approx(text: str) -> int:
    # Approximation for quick metadata only.
    return max(1, int(len(text.split()) * 1.3))