# Fallback for environments where 'task' is not installed
.PHONY: test

test:
	cd backend && PYTHONPATH=. pytest tests/test_csv_service.py
