# Cloudflare Traffic Observation

这份记录用于区分 Cloudflare 流量面板里的扫描流量、爬虫访问和真实买家访问，避免把异常请求误判为真实增长。

## Current Observation

- Total Requests: around 3k
- Visits: around 572
- 4xx: around 1.2k
- Top paths include:
  - `/robots.txt`
  - `/`
  - `/styles.css`
- Many suspicious probes were observed:
  - `/nodeweb/.env`
  - `/aws_credentials.ini`
  - `/config/constants.js`
  - `/admin/constant.js`
  - `/server/app.js`
  - `/app/.env.production`

## Judgment

This traffic is mostly scanner / bot traffic, not real buyer traffic.

The 4xx volume and sensitive-file probes suggest automated scanners looking for exposed credentials, app configs, Node files, environment files, or admin paths. These requests should not be counted as buyer intent or marketing traction.

## Positive Signals

Some crawler and discovery activity is useful:

- `robots.txt` requested
- homepage requested
- BingBot observed
- GoogleBot observed
- TwitterBot observed
- AppleBot observed

These signals indicate that normal search, preview, or platform crawlers can see the site. They should be separated from malicious probes rather than blocked together.

## Recommended WAF Rules

Recommended:

- Block sensitive file probes such as `.env`, `.env.production`, `aws_credentials.ini`, config constants, server app files, and admin JS config paths.
- Block `TLM-Audit-Scanner` user agent.
- Keep rules narrow and path/user-agent specific.
- Do not block legitimate search or AI search crawlers.

Crawler allow / caution list:

- GoogleBot
- BingBot
- AppleBot
- TwitterBot
- OAI-SearchBot
- ChatGPT-User
- PerplexityBot
- Claude-User

Training crawlers such as `Google-Extended` should be handled separately from search or user-request crawlers.

## Do Not Overreact

Do not:

- block all bots
- block AI search crawlers
- disallow `robots.txt` access
- interpret total requests as real traffic growth
- treat scanner probes as buyer demand
- add broad WAF rules that may block search crawlers, social preview bots, or AI search access

## Next Monitoring Checklist

Track whether these paths receive crawler visits, real visits, or referral visits:

- `/for-buyers/`
- `/supplier-reply-review/`
- `/supplier-reply-review/sample-report/`
- `/supplier-reply-review/examples/`
- `/field-materials/`
- `/buyer-guides/`
- `/es/buyer-guides/`

For each path, record:

- total requests
- 2xx visits
- 4xx noise
- top user agents
- referrers
- country / region
- whether the request looks like crawler, scanner, or real user traffic

## Practical Interpretation

Use Cloudflare traffic as infrastructure telemetry, not conversion proof.

Real progress for Gewuji should be measured by:

- relevant GSC impressions
- visits to Buyer Guides and Supplier Reply Review pages
- sample report views
- submitted supplier messages
- meaningful external referrals
- direct buyer conversations
