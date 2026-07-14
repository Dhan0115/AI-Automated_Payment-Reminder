#!/bin/bash
set -euo pipefail

log_dir="${HOME}/.cache/daily-report"
log_file="${log_dir}/errors.log"
mkdir -p "$repo_root/report/daily-report.md"

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

cat > "$repo_root/report/daily-report.md" <<EOF
📋 Daily Progress Report
Date: $date 
Branch: $branch 
Author: $author

✅ Summary
Today's work focused on: $commit_subject
$( [ -n "$commit_body" ] && echo -e "\n$commit_body" || true )

EOF

Append Detailed File Changes
{
  echo "🛠️ Detailed File Changes"
  i=0
  emojis=("1️⃣" "2️⃣" "3️⃣" "4️⃣" "5️⃣" "6️⃣" "7️⃣" "8️⃣" "9️⃣" "🔟")

  git diff-tree --no-commit-id --name-status -r HEAD 2>/dev/null | while read -r status filepath; do
    emoji=${emojis[$i]}
    if [ -z "$emoji" ]; then
      emoji="👉"
    fi

    case "$status" in
      M) status_str="Modified" ;;
      A) status_str="Added" ;;
      D) status_str="Deleted" ;;
      R) status_str="Renamed" ;;
      C) status_str="Copied" ;;
      *) status_str="Updated" ;;
    esac

    printf "%s %s\t%s\n" "$emoji" "$filepath" "$status_str"
    printf " 👉%s/-/blob/%s/%s?ref_type=heads\n\n" "$repo_url" "$branch" "$filepath"

    i=$((i+1))
  done
} >> "$repo_root/report/daily-report.md"


cat >> "$repo_root/report/daily-report.md" <<EOF
🚀 Key Accomplishments & Features
- make a detailed accomplishment and features 
- task completed description

EOF
fi
