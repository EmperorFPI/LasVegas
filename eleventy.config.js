import leadForm from "notary-lead-form/eleventy";
import site from "./src/_data/site.json" with { type: "json" };

export default function (eleventyConfig) {
  // Shared lead form: renders {% leadForm %} and serves /js/lead.js.
  // Everything site-specific lives here, so this config is the only thing a
  // new city site needs to change.
  eleventyConfig.addPlugin(leadForm, {
    // Only two routes exist: NotaryLive handles online (RON), in-house Las
    // Vegas notaries handle everything in person. The workflow branches on
    // this value, so keep it binary — document specifics arrive via `documents`.
    services: ["Online", "In-Person"],
    serviceLabel: "Online or in person?",
    zipPlaceholder: "89101",
    phone: site.phone,
    phoneHref: site.phoneHref,
    trust:
      "Commissioned &middot; Background-screened &middot; E&amp;O insured. " +
      "Payment is processed before the appointment — no surprises at the table.",
  });

  // Static passthrough
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });

  // Collections
  eleventyConfig.addCollection("services", (api) =>
    api.getFilteredByGlob("src/services/*.md").sort((a, b) => (a.data.order || 99) - (b.data.order || 99))
  );
  eleventyConfig.addCollection("areas", (api) =>
    api.getFilteredByGlob("src/areas/*.md").sort((a, b) => a.data.title.localeCompare(b.data.title))
  );

  // Shortcodes
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  // Filters
  eleventyConfig.addFilter("jsonify", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().split("T")[0]);

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
