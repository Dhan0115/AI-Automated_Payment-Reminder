#!/bin/bash

# Determine directory of this script to locate workspace root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$WORKSPACE_ROOT"

# Configure git to use the custom hooks directory
git config core.hooksPath .githooks

# Ensure scripts and hooks are executable
chmod +x .githooks/post-commit
chmod +x scripts/generate_report.sh

echo "Git hooks successfully installed and configured!"
