"""Unit tests for SHA-256 hash chain evidence system."""
import hashlib
import pytest
from app.core.security import sha256_hash, hash_chain


def test_sha256_hash():
    """Test SHA-256 hashing."""
    data = "test evidence content"
    result = sha256_hash(data)
    assert len(result) == 64
    assert result == hashlib.sha256(data.encode()).hexdigest()


def test_sha256_hash_consistency():
    """Test that same input produces same hash."""
    data = "consistent data"
    assert sha256_hash(data) == sha256_hash(data)


def test_sha256_hash_uniqueness():
    """Test that different inputs produce different hashes."""
    assert sha256_hash("data1") != sha256_hash("data2")


def test_hash_chain():
    """Test hash chain computation."""
    prev_hash = sha256_hash("previous")
    content_hash = sha256_hash("current content")
    chain_hash = hash_chain(prev_hash, content_hash)

    assert len(chain_hash) == 64
    assert chain_hash != prev_hash
    assert chain_hash != content_hash


def test_hash_chain_tamper_detection():
    """Test that tampering with content breaks the chain."""
    prev_hash = sha256_hash("previous")
    content_hash = sha256_hash("original content")
    original_chain = hash_chain(prev_hash, content_hash)

    # Tampered content
    tampered_hash = sha256_hash("tampered content")
    tampered_chain = hash_chain(prev_hash, tampered_hash)

    assert original_chain != tampered_chain


def test_hash_chain_order_matters():
    """Test that order of hashing matters."""
    hash1 = hash_chain("a", "b")
    hash2 = hash_chain("b", "a")
    assert hash1 != hash2


def test_hash_chain_empty_previous():
    """Test hash chain with no previous hash (genesis)."""
    content_hash = sha256_hash("genesis content")
    chain_hash = hash_chain("", content_hash)
    assert len(chain_hash) == 64
    assert chain_hash == hashlib.sha256(content_hash.encode()).hexdigest()
