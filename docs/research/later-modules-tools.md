# Later modules: build, connect or leave out (facts)

Compiled 2026-10-15 for issue #7 ("Build, connect or leave out the later modules"). Facts only. The decision is made in #9 ("Module positions").

Scope: the placeholder modules **Store & Sales** (Product Listings, Orders, Sales Analytics, Brand Website), **Shipping & Feedback** (Shipments, Returns, Customer Feedback), **Marketing** (Campaigns, Content Calendar, Assets) and the Inventory half of **Quality & Inventory** (Inventory, Stock Movements). Techstyles is local, single-user, not hosted, with no sign-in (`docs/backend.md`). Whether it gets hosted is open (#5).

## Evidence notes

- All facts were read from the cited page on 2026-10-15. Prices change; re-check them before deciding.
- Some vendor pages were served in a German/EUR locale (Shopify pricing, Squarespace pricing, Sendcloud, Klaviyo). EUR figures are given as served. Where only secondary sources gave USD figures, this is marked **secondary**.
- "Local-friendly" below means the integration works from a process on the founder's machine with a stored token or a file: no public URL, no OAuth redirect to a hosted server, no webhook endpoint.
- Not verified: actual tool usage shares among one-founder fashion brands. No primary usage survey was read, so "dominant" means the platform's own first-party feature or the app it ships with, plus high-volume App Store listings.

## What Techstyles already holds

From `src/lib/types.ts` at a3a9fe0:

| Data | Where | Gap for selling |
|---|---|---|
| Product name, code, category, stage, description, cover/mockup images | `ProductSnapshot` | No retail price, no SKU or barcode per variant, no weight |
| Colorways (name, hex, image) | `colors[]` | Colorway × size gives variants, but no variant records exist |
| Sizes | `baseSize`, size keys in `measurements[].values`, size-chart library | Same |
| Materials (composition, weight, free-text supplier, placement) | `materials[]`; library materials also have unit cost | No landed cost per unit |
| Manufacturer, Quote (unit price, currency, MOQ, lead times) | Sourcing (outside the tech pack, ADR 0001) | Chosen unit price is the nearest thing to a cost per item |
| Brand Profile (name, logo, values, audience, tone, colors), Brand Book | Brand Profile | Source for campaign copy and site styling |
| Sample requests (size, color, qty, free-text status) | `samples[]` | No production order or received quantity |

Nothing in the app records stock quantities, production orders, sales, customers or shipments.

## Store & Sales

### Tools

- **Shopify** is the platform-native option: online store, checkout, orders, reports, POS for occasional in-person sales on all plans ([pricing](https://www.shopify.com/pricing)).
  - Plans as served (EUR, monthly / annual billing): Basic 36 / 27, Grow 105 / 79, Advanced 384 / 289, Plus from 2,100. Online card rates 2.1% / 1.8% / 1.6% / 1.3% + €0.30; third-party payment fee 2% / 1% / 0.6% / 0.2% ([pricing](https://www.shopify.com/pricing)).
  - USD (**secondary**): Basic $39 / $29, Grow $105 / $79, Advanced $399 / $299 ([NerdWallet](https://www.nerdwallet.com/article/small-business/shopify-pricing)).
  - Custom apps: Basic gets "custom apps with limited data access"; Grow and up get "full data access" ([pricing](https://www.shopify.com/pricing)).
  - Reports: "200+ real-time reports and custom analytics" listed on all plans, no plan difference shown ([pricing](https://www.shopify.com/pricing)). Default report categories: Sales, Inventory, Finance ([help](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports)).
  - The Starter plan (~$5) is not on the pricing page. Shopify's help center says it is only for merchants already on it; its marketing page still advertises it ([search summary of help.shopify.com and shopify.com/starter](https://www.shopify.com/starter)). Treat it as unavailable for new stores (unverified).
- **Squarespace** (site builder with commerce): Basic €17 / €12, Core €24 / €18, Plus €42 / €32, Advanced €79 / €69; Basic charges 2% on online store sales; "Commerce APIs" listed on Core and up ([pricing](https://www.squarespace.com/pricing)). Its developer docs instead say a custom-app API key requires "Commerce Advanced" ([auth docs](https://developers.squarespace.com/commerce-apis/authentication-and-permissions)). The two pages conflict.
- **Etsy**: marketplace listings via Open API v3 ([auth](https://developer.etsy.com/documentation/essentials/authentication)).

### Integration surface

**Shopify Admin API**
- GraphQL Admin API, current version 2026-10 ([reference](https://shopify.dev/docs/api/admin-graphql/latest)).
- Rate limits (cost points per second): Standard 100, Advanced 200, Plus 1,000; max single query cost 1,000 ([rate limits](https://shopify.dev/docs/apps/build/apis/graphql-admin/rate-limits)).
- Default limit 2,048 variants per product; `productSet` creates or updates a product with variants in one call ([search summary of productSet docs](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/productSet)). The product CSV allows up to 3 options per product ([CSV help](https://help.shopify.com/en/manual/products/import-export/using-csv)), so colorway × size fits in 2 options.

**Shopify auth (what a local app can use)**
- Since 2026-01-01, new custom apps can't be created in the Shopify admin (the old "copy an Admin API token" route). New ones are built in the Dev Dashboard and installed on the store. Existing ones keep working ([changelog, 2025-10-30](https://changelog.shopify.com/posts/legacy-custom-apps-can-t-be-created-after-january-1-2026); [token docs](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin)).
- **Client credentials grant**: the app exchanges client ID + secret for a token at `https://{shop}.myshopify.com/admin/oauth/access_token`. There is "no redirect flow to implement", and the token lasts 24 hours. It only works when the app and the store are in the same Shopify organization ([docs](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)). The docs' example is a standalone Node script, so this is local-friendly for a founder who owns both.
- Otherwise: token exchange (embedded apps) or the authorization code grant, which needs a redirect URL ([same page](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)).

**Shopify webhooks**
- Delivered to an HTTPS URL, Google Pub/Sub or Amazon EventBridge; delivery "isn't always guaranteed", so apps should reconcile by polling ([webhooks](https://shopify.dev/docs/apps/build/webhooks)).
- A local app can't receive HTTPS webhooks without a public endpoint, but it can poll the Admin API.

**Shopify CSV (no API)**
- Product CSV columns include URL handle, Title, Vendor, Type, Tags, Option1–3 name/value, SKU, Barcode, Price, Compare-at price, **Cost per item**, Inventory quantity, Weight, Product image URL and Variant image URL. Only Title is required for new products ([CSV help](https://help.shopify.com/en/manual/products/import-export/using-csv)).
- Image columns take URLs, so local `/api/uploads/...` images would have to be uploaded elsewhere first (inference from the column type).
- Order export to CSV from the admin: up to 50 orders download directly, larger exports are emailed ([orders export](https://help.shopify.com/en/manual/fulfillment/managing-orders/exporting-orders)).

**Shopify analytics via API**
- `shopifyqlQuery` (GraphQL Admin 2025-10+) returns report tables. It needs the `read_reports` scope **and Level 2 protected customer data access** ([search summary of shopify.dev ShopifyQL docs](https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyqlQuery)).

**Squarespace Commerce APIs**
- Orders, Inventory, Products, Transactions, Profiles (maintenance mode) and Webhook Subscriptions ([overview](https://developers.squarespace.com/commerce-apis/overview)).
- API key from Settings → Advanced → Developer API Keys; shown once; doesn't expire. Local-friendly ([auth](https://developers.squarespace.com/commerce-apis/authentication-and-permissions)).

**Etsy Open API v3**
- OAuth 2.0 with PKCE is required. The redirect URI must be `https://` and match exactly, so a plain `http://localhost` callback appears not to be accepted (inferred, not confirmed) ([auth](https://developer.etsy.com/documentation/essentials/authentication)).
- Per-key QPS/QPD limits; higher quota by email request ([rate limits](https://developer.etsy.com/documentation/essentials/rate-limits)).

### Overlap with Techstyles

- Product name/description ≈ Title/Description.
- Colorways and sizes ≈ Option1/Option2 values.
- Product code ≈ handle or SKU stem.
- Category ≈ Type.
- Chosen Quote unit price ≈ Cost per item.
- Brand Profile ≈ storefront theme inputs.

Techstyles has no retail price, SKU/barcode per variant, weight or hosted image URLs.

### What the founder would still lack next to tech packs

Nothing for orders, checkout, payments or storefront: the store platform owns these. The open gap is pushing a finished product's data and cost from the tech pack into the store without retyping it.

## Shipping & Feedback

### Tools

**Shipments**
- **Shopify Shipping**: buy labels in the admin, singly or in bulk; carrier discounts vary by plan; return labels if the default location is in the US; carriers vary by country ([help](https://help.shopify.com/en/manual/fulfillment/shopify-shipping)). Grow lists "best domestic shipping rates" ([pricing](https://www.shopify.com/pricing)).
- **Shippo**: Starter free (up to 30 labels/month, 1 user); Pro $17/month; API calls not tied to labels billed separately ([pricing](https://goshippo.com/pricing)).
- **ShipStation**: Starter from $14.99/month (50 shipments), with no API; Standard from $29.99 includes the Shipping API ([pricing](https://www.shipstation.com/pricing/)).
- **Sendcloud** (EU): Free (up to 20 parcels/month); Lite €28; Growth €87, which adds a branded return portal; "API access" appears in the comparison table but the plan mapping wasn't clear ([pricing](https://www.sendcloud.com/pricing/)).

**Returns**
- **Shopify self-serve returns**: customers request returns from the order status page under the founder's return rules; return labels can be sent on approval ([help](https://help.shopify.com/en/manual/fulfillment/managing-orders/returns/self-serve-returns)). Plan availability isn't stated on that page.
- **Loop Returns**: Checkout+ free (shopper-paid model); Essential from $155/month; Advanced from $340/month ([pricing](https://www.loopreturns.com/pricing/)).
- AfterShip Returns: the pricing page blocked automated reads (HTTP 403); not verified.

**Customer feedback**
- **Judge.me** (reviews): Free has unlimited reviews, photo/video reviews and widgets; Awesome $15/month adds 130+ integrations and advanced collection automations; rated 5.0 from 48,541 reviews ([App Store](https://apps.shopify.com/judgeme)).
- **Shopify Forms**: free, but built for sign-up and lead capture, not contact or feedback forms ([search summary of help.shopify.com](https://help.shopify.com/en/manual/promoting-marketing/create-marketing/forms-app)). Contact and feedback forms come from third-party apps with free tiers of about 25–100 submissions/month (e.g. [POWR](https://apps.shopify.com/powr-form-builder), [Hulk](https://apps.shopify.com/form-builder-by-hulkapps)).
- Shopify plans include customer chat ([pricing](https://www.shopify.com/pricing)).

### Integration surface

All of these tools read orders from the store platform themselves; they install as store apps. A Techstyles connection would go through the store's orders and fulfillments API (above), not to each tool.

### Overlap with Techstyles

- Return reasons and review text are product-level feedback that relates to the tech pack: fit (sizes, measurements), material (BOM) and quality (manufacturer).
- Shipping data does not overlap: Techstyles has no weights, parcel sizes or customer addresses.
- Packaging is a tech pack section, but it holds no shipment dimensions.

### What the founder would still lack next to tech packs

A view of return reasons and review comments per product, colorway or size, linked back to the tech pack version and manufacturer that made it. None of the tools above link feedback to a tech pack or manufacturer, since they don't hold that data (inference: their data models are store orders and products).

## Marketing

### Tools

**Email (Campaigns)**
- **Shopify Messaging** (formerly Shopify Email): up to 10,000 emails/month free, then $1 per 1,000; available on Basic and up ([Shopify Messaging](https://www.shopify.com/email-marketing); [changelog](https://changelog.shopify.com/posts/volume-pricing-for-shopify-email); [help](https://help.shopify.com/en/manual/promoting-marketing/create-marketing/shopify-email/pricing)).
- **Klaviyo**: free up to 250 active profiles and 500 emails/month; paid tiers not priced on the page as served ([pricing](https://www.klaviyo.com/pricing)).

**Social and Content Calendar**
- **Buffer**: Free has 3 channels, 10 scheduled posts per channel, and API access with 1 key and 3,000 requests/month; Essentials $5/channel/month; Team $10/channel/month. API limit: 100 requests per 15 minutes ([pricing](https://buffer.com/pricing)). The API is GraphQL with Bearer-token keys from account settings ([developers](https://developers.buffer.com/)).
- **Instagram Graph API (direct)**: needs a professional account and a Meta login flow (Instagram Login or Facebook Login for Business); 100 API-published posts per 24 hours; media "must be hosted on a publicly accessible server" ([content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)).

### Integration surface

- **Klaviyo**: private API keys created by an Owner/Admin in Settings → API keys, with scoped read/full access. Private-key integrations share one per-account quota, with burst and steady windows per endpoint ([help](https://help.klaviyo.com/hc/en-us/articles/115005062267); [rate limits](https://developers.klaviyo.com/en/docs/rate_limits_and_error_handling)). Local-friendly.
- **Buffer**: personal API key. Local-friendly for scheduling text; media handling is covered in a separate "Hosting Media" guide, not verified.
- **Instagram direct**: OAuth plus public media URLs. Not local-friendly.
- **Shopify Messaging**: no separate API was found in this research.

### Overlap with Techstyles

- Brand Profile (tone, values, audience, colors, logo) is the input for campaign copy and visuals.
- Product mockups, artworks and covers are assets.
- The optional OpenAI image generation already makes mockups and artwork (`docs/backend.md`).
- Marketing's "Assets" page overlaps with existing uploads and libraries.

### What the founder would still lack next to tech packs

A plan that ties launches to production: when a product's samples are approved and stock lands, what goes out and when. Email and scheduling tools don't know production dates.

## Inventory (Quality & Inventory)

### Tools

**Shopify inventory**
- Inventory per location: 10 locations on Basic, Grow and Advanced; 200 on Plus ([pricing](https://www.shopify.com/pricing)).
- Admin purchase orders: supplier, destination, products, payment terms, cost summary, PDF to send. Stock is received through a linked inventory transfer, where items are accepted or rejected and shipping and duty costs can be added ([PO help](https://help.shopify.com/en/manual/products/inventory/purchase-orders/creating-purchase-orders); [transfers](https://help.shopify.com/en/manual/products/inventory/purchase-orders/creating-transfers-from-purchase-orders)).

**Stocky** (Shopify's inventory app)
- Delisted 2026-02-02 and retired 2026-08-31. Purchase orders now live in the admin; historical POs can't be imported; suppliers can't be exported ([transition guide](https://help.shopify.com/en/manual/products/inventory/transitioning-from-stocky)).
- A Shopify staff reply says there is currently no Purchase Order API in the Admin API ([community thread](https://community.shopify.dev/t/stocky-sunset-shopify-feature-parity/29199), staff statement via search summary, not first-party docs).

**Katana** (manufacturing ERP: BOMs, materials, production): Free up to 30 SKUs with API access and the Shopify integration; Advantage is custom-priced per annual contract ([pricing](https://katanamrp.com/pricing/)).

### Integration surface

- Inventory states: `incoming`, `on_hand`, `available`, `committed`, `reserved`, `damaged`, `safety_stock`, `quality_control` ([docs](https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps/manage-quantities-states)).
- Mutations: `inventorySetQuantities`, `inventoryAdjustQuantities`, `inventoryMoveQuantities`. Scopes `read_inventory` / `write_inventory`. `committed` can't be adjusted by API. `inventorySetScheduledChanges` (incoming → available) is being phased out and isn't in 2026-07 ([same page](https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps/manage-quantities-states)).
- The `quality_control` and `damaged` states map onto the Quality Checks page.
- Product CSV "Inventory quantity" works only for single-location stores ([CSV help](https://help.shopify.com/en/manual/products/import-export/using-csv)).

### Overlap with Techstyles

- A chosen Quote (unit price, MOQ, lead time) plus a Manufacturer is the substance of a production purchase order.
- Colorway × size is the variant breakdown of that order.
- Materials with suppliers are the raw-material side, which Shopify doesn't track; Katana does.

### What the founder would still lack next to tech packs

The step from a Chosen Quote Request to a production order (quantities per colorway and size, expected date). After that: received units passing quality checks, then sellable stock. Shopify's admin POs are typed by hand, have no API (per staff), and don't know tech packs or Quotes.

## Hosting dependence (#5)

| Integration | Works from local app? | Needs |
|---|---|---|
| Shopify CSV product import / order export | Yes | Manual file upload/download; image URLs must be public |
| Shopify Admin API via client credentials (own org) | Yes | Dev Dashboard app; token refresh every 24 h |
| Shopify Admin API via authorization code (other org / public app) | No | Redirect URL on a server |
| Shopify webhooks | No (poll instead) | Public HTTPS, Pub/Sub or EventBridge |
| Squarespace Commerce API key | Yes | Plan with Commerce APIs |
| Etsy Open API v3 | Unclear, likely no | `https://` redirect URI |
| Klaviyo private key | Yes | Owner/Admin creates the key |
| Buffer API key | Yes (text); media unverified | Personal key |
| Instagram Graph API direct | No | Meta login flow; media on a public server |
| Katana API | Yes (per pricing page: API on Free) | Auth model not verified |

## Facts that bear on build / connect / leave out

| Module | Facts pointing to connecting | Facts pointing to building | Facts pointing to leaving out |
|---|---|---|---|
| **Store & Sales** | Shopify owns storefront, checkout, orders and 200+ reports on every plan from ~€27–36/month. Product CSV and Admin API (client credentials, local-friendly) accept title, options, SKU, price and cost per item, which map to tech pack data. | Techstyles alone holds tech pack → product data and the chosen cost; no tool pushes it from a tech pack. | Orders, payments, storefront and analytics are fully covered by the store platform. Analytics via API needs Level 2 customer-data approval. Webhooks need hosting. |
| **Shipping & Feedback** | Labels and returns are built into Shopify (returns portal; labels with plan-based discounts). Shippo, ShipStation and Sendcloud have free or low tiers. Judge.me reviews are free. | Return reasons and reviews tie back to sizes, materials and manufacturers only inside Techstyles. | All of these tools read orders from the store, not from Techstyles. Techstyles holds no weights, addresses or orders. |
| **Marketing** | Shopify Messaging gives 10k emails/month free. Klaviyo and Buffer have free tiers and local-friendly API keys. | Brand Profile, mockups and artwork (with optional AI generation) already live in Techstyles. Launch timing could follow sample and production dates that only Techstyles would hold. | Direct Instagram publishing needs OAuth and publicly hosted media. Scheduling and email tools are cheap or free. The Assets page overlaps existing uploads and libraries. |
| **Inventory** | Shopify tracks stock states (incl. `incoming`, `quality_control`, `damaged`) by API, and has admin POs with receiving. Katana is free up to 30 SKUs with BOMs and the Shopify integration. | Stocky was retired 2026-08-31. Shopify admin POs have no Admin API (staff statement) and can't import history. No tool turns a Chosen Quote into a production order by colorway × size. Quality checks sit between production and stock. | A founder without a store yet has no sell-side stock to track. A single location can set quantities by CSV. |
