# 0028 — CI: bump GitHub Actions to Node.js 24 runtime

- **Status**: DONE
- **Type**: AFK
- **Blocked-by**: 0003
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Why

The first CI run (run id `25276465306`, 2026-05-03) succeeded but emitted this annotation on every job:

> Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/cache@v4, actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v3. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026. Node.js 20 will be removed from the runner on September 16th, 2026.

Today is 2026-05-03; the forced cutover is one month away (2026-06-02). We should opt in early so that any incompatibility surfaces on a normal PR rather than during a release window.

## Goal

CI runs on Node.js 24 runtime for actions; no deprecation annotations remain.

## Scope (in)

- Add `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` to the `env:` block of `.github/workflows/ci.yml` OR bump action major versions to whichever release first ships native Node 24 support, whichever is published when this issue runs.
- Verify a fresh CI run produces no Node.js 20 deprecation annotations.

## Scope (out)

- Bumping the *runtime* Node version we install via `setup-node@v4` (currently `node-version: 20`). That's the version our app/test code runs under and is decided by `package.json#engines`. Separate concern from the action runtime.

## Definition of done

- New CI run on `main` shows zero Node.js 20 deprecation annotations.
- `node-version: 20` for the workflow's setup-node step remains unchanged.

## Reference

- https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
