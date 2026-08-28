#!/usr/bin/env python3
"""
RFPEngine Cloud Connection & Hybrid Retrieval Diagnostics Script.

Verifies live connections and end-to-end operations across:
1. PostgreSQL (Neon Database)
2. Elasticsearch (Elastic Cloud)
3. Pinecone (Serverless Vector Index)
4. OpenAI (Embedding & GPT-4o)
5. Hybrid RRF Retrieval Pipeline
"""

import asyncio
import os
import sys
import time

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.services.elasticsearch_service import ElasticsearchService
from app.services.pinecone_service import PineconeService
from app.services.hybrid_search_service import HybridSearchService
from app.models.schemas import SearchRequest
from app.services.gcp_secret_service import GCPSecretService
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.db import normalize_database_url
from sqlalchemy import text


async def main():
    settings = get_settings()
    print("=" * 70)
    print(f"🚀 RFPEngine Cloud Connection Diagnostics (Env: {settings.env})")
    print("=" * 70)

    # 0. Load GCP Secret Manager secrets if enabled
    gcp_service = GCPSecretService(settings)
    if settings.gcp_secret_manager_enabled and gcp_service.is_configured():
        try:
            secrets = await gcp_service.get_all_app_secrets()
            if secrets:
                settings.apply_gcp_secrets(secrets)
                print(f"  🔒 Loaded {len(secrets)} secrets from GCP Secret Manager (project: {settings.gcp_project_id})")
        except Exception as exc:
            print(f"  ⚠️ Could not fetch secrets from GCP Secret Manager: {exc}")

    # --------------------------------------------------------------------------
    # 1. PostgreSQL (Neon) Check
    # --------------------------------------------------------------------------
    print("\n[1/5] Checking PostgreSQL (Neon Database)...")
    try:
        norm_url = normalize_database_url(settings.effective_database_url)
        engine = create_async_engine(norm_url, pool_pre_ping=True)
        start = time.perf_counter()
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT version();"))
            version = res.scalar()
        latency = (time.perf_counter() - start) * 1000
        print(f"  ✅ PostgreSQL Connected ({latency:.2f}ms)")
        print(f"     Version: {version[:45]}...")
        await engine.dispose()
    except Exception as exc:
        print(f"  ❌ PostgreSQL Failed: {exc}")

    # --------------------------------------------------------------------------
    # 2. Elasticsearch / Elastic Cloud Check
    # --------------------------------------------------------------------------
    print("\n[2/5] Checking Elasticsearch / Elastic Cloud...")
    es_service = ElasticsearchService(settings)
    try:
        start = time.perf_counter()
        health = await es_service.health_check()
        latency = (time.perf_counter() - start) * 1000
        if health.get("status") == "ok":
            print(f"  ✅ Elastic Cloud Connected ({latency:.2f}ms)")
            print(f"     Cluster: {health.get('cluster_name')}, ES Version: {health.get('version')}")
            # Check / Ensure index
            idx_ok = await es_service.ensure_index_exists()
            print(f"     Target Index ('{settings.elasticsearch_index}'): {'Ready' if idx_ok else 'Failed'}")
        else:
            print(f"  ⚠️ Elastic Cloud Health Status: {health.get('status')} - {health.get('details')}")
    except Exception as exc:
        print(f"  ❌ Elastic Cloud Failed: {exc}")

    # --------------------------------------------------------------------------
    # 3. Pinecone Serverless Check
    # --------------------------------------------------------------------------
    print("\n[3/5] Checking Pinecone Serverless...")
    pc_service = PineconeService(settings)
    if not pc_service.is_configured():
        print("  ⚠️ Pinecone is unconfigured (PINECONE_API_KEY is not set)")
    else:
        try:
            start = time.perf_counter()
            pc_health = await pc_service.health_check()
            latency = (time.perf_counter() - start) * 1000
            print(f"  ✅ Pinecone API Connected ({latency:.2f}ms)")
            print(f"     Available Indexes: {pc_health.get('indexes')}")
            print(f"     Target Index ('{settings.pinecone_index}'): {pc_health.get('status')}")
        except Exception as exc:
            print(f"  ❌ Pinecone Failed: {exc}")

    # --------------------------------------------------------------------------
    # 4. LLM & Embeddings Check (Google Cloud Vertex AI & OpenAI)
    # --------------------------------------------------------------------------
    print("\n[4/5] Checking LLM & Vector Embeddings...")
    hybrid_service = HybridSearchService(settings, es_service, pc_service)
    start = time.perf_counter()
    try:
        emb = await hybrid_service.generate_embedding("Test embedding ping")
        latency = (time.perf_counter() - start) * 1000
        if emb:
            provider_name = "Google Cloud Vertex AI (text-embedding-004)" if hybrid_service.genai_client and settings.llm_provider != "openai" else "OpenAI / Fallback"
            print(f"  ✅ Embeddings Working ({latency:.2f}ms)")
            print(f"     Provider: {provider_name} (Dimensions: {len(emb)})")
        else:
            print("  ⚠️ Embedding generation returned None")
    except Exception as exc:
        print(f"  ❌ Embedding Failed: {exc}")

    if hybrid_service.genai_client and settings.llm_provider != "openai":
        try:
            start = time.perf_counter()
            test_ans = await hybrid_service._generate_answer("Ping test", [])
            latency = (time.perf_counter() - start) * 1000
            print(f"  ✅ Vertex AI Gemini Connected ({latency:.2f}ms)")
            print(f"     Model: {settings.gemini_model}")
        except Exception as exc:
            print(f"  ⚠️ Vertex AI Gemini test failed: {exc}")
    elif settings.openai_api_key:
        print(f"  ✅ OpenAI Configured (Model: {settings.openai_chat_model})")
    else:
        print("  ℹ Running in local demo mode")

    # --------------------------------------------------------------------------
    # 5. End-to-End Hybrid Search Query Check
    # --------------------------------------------------------------------------
    print("\n[5/5] Checking Hybrid Retrieval & Answering...")
    try:
        hybrid_service = HybridSearchService(settings, es_service, pc_service)
        test_req = SearchRequest(
            tenant_id="acme-corp",
            question="What is the encryption standard at rest?",
            top_k=3,
        )
        search_res = await hybrid_service.search(test_req)
        print(f"  ✅ Hybrid Search Executed")
        print(f"     Confidence Score: {round(search_res.confidence_score * 100)}%")
        print(f"     Sources Retrieved: {len(search_res.sources)}")
        if search_res.suggested_answer:
            print(f"     Suggested Answer Preview: {search_res.suggested_answer[:120]}...")
    except Exception as exc:
        print(f"  ❌ Hybrid Search Failed: {exc}")

    await es_service.close()
    print("\n" + "=" * 70)
    print("Diagnostics complete.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())

