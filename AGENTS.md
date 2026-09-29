# AGENTS.md

The global agent instructions own Git Flow, branch naming, commits, pull requests and the merge
protocol. This file adds only what is specific to this repository.

## What this site is

A one-page company card for NeatSoft PTE LTD, the Singapore company Anton Shubin contracts and
invoices through. It is deliberately not a second sales site
([#2](https://github.com/spy4x/neatsoft.dev/issues/2)): offers, prices, promises, case studies
and contact live on antonshubin.com, and this page links there.

Rules that follow from that:

- **No prices, refund terms, guarantees or scope promises here.** They live on antonshubin.com
  and would drift. `test/site.test.ts` fails on the common words for them.
- **"I" or a named person, never "we" or "team"** that implies staff who do not exist.
- **No new claim or number** without a source Anton can show.
- **Keep `#org` stable.** antonshubin.com's JSON-LD (`components/SEOHead.tsx`, `worksFor`)
  points at `https://neatsoft.dev/#org`. Changing the id, the legal name or the UEN means
  changing that site too.

## Code

Plain HTML and inline CSS in `site/index.html`, no build step and no JavaScript. The CSP in
`nginx.conf` allows no scripts; adding one means changing the policy on purpose. `deno fmt`
skips `site/` so the HTML keeps its hand formatting.

## Check and deploy

`deno task check` before every commit. After merge, `deno task deploy` from a clean `origin/main`,
without asking (see README "Deploy").

The first deploy replaces the old `neatsoft-landing` container: README "Moving off the old site".
