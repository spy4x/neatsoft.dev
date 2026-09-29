import { assert, assertEquals, assertMatch } from "@std/assert"

const root = new URL("../site/", import.meta.url)
const html = await Deno.readTextFile(new URL("index.html", root))

function meta(attr: string, name: string): string | undefined {
  const re = new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`, "s")
  return html.match(re)?.[1]
}

function jsonLd(): Record<string, unknown>[] {
  const block = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
  assert(block, "JSON-LD block is missing")
  return JSON.parse(block)["@graph"]
}

Deno.test("describes the company for search engines in 120 to 160 characters", () => {
  const description = meta("name", "description")
  assert(description, "meta description is missing")
  assert(
    description.length >= 120 && description.length <= 160,
    `description is ${description.length} characters`,
  )
})

Deno.test("names its canonical URL and Open Graph preview", () => {
  assertMatch(html, /<link rel="canonical" href="https:\/\/neatsoft\.dev\/">/)
  assertEquals(meta("property", "og:url"), "https://neatsoft.dev/")
  assertEquals(meta("property", "og:image"), "https://neatsoft.dev/og.png")
})

Deno.test("the Open Graph image exists and is 1200x630", async () => {
  const png = await Deno.readFile(new URL("og.png", root))
  const view = new DataView(png.buffer)
  assertEquals([view.getUint32(16), view.getUint32(20)], [1200, 630])
})

Deno.test("shows Anton's photo with alt text and a fixed size", async () => {
  const img = html.match(/<img\s[^>]*src="\/anton\.webp"[^>]*>/s)?.[0]
  assert(img, "photo is missing")
  assertMatch(img, /alt="Anton Shubin[^"]*"/)
  // Fixed dimensions keep the text from jumping while the photo loads.
  assertMatch(img, /width="\d+"/)
  assertMatch(img, /height="\d+"/)
  assert((await Deno.stat(new URL("anton.webp", root))).size > 0)
})

Deno.test("every local file the page loads exists", async () => {
  for (const [, path] of html.matchAll(/(?:href=|src=|url\()["']?\/([\w./-]+\.\w+)/g)) {
    // /umami/ is served by the Umami container through Traefik, not from site/.
    if (path.startsWith("umami/")) continue
    await Deno.stat(new URL(path, root))
  }
})

Deno.test("loads Umami first-party and the CSP allows it", async () => {
  const script = html.match(/<script\s[^>]*src="\/umami\/script\.js"[^>]*>/s)?.[0]
  assert(script, "Umami script is missing or not first-party")
  assertMatch(script, /data-website-id="[0-9a-f-]{36}"/)
  assertMatch(script, /data-domains="neatsoft\.dev"/)
  const nginx = await Deno.readTextFile(new URL("../nginx.conf", import.meta.url))
  const csp = nginx.match(/set \$csp "([^"]+)"/)?.[1]
  assert(csp, "nginx.conf sets no CSP")
  // Exactly 'self': anything wider would let a third-party script or beacon in.
  assertMatch(csp, /script-src 'self';/)
  assertMatch(csp, /connect-src 'self';/)
  assertMatch(html, /data-umami-event="book-call"/)
  assertMatch(html, /data-umami-event="email"/)

  // Any of these missing and /umami/script.js answers 404 while the page looks fine.
  const compose = await Deno.readTextFile(new URL("../compose.yml", import.meta.url))
  const label = (key: string) => compose.match(new RegExp(`${key}=(.+?)"`))?.[1]
  assertMatch(label("routers\\.neatsoft-umami\\.rule") ?? "", /PathPrefix\(`\/umami\/`\)/)
  assertEquals(label("routers\\.neatsoft-umami\\.service"), "hl-umami@docker")
  assertMatch(label("routers\\.neatsoft-umami\\.middlewares") ?? "", /neatsoft-umami-strip/)
  assertEquals(label("middlewares\\.neatsoft-umami-strip\\.stripprefix\\.prefixes"), "/umami")
  // Traefik's default priority is the rule's length; the site router's must lose.
  const siteRule = label("routers\\.neatsoft\\.rule") ?? ""
  assert(Number(label("routers\\.neatsoft-umami\\.priority")) > siteRule.length)
})

Deno.test("Organization JSON-LD matches the id and UEN antonshubin.com points at", () => {
  const org = jsonLd().find((node) => node["@type"] === "Organization")
  assert(org, "Organization node is missing")
  // antonshubin.com's SEOHead links `worksFor` to this exact id.
  assertEquals(org["@id"], "https://neatsoft.dev/#org")
  assertEquals(org.legalName, "NeatSoft PTE LTD")
  assertEquals(org.identifier, { "@type": "PropertyValue", propertyID: "UEN", value: "202300222R" })
  const person = jsonLd().find((node) => node["@type"] === "Person")
  assertEquals(person?.["@id"], "https://antonshubin.com/#person")
})

Deno.test("sends offers, work and contact to antonshubin.com", () => {
  for (const path of ["how-i-work", "catalog", "work", "contact-me"]) {
    assert(html.includes(`href="https://antonshubin.com/${path}"`), `no link to /${path}`)
  }
})

Deno.test("makes no price, refund or team claim that could drift from antonshubin.com", () => {
  // Meta tags count too: the old site's "14-day alignment guarantee" sat in its description.
  const metaText = [...html.matchAll(/<meta\s[^>]*content="([^"]*)"/g)].map((m) => m[1])
  const text = [html.replace(/<[^>]+>/g, " "), ...metaText].join(" ").toLowerCase()
  const phrases = [
    "$",
    "usd",
    "sgd",
    "refund",
    "guarantee",
    "hourly",
    "billing",
    "scope",
    "squad",
    "team",
    "we ",
    "we're",
    "we'll",
    " our ",
    "code monkey",
  ]
  for (const phrase of phrases) {
    assert(!text.includes(phrase), `page says "${phrase}"`)
  }
})

Deno.test("robots.txt and sitemap.xml list the one page", async () => {
  const robots = await Deno.readTextFile(new URL("robots.txt", root))
  const sitemap = await Deno.readTextFile(new URL("sitemap.xml", root))
  assertMatch(robots, /^Sitemap: https:\/\/neatsoft\.dev\/sitemap\.xml$/m)
  assertMatch(sitemap, /<loc>https:\/\/neatsoft\.dev\/<\/loc>/)
})
