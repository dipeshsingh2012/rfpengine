from __future__ import annotations

import os

from opensearchpy import OpenSearch


INDEX_NAME = "rfp_knowledge_base"

INDEX_BODY = {
    "settings": {
        "index": {
            "knn": True,
            "number_of_shards": int(os.getenv("OPENSEARCH_SHARDS", "1")),
            "number_of_replicas": int(os.getenv("OPENSEARCH_REPLICAS", "0")),
        }
    },
    "mappings": {
        "dynamic": "strict",
        "properties": {
            "tenant_id": {"type": "keyword"},
            "question": {"type": "text"},
            "answer": {"type": "text"},
            "question_vector": {
                "type": "knn_vector",
                "dimension": 1536,
                "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib"},
            },
        },
    },
}


def main() -> None:
    client = OpenSearch(
        hosts=[os.getenv("OPENSEARCH_URL", "http://localhost:9200")],
        http_auth=(os.getenv("OPENSEARCH_USERNAME", "admin"), os.getenv("OPENSEARCH_PASSWORD", "admin")),
        use_ssl=os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true",
        verify_certs=os.getenv("OPENSEARCH_VERIFY_CERTS", "false").lower() == "true",
    )
    if client.indices.exists(index=INDEX_NAME):
        print(f"Index already exists: {INDEX_NAME}")
        return
    client.indices.create(index=INDEX_NAME, body=INDEX_BODY)
    print(f"Created index: {INDEX_NAME}")


if __name__ == "__main__":
    main()
