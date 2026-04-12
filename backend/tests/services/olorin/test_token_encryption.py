import pytest
from app.services.olorin.token_encryption import encrypt_token, decrypt_token


def test_roundtrip_encrypt_decrypt():
    key = "a" * 44  # valid Fernet key (base64-encoded 32 bytes)
    plaintext = "ya29.a0AfH6SMA_test_access_token_value"
    ciphertext = encrypt_token(plaintext, key)
    assert ciphertext != plaintext
    assert decrypt_token(ciphertext, key) == plaintext


def test_decrypt_wrong_key_raises():
    key_a = "a" * 44
    key_b = "b" * 44
    ciphertext = encrypt_token("secret", key_a)
    with pytest.raises(ValueError, match="decrypt"):
        decrypt_token(ciphertext, key_b)


def test_encrypt_empty_string():
    key = "a" * 44
    ciphertext = encrypt_token("", key)
    assert decrypt_token(ciphertext, key) == ""
