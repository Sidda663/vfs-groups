#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="${project_root}/.local-data"
lock_file="${runtime_dir}/server-dev.lock"
health_url="http://127.0.0.1:5000/api/v1/health"

mkdir -p "$runtime_dir"
exec 8>"$lock_file"

if ! flock -n 8; then
  echo "VFS Groups backend is already managed by another development process on port 5000."
  exit 0
fi

if curl -fsS --max-time 1 "$health_url" >/dev/null 2>&1; then
  echo "VFS Groups backend is already healthy on port 5000."
  exit 0
fi

cd "$project_root/server"
exec node --watch src/server.js
