.PHONY: publish build clean install test lint fmt help publish-dry

help:
	@echo "Targets:"
	@echo "  make build        - Build project (tsc)"
	@echo "  make publish      - Publish to npm"
	@echo "  make publish-dry  - Dry-run publish (preview)"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make install      - Install dependencies"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Lint code"
	@echo "  make fmt          - Format code"

install:
	bun install

build:
	npm run build

publish:
	npm publish

publish-dry:
	npm publish --dry-run

clean:
	rm -rf dist/
	rm -rf node_modules/
	rm -f *.tgz

test:
	@echo "Running tests..."

lint:
	@echo "Linting code..."

fmt:
	@echo "Formatting code..."
