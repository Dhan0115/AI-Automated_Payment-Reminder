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
formatted_date=$(date +"%B %-d, %Y (%A)")
report_date=$(date +"%Y-%m-%d")

# Format remote origin URL to https url
remote_url=$(git config --get remote.origin.url || echo "")
if [[ "$remote_url" =~ ^git@ ]]; then
  temp=${remote_url#git@}
  temp=${temp/:/\/}
  repo_url="https://${temp%.git}"
elif [[ "$remote_url" =~ ^https:// ]]; then
  repo_url="${remote_url%.git}"
else
  # Fallback to the known remote repository for this workspace
  repo_url="https://github.com/Dhan0115/AI-Automated_Payment-Reminder"
fi

branch=$(git branch --show-current 2>/dev/null || echo "detached-head")
commit=$(git rev-parse --short HEAD 2>/dev/null || echo "none")

# Find the first commit of today
first_commit_today=$(git log --since="${report_date} 00:00:00" --reverse --format="%H" 2>/dev/null | head -n 1 || echo "")

# Gather today's commits
commits_today=""
if [ -n "$first_commit_today" ]; then
  while read -r hash; do
    if [ -n "$hash" ]; then
      subject=$(git show -s --format="%s" "$hash")
      body=$(git show -s --format="%b" "$hash" | sed 's/^/  /')
      commits_today="${commits_today}* **${subject}** (${hash})
"
      if [ -n "$body" ] && [ "$body" != "  " ]; then
        commits_today="${commits_today}${body}
"
      fi
    fi
  done < <(git log --since="${report_date} 00:00:00" --reverse --format="%h" -- . ':!node_modules' ':!.nuxt' ':!package-lock.json')
fi

# Gather file changes today
file_changes=""
if [ -n "$first_commit_today" ]; then
  # Determine comparison revision (parent of first commit of today)
  if git rev-parse "${first_commit_today}~1" &>/dev/null; then
    compare_rev="${first_commit_today}~1"
  else
    # Fallback to empty tree if there's no parent commit
    compare_rev=$(git hash-object -t tree /dev/null)
  fi

  while read -r diff_status file_path; do
    # Strip double quotes from path if git outputs them
    file_path=$(echo "$file_path" | sed -e 's/^"//' -e 's/"$//')
    case "$diff_status" in
      A) emoji="🟢" status_text="Added" ;;
      M) emoji="🟡" status_text="Modified" ;;
      D) emoji="🔴" status_text="Deleted" ;;
      *) emoji="⚪" status_text="$diff_status" ;;
    esac
    file_name=$(basename "$file_path")
    file_changes="${file_changes}* $emoji **$status_text**: [$file_name](file://$repo_root/$file_path)
"
  done < <(git diff --no-renames --name-status "$compare_rev" HEAD -- . ':!node_modules' ':!.nuxt' ':!package-lock.json' 2>/dev/null || echo "")
fi

# Gather uncommitted changes if any
uncommitted_changes=""
while IFS= read -r line; do
  if [ -n "$line" ]; then
    # status is the first 2 chars
    diff_status="${line:0:2}"
    diff_status=$(echo "$diff_status" | xargs) # trim spaces
    file_path="${line:3}"
    # Strip double quotes
    file_path=$(echo "$file_path" | sed -e 's/^"//' -e 's/"$//')
    case "$diff_status" in
      A|??) emoji="🟢" status_text="Added (Uncommitted)" ;;
      M)    emoji="🟡" status_text="Modified" ;;
      D)    emoji="🔴" status_text="Deleted" ;;
      *)    emoji="⚪" status_text="$diff_status" ;;
    esac
    file_name=$(basename "$file_path")
    uncommitted_changes="${uncommitted_changes}* $emoji **$status_text**: [$file_name](file://$repo_root/$file_path)
"
  fi
done < <(git status --porcelain -- . ':!node_modules' ':!.nuxt' ':!package-lock.json' 2>/dev/null || echo "")

report_file="$repo_root/report/daily-report-${report_date}.md"
mkdir -p "$repo_root/report"

# Generate report content
{
  echo "Daily Progress Report Date: $formatted_date"
  echo ""
  echo "Branch: \`$branch\`"
  echo "Latest Commit: \`$commit\`"
  echo ""
  echo "## 🚀 Today's Commits & Progress"
  echo ""
  if [ -n "$commits_today" ]; then
    printf "%s" "$commits_today"
  else
    echo "No commits recorded for today yet."
  fi
  echo ""
  
  if [ -n "$uncommitted_changes" ]; then
    echo "### ⏳ Uncommitted Changes"
    echo ""
    printf "%s" "$uncommitted_changes"
    echo ""
  fi

  echo "## 🛠️ Detailed File Changes"
  echo ""
  if [ -n "$file_changes" ]; then
    printf "%s" "$file_changes"
  else
    echo "No files changed in today's commits."
  fi
  echo ""
  echo "[Remote Repository]($repo_url)"
} > "$report_file"






