# Working agreements — Cloud GTM Intelligence Platform

## Commits

- **Do NOT add a `Co-Authored-By: Claude` trailer** (or any AI co-author) to commits.
- **Do NOT add "Generated with Claude Code"** or similar attribution to commit
  messages or PR bodies.
- Use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` …).
- Write real, descriptive messages — never `update`, `fix stuff`, `wip`, `final`.

## Branches

- Branch names must be **meaningful**, not generic.
- **Prefer the exact branch name Linear generates for the issue** (its
  `gitBranchName`), e.g.
  `uliyca999333/yur-20-build-react-application-shell-with-mui`.
- One Linear issue → one branch → one PR where practical.
- Never commit feature work directly to `main`; branch first.

## Project basics

- Monorepo: pnpm workspaces + Turborepo. Node >= 22, pnpm 11 (via Corepack).
- Internal packages are scoped `@cloud-gtm/*` and consumed as source
  (`workspace:*`).
- Before finishing a change, all of these must pass:

  ```bash
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  ```

- Shared Zod contracts in `packages/contracts` are the source of truth; do not
  duplicate DTOs by hand.
- Deterministic scoring (`packages/scoring`, `rules-v1`) stays separate from
  generative AI. AI never computes the score.
- Enum values are stored untranslated (EN/FR handled in the frontend).

## Backlog

Work is tracked in Linear (project **Cloud GTM Intelligence Platform**,
milestones M1–M8, issues `YUR-18`…`YUR-37`).
