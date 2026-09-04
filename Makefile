.PHONY: test install

install:
	pip install -r backend/requirements.txt

test:
	cd backend && pytest
