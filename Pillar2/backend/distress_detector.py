import re

DISTRESS_KEYWORDS = [
    # pain
    "pain", "hurts", "hurting", "hurt", "ache", "aching", "sore", "burning", "stabbing",
    # physical distress
    "can't breathe", "cannot breathe", "hard to breathe", "chest", "bleeding", "blood",
    "dizzy", "dizziness", "nauseous", "nausea", "vomit", "faint", "fainting", "fell", "fallen",
    "can't move", "cannot move", "can't feel", "numb",
    # fear / confusion
    "scared", "afraid", "fear", "frightened", "terrified", "panicking", "panic",
    "confused", "don't know where", "don't know what", "where am i", "what's happening",
    "lost", "something is wrong", "something's wrong",
    # calls for help
    "help me", "please help", "i need help", "call the nurse", "get the nurse",
    "emergency", "911", "ambulance",
]

_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(k) for k in DISTRESS_KEYWORDS) + r')\b',
    re.IGNORECASE,
)

def check_distress(text: str) -> tuple[bool, str]:
    """
    Returns (is_distress, matched_keyword).
    Runs before every AI response — does not rely on the AI to self-detect.
    """
    match = _PATTERN.search(text)
    if match:
        return True, match.group(0)
    return False, ""
