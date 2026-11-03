import type { MetadataRoute } from "next"

// Tells search engines the site's address (one page)
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://www.permaraiders.xyz" }]
}
