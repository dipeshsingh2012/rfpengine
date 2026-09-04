.PHONY: test

# Fixes the 'task: not found' error by providing a standard Makefile entry point
# Sets PYTHONPATH to backend so that 'from app...' imports work correctly in tests
test:
	PYTHONPATH=backend pytest backend/tests/
