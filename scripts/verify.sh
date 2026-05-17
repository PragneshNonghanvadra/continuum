#!/usr/bin/env bash
set -euo pipefail

bun run typecheck
bun run test
bun run native:test
bun run build
