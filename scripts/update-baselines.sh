#!/usr/bin/env bash
# UI-01: visual baselines come from the same container CI runs in, because fonts render differently on every platform.
# Run from the repository root with Docker running. Copy out only the images; say in the PR why they changed.
set -euo pipefail

IMAGE=mcr.microsoft.com/playwright:v1.64.1-noble

MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W 2>/dev/null || pwd):/src" "$IMAGE" bash -euc '
  mkdir /work
  tar -C /src --exclude=node_modules --exclude=.next --exclude=.git --exclude=.taste-skill --exclude=.env.local -cf - . | tar -C /work -xf -
  cd /work
  npm install --global --silent n pnpm@12.15.0
  n --quiet 26.13.0 > /dev/null
  hash -r
  export CI=1 NEXT_PUBLIC_API_BASE_URL=http://localhost:3999 NEXT_PUBLIC_MOTION_LOG=1
  export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=baseline
  pnpm install --frozen-lockfile --silent
  # The home page is prerendered at build time, so the mock has to be up by then
  node tests/e2e/mock-core.mjs &
  sleep 1
  pnpm build > /dev/null
  pnpm exec playwright test --grep "visual baselines" --update-snapshots=all --reporter=line
  # A baseline that does not match itself on a second run would only ever produce false alarms
  pnpm exec playwright test --grep "visual baselines" --reporter=line
  mkdir -p /src/tests/e2e/__baselines__
  cp tests/e2e/__baselines__/* /src/tests/e2e/__baselines__/
'
