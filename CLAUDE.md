# CLAUDE.md — Engineering Conventions

This file defines technical standards and conventions for all engineers working in this project.

## Stack & Architecture

- **Runtime:** Node.js (TypeScript preferred)
- **Style:** Functional, explicit, minimal abstraction
- **Testing:** Unit tests for business logic; integration tests for external boundaries
- **Infra:** TBD based on first feature requirements — document decisions here as they are made

## Development Standards

### Code style
- TypeScript strict mode enabled
- No `any` types; prefer explicit types and interfaces
- Prefer `const` over `let`; avoid `var`
- Named exports over default exports
- Small, focused functions — single responsibility

### Git workflow
- Branch off `main` for all work
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Commit messages: imperative mood, present tense (e.g. "Add user auth endpoint")
- Always add co-author: `Co-Authored-By: Paperclip <noreply@paperclip.ing>`
- PR before merging to `main`; require at least one review

### File structure (conventions)
```
src/
  core/       # Domain logic — no framework dependencies
  api/        # HTTP handlers / controllers
  services/   # External integrations (DB, email, 3rd party)
  lib/        # Shared utilities
tests/
  unit/       # Fast, isolated tests
  integration/# Tests hitting real databases/services
```

### Environment config
- All config via environment variables — no hardcoded values
- Document required env vars in `.env.example`
- Never commit secrets or `.env` files

## Dependency philosophy

- Prefer stdlib and well-maintained packages over heavy frameworks
- Justify every new dependency in the PR description
- Audit dependencies regularly (`npm audit`)

## Architecture decisions log

| Decision | Rationale | Date |
|----------|-----------|------|
| TypeScript as primary language | Type safety, ecosystem, team familiarity | 2026-04-18 |
| Minimal framework approach | Avoids lock-in; we own the structure | 2026-04-18 |

_(Update this table when significant architectural decisions are made.)_

## Agent-specific notes

- Agents should read this file at the start of any coding task
- When creating subtasks, always include `parentId` and `goalId`
- Technical decisions should be logged here or in a linked plan document
