import pytest
from app.services.search_service import SearchService

def test_search_query_match():
    service = SearchService()
    results = service.search("fox")
    assert len(results) == 1
    assert results[0]["id"] == "1"

def test_search_query_no_match():
    service = SearchService()
    results = service.search("nonexistent")
    assert len(results) == 0

def test_search_empty_query():
    service = SearchService()
    results = service.search("")
    assert results == []
