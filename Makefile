# Alternative to 'task' to run tests via 'make test'
test:
	cd backend && PYTHONPATH=. pytest tests
