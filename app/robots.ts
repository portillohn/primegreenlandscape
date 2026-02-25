import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/dashboard/",
                "/admin/",
                "/api/",
                "/?plan=",
                "/*?*"
            ],
        },
        sitemap: "https://www.primegreenlandscape.com/sitemap.xml",
    };
}
