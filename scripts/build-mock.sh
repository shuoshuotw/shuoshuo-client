#!/usr/bin/env bash
# The build tests/e2e runs against. The mock must be up first: the home page is prerendered at build time.
set -euo pipefail

export NEXT_PUBLIC_API_BASE_URL=http://localhost:3999
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:3999
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock
export NEXT_PUBLIC_MOTION_LOG=1

pnpm build
