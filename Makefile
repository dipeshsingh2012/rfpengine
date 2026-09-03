.PHONY: test

# Run tests using pytest. 
# We set PYTHONPATH=backend so that 'from app...' imports work correctly.
test:
	PYTHONPATH=backend pytest backend/tests
