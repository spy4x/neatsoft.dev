# neatsoft.dev

The company card for NeatSoft PTE LTD, served at https://neatsoft.dev. One static HTML page:
what the company is, its registration details, and links to
[antonshubin.com](https://antonshubin.com) for offers, work and contact
([#2](https://github.com/spy4x/neatsoft.dev/issues/2) chose a card over a second sales site).

## Layout

```
site/          # the served files: index.html, og.png, favicon.svg, robots.txt, sitemap.xml
test/          # checks on the page (SEO tags, JSON-LD, links, no drifting claims)
scripts/       # deploy.ts
compose.yml    # nginx behind the shared Traefik on the cloud server
nginx.conf     # routes and the Content-Security-Policy
```

## Run locally

Open `site/index.html` in a browser, or serve it the way production does:

```bash
docker run --rm -p 8080:80 -v "$PWD/site:/usr/share/nginx/html:ro,z" -v "$PWD/nginx.conf:/etc/nginx/conf.d/default.conf:ro,z" nginx:1.29-alpine
```

## Tasks

```bash
deno task check    # fmt + lint + type-check + tests
deno task deploy   # rsync to the cloud server and docker compose up (clean main only)
```

## Deploy

Merge the pull request, then run `deno task deploy` from an up-to-date `main`. It copies
`compose.yml`, `nginx.conf` and `site/` to `cloudlab:~/cloudlab/apps/neatsoft.dev/` and runs
`docker compose up -d` there. The container joins the external `proxy` network, and Traefik
routes `neatsoft.dev` to it and redirects `www.neatsoft.dev` to it. There are no secrets and no
env files.

To regenerate `site/og.png` after a wording change:

```bash
magick -size 1200x630 xc:'#121214' -fill '#ececee' -font DejaVu-Sans-Bold -pointsize 88 -annotate +96+300 'NeatSoft PTE LTD' -fill '#a3a3ab' -font DejaVu-Sans -pointsize 40 -annotate +96+380 'Software engineering company, Singapore' -annotate +96+440 'UEN 202300222R' -strip site/og.png
```
