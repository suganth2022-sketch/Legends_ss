"""AES-256-GCM field encryption for Aadhaar / PAN / bank account numbers, plus
the masking helpers used for default display.

Stored format is "iv:authTag:ciphertext" (all hex) in a single text column —
identical to the previous NestJS implementation, so existing encrypted rows
remain readable with the same ENCRYPTION_KEY.
"""

import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_TAG_LEN = 16


def _aesgcm() -> AESGCM:
    return AESGCM(bytes.fromhex(settings.ENCRYPTION_KEY))


def encrypt(plaintext: str) -> str:
    iv = os.urandom(12)
    sealed = _aesgcm().encrypt(iv, plaintext.encode("utf-8"), None)  # ciphertext || tag
    ciphertext, tag = sealed[:-_TAG_LEN], sealed[-_TAG_LEN:]
    return f"{iv.hex()}:{tag.hex()}:{ciphertext.hex()}"


def decrypt(stored: str) -> str:
    try:
        iv_hex, tag_hex, ct_hex = stored.split(":")
        sealed = bytes.fromhex(ct_hex) + bytes.fromhex(tag_hex)
        return _aesgcm().decrypt(bytes.fromhex(iv_hex), sealed, None).decode("utf-8")
    except Exception as exc:  # malformed value or wrong key / tampering
        raise ValueError("Could not decrypt stored value") from exc


def mask_aadhaar(plain: str) -> str:
    digits = "".join(ch for ch in plain if ch.isdigit())
    return f"XXXX XXXX {digits[-4:]}"


def mask_pan(plain: str) -> str:
    # PAN format: AAAAA9999A
    return f"XXXXX{plain[5:9] or '9999'}{plain[-1:]}"


def mask_account_number(plain: str) -> str:
    return "*" * max(len(plain) - 4, 8) + plain[-4:]
