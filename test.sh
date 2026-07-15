#!/bin/bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
echo "Generating daily report using scripts/generate_report.sh..."
"$repo_root/scripts/generate_report.sh"
echo "Report generated at daily-report.md"
