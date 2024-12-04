# Contributing to nestjs-context-logger

Thank you for considering contributing to nestjs-context-logger! Whether it's fixing a bug, adding a feature, or improving documentation - all contributions are welcome.

## Quick Start

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Create a branch for your changes
4. Make your changes
5. Run tests: `npm test`
6. Push your changes
7. Open a pull request

## Development Guide

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nestjs-context-logger.git

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

### Running Tests

```bash
# Run full test suite
npm test

# Run tests in watch mode
npm run test:watch
```

### Testing Your Changes

The best way to test your changes is to use the logger in a real NestJS application. Here's a quick way to do that:

1. Create a new NestJS app:
```bash
nest new test-app
```

2. Link your local nestjs-context-logger:
```bash
# In nestjs-context-logger directory
npm link

# In your test app directory
npm link nestjs-context-logger
```

3. Use it in your test app:
```typescript
import { ContextLoggerModule } from 'nestjs-context-logger';

@Module({
  imports: [ContextLoggerModule],
})
export class AppModule {}
```

### Project Structure

```
src/
├── interfaces/      # TypeScript interfaces
├── interceptors/    # NestJS interceptors
├── store/          # Context storage implementation
└── tests/          # Test files
```

## Guidelines

### When submitting a PR:
- Make sure tests pass
- Add tests if you're adding a feature
- Update README if needed
- Update types if you're changing interfaces

### Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/). Each commit message should be structured as follows:

- `feat: <description>`
  - New features that add functionality
  - Triggers **MINOR** version bump (1.1.0 → 1.2.0)
  - Example: `feat: add support for custom serializers`

- `fix: <description>`
  - Bug fixes and patches
  - Triggers **PATCH** version bump (1.1.1 → 1.1.2)
  - Example: `fix: prevent context leak in concurrent requests`

- `BREAKING CHANGE: <description>` or `feat!: <description>`
  - Changes that break backward compatibility
  - Triggers **MAJOR** version bump (1.0.0 → 2.0.0)
  - Example: `feat!: change logger API to async methods`

- `docs: <description>`
  - Documentation changes only
  - **No version bump**
  - Example: `docs: improve API reference section`

- `test: <description>`
  - Adding or modifying tests
  - **No version bump**
  - Example: `test: add e2e tests for Express adapter`

- `refactor: <description>`
  - Code changes that neither fix bugs nor add features
  - **No version bump**
  - Example: `refactor: simplify context storage logic`

- `chore: <description>`
  - Maintenance tasks, dependency updates, etc
  - **No version bump**
  - Example: `chore: update nestjs to v10`


## Need Help?

- 🐛 [Open an issue](https://github.com/AdirD/nestjs-context-logger/issues)
- 💬 [Start a discussion](https://github.com/AdirD/nestjs-context-logger/discussions)
- 🤝 Ask questions in PRs

Don't worry too much about getting everything perfect. We're happy to help guide you through the process and fix any issues along the way.