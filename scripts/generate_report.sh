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
if [[ "$remote_url" =~ ^git@ ]]; then
  temp=${remote_url#git@}
  temp=${temp/:/\/}
  repo_url="https://${temp%.git}"
elif [[ "$remote_url" =~ ^https:// ]]; then
  repo_url="${remote_url%.git}"
else
  repo_url="https://github.com/Dhan0115/AI-Automated_Payment-Reminder"
fi

determine_type() {
  local filepath="$1"
  if [[ "$filepath" =~ ^components/ ]]; then
    echo "Component"
  elif [[ "$filepath" =~ ^pages/ ]]; then
    echo "Page"
  elif [[ "$filepath" =~ ^server/api/ ]]; then
    echo "API Route"
  elif [[ "$filepath" =~ ^(server/|utils/|composables/) ]]; then
    echo "Utility"
  elif [[ "$filepath" =~ ^(nuxt\.config\.ts|package\.json|package-lock\.json|tsconfig\.json|\.env|\.gitignore|\.vscode/) || "$filepath" =~ ^\.[a-zA-Z0-9_-]+$ ]]; then
    echo "Config"
  elif [[ "$filepath" =~ \.(css|scss|sass|less)$ ]]; then
    echo "Style"
  elif [[ "$filepath" =~ \.md$ ]]; then
    echo "Docs"
  elif [[ "$filepath" =~ ^(asset/|assets/|public/) ]]; then
    echo "Asset"
  else
    echo "Other"
  fi
}

# Dynamic summary from the last commit
commit_subject=$(git log -1 --format="%s" 2>/dev/null || echo "No commits yet")
commit_body=$(git log -1 --format="%b" 2>/dev/null || echo "")

repo_name=$(basename "$repo_root")
tmp_report=$(mktemp)
mkdir -p "$repo_root/report"

cat > "$tmp_report" <<EOF
📋 Daily Progress Report : $repo_name
Date: $date

🔎 Summary
Today's work focused on: $commit_subject
$( [ -n "$commit_body" ] && echo -e "\n$commit_body" || true )

Detailed File Changes ᝰ✍🏻 .ᐟ
EOF

# Append Detailed File Changes
git diff-tree --no-commit-id --name-status -r HEAD 2>/dev/null | while read -r status filepath; do
  case "$status" in
    M) status_str="MODIFIED" ;;
    A) status_str="ADDED" ;;
    D) status_str="REMOVED" ;;
    R) status_str="RENAMED" ;;
    *) status_str="MODIFIED" ;;
  esac

  type_str=$(determine_type "$filepath")

  cat >> "$tmp_report" <<EOF

  - ♻️ Change: $status_str | Type: $type_str |
    📁 File: \`$filepath\`
    [1–3 sentences describing exactly what was added, edited, or removed. Be specific — name functions, sections, or features affected.]
EOF
done

cat >> "$tmp_report" <<EOF


Link
  🔗 [GitHub]($repo_url)
EOF

# Copy the fresh daily report to report/daily-report.md
cp "$tmp_report" "$repo_root/report/daily-report.md"

if [ -f "$repo_root/daily-report.md" ] && [ -s "$repo_root/daily-report.md" ]; then
  echo -e "\n\n---\n\n" >> "$tmp_report"
  cat "$repo_root/daily-report.md" >> "$tmp_report"
fi

mv "$tmp_report" "$repo_root/daily-report.md"

