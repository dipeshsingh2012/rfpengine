from app.core.health import get_system_status, get_config_summary

def test_get_system_status():
    status = get_system_status()
    assert status["status"] == "healthy"
    assert "database" in status

def test_get_config_summary():
    config = get_config_summary()
    assert "environment" in config
    assert config["api_version"] == "v1"
