# Site Security Audit

## Overall Decision

Needs Minor Revision

The main public deployment does not currently include the checked sensitive files. The only local env file found is `.env.local`, which is ignored and not tracked. A deployable `security.txt` was missing and has now been added.

## Sensitive File Scan

| Item | Exists locally | Tracked by git | Publicly deployable | Risk | Recommendation |
|---|---:|---:|---:|---|---|
| `.env` | No | No | No | Low | Keep ignored. |
| `.env.production` | No | No | No | Low | Keep ignored. |
| `.env.local` | Yes | No | No | Medium local-only | Keep ignored. Do not commit. |
| `.env.example` | Yes | Yes | No | Low | Acceptable as empty template. Do not put real values in it. |
| `aws_credentials.ini` | No | No | No | Low | Add to ignore list in a later scoped change. |
| `.git` | Yes | No | No | Low locally, P0 if public | Never deploy `.git`. WAF should block `.git` probes. |
| `config/constants.js` | No | No | No | Low | Add to ignore only if it will contain secrets. |
| `admin/constant.js` | No | No | No | Low | Add to ignore only if it will contain secrets. |
| `credentials` / `secret` / `secrets` / `private_key` / `access_key` / `api_key` / `apikey` / `token` / `password` | No exact sensitive files found | No | No | Low | Continue scanning before commits. |

## Public Deployment Risk

The current `dist` directory does not contain `.env`, `.env.production`, `.env.local`, `.env.example`, `aws_credentials.ini`, `.git`, `config/constants.js`, `admin/constant.js`, `secrets.json`, or `private.key`.

`scripts/build-static-site.mjs` loads `.env.local` and `.env` for build-time variables, but does not copy them into `dist`.

## Git Tracking Risk

No checked sensitive files are tracked by Git.

Tracked files containing words such as token or secret are documentation, workflow variable names, or frontend form labels. No literal secret value was identified in this pass.

## Security.txt Status

Added:

`.well-known/security.txt`

Canonical URL:

`https://gewuji.dev/.well-known/security.txt`

The static build copy list was updated so `.well-known/security.txt` can be deployed.

## Cloudflare WAF Recommendations

Add a WAF custom rule to block common sensitive-file and legacy CMS probes:

- `.env`
- `.git`
- `aws_credentials`
- `config`
- `constant`
- `wp-admin`
- `wp-login`
- `phpmyadmin`
- `backup`
- `.sql`

Action: Block.

This should not affect SEO, GEO, or AI crawler access to normal public pages.

## HSTS Recommendation

Enable HSTS cautiously in Cloudflare:

- Enable HSTS: On
- Max Age: 1 month
- Include subdomains: Off
- Preload: Off
- No-Sniff Header: On

Avoid include-subdomains and preload until subdomains and legacy paths are confirmed stable.

## Turnstile Recommendation

Do not enable Turnstile globally now.

Add it only when the site has real submission surfaces such as contact forms, Supplier Reply submissions, file uploads, or quote review requests.

## AI Crawler Recommendation

Do not enable aggressive global AI bot or crawler blocking.

Gewuji depends on Google, Bing, AI search, and GEO discovery. Prefer targeted WAF blocking for sensitive-path probes.

## P0 Issues

No local P0 sensitive-file exposure found.

Recommended P0 Cloudflare rule: block sensitive file probes.

## P1 Issues

- `security.txt` was missing before this task.
- HSTS is worth enabling with conservative settings.

## P2 Issues

- Turnstile can wait until user-submitted forms exist.
- AI crawler protection should remain non-aggressive unless bot abuse targets public pages at scale.

## Next Suggested Actions

1. Deploy `.well-known/security.txt`.
2. Add the Cloudflare WAF sensitive-probe block rule.
3. Enable conservative HSTS after confirming all HTTPS routes and subdomains are stable.
4. Later, do a scoped `.gitignore` hardening commit for `aws_credentials.ini` if desired.
