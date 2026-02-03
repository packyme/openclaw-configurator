.PHONY: install dev build build-prod typecheck clean

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

build-prod:
	node --experimental-strip-types scripts/build.ts --prod

typecheck:
	pnpm typecheck

clean:
	rm -rf dist node_modules
