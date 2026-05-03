#!/usr/bin/env bash
# Ralph (single-shot). Runs the implementer once, then exits.
# Use this for human-supervised runs while you tune prompts.
# For unattended parallel runs, use ralph-loop.sh.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -d "issues" ]]; then
  echo "ERROR: no issues/ directory. Run /prd-to-issues first." >&2
  exit 1
fi

# Gather active issues (exclude closed/)
ISSUES=""
shopt -s nullglob
for f in issues/*.md; do
  [[ "$f" == "issues/README.md" ]] && continue
  ISSUES+=$'\n=== '"$f"$' ===\n'
  ISSUES+="$(cat "$f")"
  ISSUES+=$'\n'
done

if [[ -z "$ISSUES" ]]; then
  echo "No active issues. Nothing to do." >&2
  exit 0
fi

# Recent commits for context
RECENT_COMMITS="$(git log --oneline -n 5 2>/dev/null || echo 'no git history yet')"

# Compose the prompt
PROMPT=$(cat <<EOF
You are running the /ralph-implementer skill. Read .claude/skills/ralph-implementer.md for full rules.

The user is AFK. Do not ask questions. Make decisions and proceed.

=== ACTIVE ISSUES ===
$ISSUES

=== RECENT COMMITS ===
$RECENT_COMMITS

Pick the next AFK issue per the prioritization rules in the skill. If none are eligible, output exactly:
NO_MORE_AFK_TASKS

Otherwise: implement the issue end-to-end (TDD, feedback loops, commit), and end with:
ISSUE_COMPLETE: <NNNN>
EOF
)

# Permission mode: accept edits but require approval for shell commands the user hasn't allowed.
# Adjust based on your sandboxing setup.
exec claude --permission-mode acceptEdits "$PROMPT"
