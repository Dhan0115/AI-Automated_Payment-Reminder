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

# Get name status of modified files in the last commit
diff_output=$(git diff-tree --no-commit-id --name-status -r HEAD 2>/dev/null | sed 's/^/* /' || echo "No tracked file changes detected.")
if [ -z "$diff_output" ]; then
  diff_output="No tracked file changes detected."
fi

report_date=$(date +"%Y-%m-%d")
report_file="$repo_root/report/daily-report-${report_date}.md"

mkdir -p "$repo_root/report"
cat > "$report_file" <<EOF
Daily Report
Date: $report_date
Branch: $branch
Commit: $commit

Progress
- $commit_subject
${commit_body:+$commit_body}

File Changes
$diff_output

Blockers
None.

Next Steps
Review tracked file changes.
EOF



