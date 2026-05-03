#!/usr/bin/env bash
# Ralph loop. Runs the implementer in a loop until no AFK tasks remain.
# After each implementer run, kicks off the reviewer in a fresh context.
#
# Run inside a sandbox (Docker, devcontainer) for unsupervised use.
# Reads MAX_ITERATIONS env var (default: 50) as a safety brake.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MAX_ITERATIONS="${MAX_ITERATIONS:-50}"
ITERATION=0

log() { printf '[ralph %s] %s\n' "$(date +%H:%M:%S)" "$*"; }

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))
  log "iteration $ITERATION / $MAX_ITERATIONS"

  # --- IMPLEMENTER ---
  IMPL_OUT="$(scripts/ralph-once.sh 2>&1 || true)"
  echo "$IMPL_OUT"

  if grep -q "NO_MORE_AFK_TASKS" <<<"$IMPL_OUT"; then
    log "implementer reports backlog empty — exiting"
    break
  fi

  ISSUE_ID="$(grep -oE 'ISSUE_COMPLETE: [0-9]+' <<<"$IMPL_OUT" | tail -1 | awk '{print $2}')"
  if [[ -z "${ISSUE_ID:-}" ]]; then
    log "implementer did not report ISSUE_COMPLETE — stopping for safety"
    break
  fi

  COMMIT_SHA="$(git rev-parse HEAD)"
  log "issue $ISSUE_ID committed at $COMMIT_SHA — kicking off reviewer"

  # --- REVIEWER (fresh context, Opus) ---
  REVIEW_PROMPT=$(cat <<EOF
You are running the /ralph-reviewer skill. Read .claude/skills/ralph-reviewer.md for full rules.

You have a fresh context. Do not assume anything from prior sessions.

Issue under review: $ISSUE_ID
Commit SHA: $COMMIT_SHA

Run \`git show $COMMIT_SHA\` to see the diff, then re-run feedback loops yourself, then decide.
End with REVIEW_APPROVED or REVIEW_REJECTED.
EOF
)

  REVIEW_OUT="$(claude --model opus --permission-mode acceptEdits "$REVIEW_PROMPT" 2>&1 || true)"
  echo "$REVIEW_OUT"

  if grep -q "REVIEW_APPROVED" <<<"$REVIEW_OUT"; then
    log "issue $ISSUE_ID approved — continuing"
  elif grep -q "REVIEW_REJECTED" <<<"$REVIEW_OUT"; then
    log "issue $ISSUE_ID rejected — defects filed; continuing"
  else
    log "reviewer output ambiguous — stopping for safety"
    break
  fi
done

log "ralph loop done after $ITERATION iteration(s)"
