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
