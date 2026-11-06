#!/usr/bin/env bash
# The build tests/full runs against: local Supabase and a real Core on port 3001. Core and Supabase must be up.
set -euo pipefail

export NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
export NEXT_PUBLIC_MOTION_LOG=1
# The secret Core checks the server's own calls with: .env.local's when it has one (pnpm start reads the same file),
# or the local default. A mismatch turns every signed call into a 401
if [ -z "${INTERNAL_HMAC_SECRETS:-}" ] && [ -f .env.local ]; then
  INTERNAL_HMAC_SECRETS="$(grep -E '^INTERNAL_HMAC_SECRETS=' .env.local | cut -d= -f2- || true)"
fi
export INTERNAL_HMAC_SECRETS="${INTERNAL_HMAC_SECRETS:-local-only-internal-hmac-secret-0123456789}"

pnpm build
