#!/usr/bin/env bash
# The Lighthouse check of the page (`deno task lighthouse`): site/ must score, in Lighthouse
# mobile, at least 95 for performance and 100 for accessibility, best practices and SEO, the median
# of three runs ("Design gate" in the global agent rules). Lighthouse CI serves site/ itself,
# without the compression production has, which only makes the check stricter. The Umami script is
# blocked during the runs: its `/umami` route exists only in production, and its 404 would cost
# best practices. Reports land in .lighthouseci/. CI runs this script (.woodpecker.yml); run it the
# same way on a machine, from the repository root. Needs a Chromium: `CHROME_PATH`, or the newest
# one Playwright installed.
set -euo pipefail

if [ -z "${CHROME_PATH:-}" ]; then
  CHROME_PATH=$(find "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" \
    -path '*/chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -n 1)
  [ -n "$CHROME_PATH" ] || { echo "no Chromium found: set CHROME_PATH"; exit 1; }
fi
export CHROME_PATH

SCRATCH=$(mktemp -d)
trap 'find "$SCRATCH" -delete' EXIT

# Run from the scratch folder, outside deno.json and deno.lock: a tool for this check only, pinned
# here, with no package younger than a day. Lighthouse runs as a Node subprocess, which needs a
# node_modules folder: it goes in the scratch folder too.
ROOT=$PWD
(cd "$SCRATCH" && deno run -A --no-config --no-lock --node-modules-dir=auto \
  --minimum-dependency-age=1440 npm:@lhci/cli@0.15.1 autorun \
  --config="$ROOT/scripts/lighthouse/lighthouserc.json" \
  --collect.staticDistDir="$ROOT/site" --upload.outputDir="$ROOT/.lighthouseci/reports")
