#!/bin/bash
set -euo pipefail

log_dir="${HOME}/.cache/daily-report"
log_file="${log_dir}/errors.log"
mkdir -p "$log_dir"

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  local cmd=${2:-unknown}
  {
    echo "[$(date -Iseconds)] ERROR exit=$exit_code line=$line_no cmd=$cmd"
    echo "pwd=$PWD"
    echo "branch=$(git branch --show-current 2>/dev/null || true)"
    echo "commit=$(git rev-parse --short HEAD 2>/dev/null || true)"
    echo "---"
  } >> "$log_file"
}

trap 'on_error ${LINENO} "${BASH_COMMAND}"' ERR

repo_root=$(git rev-parse --show-toplevel)
branch=$(git branch --show-current || true)
commit=$(git rev-parse --short HEAD || true)
author=$(git log -1 --format='%an' 2>/dev/null || git config user.name || echo "Unknown")
date=$(date +"%B %-d, %Y (%A)")

# Format remote origin URL to https url
remote_url=$(git config --get remote.origin.url || echo "")
temp=${remote_url#git@}
temp=${temp/:/\/}
repo_url="https://${temp%.git}"

# Dynamic summary from the last commit
commit_subject=$(git log -1 --format="%s" 2>/dev/null || echo "No commits yet")
commit_body=$(git log -1 --format="%b" 2>/dev/null || echo "")

cat > daily-report.md <<EOF
Daily Report
Date: $(date +"%Y-%m-%d")
Branch: $(git branch --show-current || echo detached-head)
Commit: $(git rev-parse --short HEAD)

Progress
Generated from the current commit.

File Changes
${diff_output:-No tracked file changes detected.}

Blockers
None.

Next Steps
Review tracked file changes.
EOF



