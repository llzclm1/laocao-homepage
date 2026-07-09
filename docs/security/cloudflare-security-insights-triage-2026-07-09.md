# Cloudflare Security Insights Triage

This note records Cloudflare Security Insights findings and turns them into a practical triage list. It is not an instruction to change DNS, WAF, account settings, or HSTS from this website repo.

## Current Findings

Based on the Cloudflare Security Insights screenshot, the findings include:

- Security.txt not configured
- Always Use HTTPS not enabled
- Missing HSTS
- Missing TLS encrypted domains
- DMARC record errors
- `api.gewuji.dev` has DNS / dangling A record related warnings
- Turnstile not enabled
- User without MFA

## Priority

P0:

- Confirm whether `https://gewuji.dev/.well-known/security.txt` is live.
- Remove unused `api.gewuji.dev` DNS record if it is not used.
- Enable MFA for Cloudflare account.

P1:

- Enable Always Use HTTPS.
- Confirm `www.gewuji.dev` redirects or resolves correctly.
- Add WAF rules for sensitive path probes.

P2:

- Configure SPF / DKIM / DMARC only if `@gewuji.dev` will be used for sending email.
- Consider Turnstile only when there is a form.
- Consider HSTS only after HTTPS and redirects are confirmed stable.

P3:

- HSTS preload.
- Advanced bot management.
- Full email security hardening.

## Recommended Handling

- Do not enable HSTS preload immediately.
- Do not block all bots.
- Do not block legitimate search or AI crawlers.
- Do not treat every Cloudflare insight as urgent.
- Do not make DNS changes from code repo.

## Manual Checklist

1. Open `https://gewuji.dev/.well-known/security.txt`.
2. Check DNS records for `api.gewuji.dev`.
3. Enable MFA on Cloudflare account.
4. Enable Always Use HTTPS.
5. Check `https://www.gewuji.dev`.
6. Decide whether `@gewuji.dev` email will be used.
7. Delay HSTS until HTTPS setup is stable.

## Notes

This document is only a triage note. DNS, Cloudflare account security, WAF, and HSTS should be changed manually in Cloudflare, not through the website repo.
