#!/bin/zsh
# Unattended morning run of daily job scraping and application auto-drafting.
# Invoked by launchd (see ~/Library/LaunchAgents/com.aiapply.dailyscrape.plist) or cron.
#
# In Antigravity / Gemini, this can be triggered by:
# 1. Using the `daily-run` skill in interactive or scheduled agent sessions.
# 2. Using the Antigravity CLI: agy run "Execute daily-run skill"
# 3. Running this shell script via launchd / cron scheduler.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGY_BIN="${AGY_BIN:-$(which agy 2>/dev/null || echo "$HOME/.local/bin/agy")}"
CLAUDE_BIN="${CLAUDE_BIN:-$(which claude 2>/dev/null || echo "$HOME/.local/bin/claude")}"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/daily_$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR" || exit 1

{
  echo "=== Daily job run started $(date) ==="
  if command -v "$AGY_BIN" >/dev/null 2>&1; then
    echo "Running with Antigravity CLI ($AGY_BIN)..."
    "$AGY_BIN" run "Execute daily-run skill"
  elif command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
    echo "Running with Claude CLI ($CLAUDE_BIN)..."
    "$CLAUDE_BIN" -p "/daily" --model claude-sonnet-5
  else
    echo "Notice: Neither 'agy' nor 'claude' CLI binary found in PATH."
    echo "Please ensure the Antigravity / Gemini CLI or Claude is installed, or invoke the 'daily-run' skill within Antigravity IDE."
  fi
  echo "=== Daily job run finished $(date) with exit code $? ==="
} >> "$LOG_FILE" 2>&1
