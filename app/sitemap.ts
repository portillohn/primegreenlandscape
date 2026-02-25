import type { MetadataRoute } from "next";
const BASE = "https://www.primegreenlandscape.com";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: BASE, priority: 1.0, lastModified: now },
        { url: `${BASE}/about`, priority: 0.8, lastModified: now },
        { url: `${BASE}/contact`, priority: 0.8, lastModified: now },
        { url: `${BASE}/gaithersburg`, priority: 0.9, lastModified: now },
        { url: `${BASE}/rockville`, priority: 0.9, lastModified: now },
        { url: `${BASE}/bethesda`, priority: 0.9, lastModified: now },
        { url: `${BASE}/germantown`, priority: 0.9, lastModified: now },
        { url: `${BASE}/potomac`, priority: 0.9, lastModified: now },
        { url: `${BASE}/silver-spring`, priority: 0.9, lastModified: now },
        { url: `${BASE}/terms`, priority: 0.4, lastModified: now },
        { url: `${BASE}/privacy`, priority: 0.4, lastModified: now },
    ];
}
