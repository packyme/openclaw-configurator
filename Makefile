.PHONY: install dev build typecheck clean

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

typecheck:
	pnpm typecheck

clean:
	rm -rf dist node_modules
