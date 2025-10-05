#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit
set -o pipefail
set -o nounset

# Ensure commands run inside the backend directory
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${APP_DIR}"

# Install Python dependencies
python -m pip install --no-cache-dir -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Run database migrations without prompts
python manage.py migrate --no-input
