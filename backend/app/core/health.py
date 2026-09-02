from typing import Any, Dict

def get_system_status() -> Dict[str, Any]:
    """
    Returns the current health status of the application.
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected",
        "cache": "connected"
    }

def get_config_summary() -> Dict[str, Any]:
    """
    Returns a summary of non-sensitive configuration.
    """
    return {
        "environment": "production",
        "region": "us-central1",
        "api_version": "v1"
    }
