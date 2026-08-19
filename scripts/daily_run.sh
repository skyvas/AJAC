#!/bin/zsh
# Unattended morning run of /daily. Invoked by launchd (see
# ~/Library/LaunchAgents/com.aiapply.dailyscrape.plist) — no one is
# available to answer permission prompts, so .claude/settings.json pre-approves the
# unattended /daily allow-list (WebSearch/WebFetch, Write/Edit under
# applications/**, the exact docx-render Bash commands, plus the scheduler
# management entries documented in README.md). Anything not on that allow-list is
# denied automatically rather than hanging on a prompt nobody can answer —
# deliberately NOT running with --dangerously-skip-permissions.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAUDE_BIN="${CLAUDE_BIN:-$(which claude 2>/dev/null || echo "$HOME/.local/bin/claude")}"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/daily_$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR" || exit 1

{
  echo "=== /daily run started $(date) ==="
  "$CLAUDE_BIN" -p "/daily" \
    --model claude-sonnet-5
  echo "=== /daily run finished $(date) with exit code $? ==="
} >> "$LOG_FILE" 2>&1
