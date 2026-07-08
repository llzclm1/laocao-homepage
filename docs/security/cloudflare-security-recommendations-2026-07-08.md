# Cloudflare Security Recommendations

## Current Signals

- Bot Fight Mode: On
- JavaScript detections: Enabled
- AI bots protection: Disabled
- Content bots protection: Disabled
- Crawler protection: Disabled
- Security Insights includes HSTS, security.txt, and scanner path reminders.
- Traffic includes probes for `.env`, `.git`, `aws_credentials`, `config`, `admin`, `wp-login`, and similar paths.

## Priority

### P0: Block Sensitive File Probes

Rule name:

Block sensitive file probes

Condition idea:

URI Path contains ".env"
or URI Path contains ".git"
or URI Path contains "aws_credentials"
or URI Path contains "config"
or URI Path contains "constant"
or URI Path contains "wp-admin"
or URI Path contains "wp-login"
or URI Path contains "phpmyadmin"
or URI Path contains "backup"
or URI Path contains ".sql"

Action:

Block

These paths are sensitive-file or common vulnerability probes. Blocking them should not affect normal users, Googlebot, Bingbot, or AI crawlers accessing public pages.

### P1: security.txt

`https://gewuji.dev/.well-known/security.txt` has been added to the static site source. It should be reachable after the next deploy.

### P1: HSTS

Use Cloudflare:

SSL/TLS -> Edge Certificates -> HTTP Strict Transport Security

Initial settings:

- Enable HSTS: On
- Max Age: 1 month
- Include subdomains: Off
- Preload: Off
- No-Sniff Header: On

Keep subdomains and preload off at first to avoid breaking old pages or subdomain experiments.

### P2: Turnstile

Do not enable globally yet.

Add Turnstile later if Gewuji adds:

- contact form
- Supplier Reply submission
- file upload
- quote review request

### P2: AI Bot / Crawler Protection

Do not enable aggressive global bot blocking yet.

Gewuji currently depends on:

- Googlebot
- Bingbot
- GPTBot / AI search crawlers
- Perplexity / Claude / other AI discovery
- GEO / AI answer visibility

Block sensitive probe paths first. Avoid rules that challenge or block normal public-page crawling.
