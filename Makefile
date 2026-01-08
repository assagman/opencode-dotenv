.PHONY: build clean clean-all rebuild test typecheck bench
.PHONY: publish publish-dry help
.PHONY: release-tag release-push

help:
	@echo "Targets:"
	@echo "  make build        - Build project (bun build)"
	@echo "  make clean        - Clean build artifacts (dist/)"
	@echo "  make clean-all    - Clean everything (dist/, node_modules/, *.tgz)"
	@echo "  make rebuild      - Clean and rebuild"
	@echo "  make test         - Run tests"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo "  make bench        - Run benchmarks"
	@echo "  make publish      - Publish to npm"
	@echo "  make publish-dry  - Dry-run publish (preview)"
	@echo "  make release-tag  - Create signed git tag (requires VERSION=X.Y.Z)"
	@echo "  make release-push - Push commits and tags to remote"

# Build
build:
	bun build src/index.ts --outdir dist --target bun

clean:
	rm -rf dist

clean-all: clean
	rm -rf node_modules/
	rm -f *.tgz

rebuild: clean build

# Test
test:
	bun test

typecheck:
	tsc --noEmit

# Benchmarks
bench:
	bun run bench/init.bench.ts

# Publishing
publish:
	npm publish

publish-dry:
	npm publish --dry-run

# Release helpers (see RELEASE.md for full process)
release-tag:
	@test -n "$(VERSION)" || (echo "VERSION required: make release-tag VERSION=X.Y.Z" && exit 1)
	git tag -s -m "Release v$(VERSION)" v$(VERSION)

release-push:
	git push --follow-tags
