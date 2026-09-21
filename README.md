# lasvegasmobilenotaryservices.com

Lead-gen static site for the Las Vegas city brand. Eleventy 3.x → Cloudflare Workers
(static assets + a `/api/lead` handler), proxying lead capture into the Las Vegas
GHL sub-account.

**This repo is a city site built from the shared template.** Anything site-specific lives in
`eleventy.config.js` and `worker/index.js`; the form itself comes from the shared
[`notary-lead-form`](https://github.com/EmperorFPI/notary-lead-form) package, so a
form fix is a dependency bump rather than a copy-paste across repos.

The package installs from its public GitHub repo, pinned by tag
(`github:EmperorFPI/notary-lead-form#semver:^1.0.0`). Public and MIT on purpose:
a site sold to a buyer keeps building with no account, token, or access to this
org. If a buyer wants no dependency at all, `npx notary-lead-form eject` vendors
the sources in and drops it.

## Stack

- **SSG:** Eleventy 3.x (ESM config), Nunjucks templates, markdown content
- **Hosting:** Cloudflare Workers with static assets (`wrangler deploy`).
  Requires **wrangler 4+** — wrangler 3 silently ignores the `[assets]` block,
  producing a Worker with no `env.ASSETS` binding and no static files.
- **Lead pipeline:** form → `POST /api/lead` (Worker) → GHL inbound webhook (JSON)
- **Attribution:** `/js/lead.js` persists UTM params + `gclid` in sessionStorage
  across the session; hidden fields carry them into the lead payload

## Local development

```bash
npm install
npm run dev        # http://localhost:8080 (Eleventy only)
npm run dev:worker # Eleventy + wrangler dev, exercises /api/lead
npm run build      # outputs to _site/
```

Put the webhook in `.dev.vars` (gitignored) for local Worker runs — see
`.dev.vars.example`.

## Deploy (first time)

1. Create the GitHub repo and push:
   ```bash
   git init && git add -A && git commit -m "Initial site"
   git branch -M main
   git remote add origin git@github.com:EmperorFPI/lasvegasmobilenotaryservices.git
   git push -u origin main
   ```
2. Set the webhook secret (never commit it — it ships to the browser if you do):
   ```bash
   wrangler secret put GHL_WEBHOOK_URL
   ```
3. Deploy:
   ```bash
   npm run deploy     # cleans _site, rebuilds, wrangler deploy
   ```
4. **Workers → the Worker → Settings → Domains & Routes** → add
   `lasvegasmobilenotaryservices.com` and `www`. Cloudflare handles the cert.

## GHL wiring (Las Vegas sub-account)

1. Create the Las Vegas sub-account workflow with an **Inbound Webhook** trigger.
2. **Prime the webhook before saving it** — GHL inbound webhooks must receive a test POST containing *every field you'll ever want to map*; anything absent from the priming payload is silently dropped forever after. The field list below is the contract the Worker actually sends (`DEFAULT_VARIANT` in `notary-lead-form/src/worker.js`, plus the four envelope fields the handler adds) — **if that list changes, re-prime the webhook**. Run this curl with the real webhook URL (the first path segment is the Las Vegas location ID, `OePy3YrpMagdeDDyroQe` — good check that you copied the right sub-account's hook):

   ```bash
   curl -X POST 'https://services.leadconnectorhq.com/hooks/OePy3YrpMagdeDDyroQe/webhook-trigger/YYYY' \
     -H 'Content-Type: application/json' \
     -d '{
       "source_site": "lasvegasmobilenotaryservices.com",
       "brand": "Las Vegas Mobile Notary Services",
       "submitted_at": "2026-07-08T12:00:00.000Z",
       "ip_country": "US",
       "first_name": "Test",
       "last_name": "Lead",
       "phone": "+17025550100",
       "email": "test@example.com",
       "service_type": "In-Person",
       "zip": "89101",
       "documents": "Priming payload — includes every field the site sends",
       "utm_source": "google",
       "utm_medium": "cpc",
       "utm_campaign": "las-vegas-mobile-notary",
       "utm_term": "mobile notary las vegas",
       "utm_content": "ad-variant-a",
       "gclid": "TEST_GCLID",
       "landing_page": "/service-areas/henderson/?utm_source=google",
       "referrer": "https://www.google.com/",
       "page_city": "Henderson",
       "page_state": "NV",
       "page_county": "Clark",
       "page_type": "area"
     }'
   ```
3. Map fields in the workflow: contact create/update, tag `las-vegas-web-lead`, and tag by `service_type`. `service_type` is deliberately binary — exactly `Online` or `In-Person`, set via the `services` option in `eleventy.config.js` — so the workflow can branch straight to NotaryLive for online (RON) or to an in-house Las Vegas notary for in-person. Document specifics arrive in the `documents` free-text field, not the dropdown. Routing ends inside this sub-account's CRM; there is no downstream handoff to any external system.
4. Set `GHL_WEBHOOK_URL` as a **Secret** (not a plaintext variable — plaintext is readable in the dashboard and echoed by `wrangler deploy`) on the Worker: either `wrangler secret put GHL_WEBHOOK_URL`, or **Workers → `lasvegas` → Settings → Variables and Secrets → Add → Secret**. Saving in the dashboard deploys a new version on its own, and a later `npm run deploy` won't clear it. Submit the live form once end-to-end and confirm the contact lands with all attribution fields.

## Conversion tracking

- `src/_data/site.json` holds `{{GTAG_ID}}` and `{{GTAG_CONVERSION_LABEL}}` placeholders.
- gtag snippets are present but **commented out** in `src/_includes/layouts/base.njk` (config) and `src/thank-you.njk` (conversion event). Replace placeholders, uncomment, push.
- `/thank-you/` is `noindex` (meta + `X-Robots-Tag` in `_headers`) and excluded from the sitemap — it exists purely as the conversion surface.

## Before launch checklist

- [x] **Replace the placeholder phone number** — now `(888) 619-1998` / `+18886191998` in `src/_data/site.json` (single source; header, footer, CTAs, and schema all pull from it)
- [ ] Replace placeholder email in `site.json`
- [ ] Register **Las Vegas Mobile Notary Services** DBA in Nevada (Stripe statement descriptor compliance, same as Austin)
- [ ] Connect the Las Vegas Stripe account to the Las Vegas GHL sub-account (isolated ledger for the brand experiment)
- [x] Prime + wire the GHL inbound webhook (above), set `GHL_WEBHOOK_URL` — primed 2026-09-21 with all 24 fields and both `service_type` values; secret set on the `lasvegas` Worker; live form submission confirmed end-to-end
- [ ] Redirect `www` → apex (Rules → Redirect Rules, 301). `www` currently returns **522** — the apex is the canonical host everywhere in the markup, robots.txt, and sitemap
- [ ] Run homepage, one service page, and one area page through the Rich Results Test before assuming the schema pattern holds
- [ ] Verify `/sitemap.xml` renders and submit in Search Console; verify domain property
- [ ] Create the Las Vegas Google Business Profile
- [ ] Wire gtag + conversion label when the Las Vegas campaign spins up

## Content conventions

Follows the NotaryPro content skill: direct, mechanics-grounded voice; honest fee ranges anchored to Nevada's $15/$25 caps; "what it can't do" sections on every service; no pre-signing note in consumer instructions; area pages differentiated by genuine local demand patterns (St. Rose bedside and Sun City estate work in Henderson, VA hospital and Nellis military paperwork in North Las Vegas, UMC trauma and Strip shift-work in Paradise, apostille/international demand in Spring Valley, etc.) — not token-swapped templates, per the scaled-content policy risk. The Las Vegas metro is entirely **Clark County**, so there are no multi-county caveats.

Adding an area page: drop a `.md` in `src/areas/` using `layouts/area.njk` frontmatter (see `henderson.md`); it auto-joins the footer, homepage chips, hub page, nearby-areas cross-links, and sitemap.

Adding a service: drop a `.md` in `src/services/` with an `order` value; same auto-wiring.

## Structure

```
├── eleventy.config.js         Eleventy 3.x ESM config
├── functions/api/lead.js      Pages Function → GHL webhook proxy (honeypot, validation, enrichment)
├── src/
│   ├── _data/site.json        NAP, fees, service areas, gtag placeholders — edit here first
│   ├── _includes/
│   │   ├── layouts/           base / service / area
│   │   └── partials/lead-form.njk
│   ├── css/styles.css         design tokens: ink navy + seal gold, Zilla Slab + Public Sans
│   ├── js/lead.js             UTM capture + fetch submit + thank-you redirect
│   ├── index.njk              homepage (hero + form, FAQPage schema)
│   ├── services/  (5)         mobile-notary, RON, apostille, loan-signing, hospital-jail
│   ├── areas/     (6)         henderson, north-las-vegas, summerlin, paradise, spring-valley, enterprise
│   ├── pricing.md, faq.md, services.njk, service-areas.njk, thank-you.njk, 404.md
│   ├── sitemap.njk, robots.txt, _headers
```
