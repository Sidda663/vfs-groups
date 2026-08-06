#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="${project_root}/.local-data"
lock_file="${runtime_dir}/dev-stack.lock"

mkdir -p "$runtime_dir"
exec 9>"$lock_file"

if ! flock -n 9; then
  echo "VFS Groups development stack is already running."
  echo "Frontend: http://localhost:5173"
  echo "Backend:  http://localhost:5000"
  exit 0
fi

cd "$project_root"
npm run dev:prepare

exec "$project_root/node_modules/.bin/concurrently" \
  --kill-others-on-fail \
  -n client,server \
  -c cyan,yellow \
  "npm run dev:client" \
  "npm run dev --prefix server"
