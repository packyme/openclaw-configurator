# OpenClaw Configurator

[简体中文](README.zh-CN.md)

An interactive CLI tool for configuring [OpenClaw](https://github.com/openclaw/openclaw) on Linux.

## Features

- 🌍 Multi-language support (English / 简体中文)
- 🔧 Add AI providers
- 🔑 Configure API keys securely
- 🤖 Select and switch between models
- ⚡ Built-in support for PackyCode and custom providers

## Quick Start

Run directly without installation:

```bash
curl -fsSL https://github.com/packyme/openclaw-configurator/releases/latest/download/index.js | node
```

## Prerequisites

- [Node.js](https://nodejs.org/) v22 or higher
- [OpenClaw](https://github.com/openclaw/openclaw) installed and available in PATH

## Usage

After running the script, you'll be guided through an interactive menu:

1. **Select Language** - Choose English or 简体中文
2. **Add Provider** - Configure a new AI provider with base URL and API key
3. **Select Model** - Switch between configured models
4. **Exit** - Exit the program

### Supported Providers

- **PackyCode** - Pre-configured with `https://www.packyapi.com`
- **Other** - Custom providers with OpenAI/Anthropic compatible API

## Development

```bash
# Install dependencies
make install

# Run in development mode
make dev

# Type check and build
make typecheck build

# Build for production
make build-prod
```

## License

MIT
