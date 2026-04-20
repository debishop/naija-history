# Pipeline Architecture

This document explains the design of the Nigeria History Pipeline — what each component does, why it exists, and the trade-offs accepted.

---

## High-level flow

```
GitHub Actions (cron)
  └── pipeline.yml (daily at 08:00 UTC)
        1. Fetch story candidates from Wikipedia/web  → store in story_candidates
        2. Generate Facebook post draft via Claude     → store in draft_posts
        3. Notify #review channel via Slack webhook

Slack (#review)
  └── Board member clicks Approve or Reject

Approve path:
  Slack → Supabase Edge Function (slack-interaction)
        → GitHub API (workflow_dispatch publish-approved.yml)
        → GitHub Actions (publish-approved.yml)
              → Publish post via Facebook Graph API   → store in post_records

Reject path:
  Slack → Supabase Edge Function (slack-interaction)
        → Supabase DB: draft_posts.status = 'rejected'

GitHub Actions (every 6 hours)
  └── snapshot.yml
        → Fetch engagement metrics from Facebook      → store in engagement_records
        → Warn via Slack if Facebook token is expiring
```

---

## Why each hop exists

### 1. GitHub Actions as the scheduler and runner

**Why not a VPS or cron server?**  
No infrastructure to maintain. GitHub Actions provides compute, scheduling, secret injection, and a full audit log of every run at zero marginal cost for a low-frequency pipeline. The daily run is a single job taking ~2 minutes.

**Why workflow_dispatch on `publish-approved.yml`?**  
The approval happens asynchronously in Slack. The cleanest way to re-enter GitHub Actions from an external trigger is `workflow_dispatch`. It gives us a proper run log, retry semantics, and keeps publishing logic inside the same codebase as the rest of the pipeline.

### 2. Supabase as the database and edge-function host

**Why Supabase and not a plain Postgres instance?**  
Free tier, managed Postgres, and built-in edge function hosting in one product. The pipeline needs a persistent store for drafts and post records, and a publicly-reachable HTTPS endpoint for the Slack interaction webhook. Supabase provides both without managing infrastructure.

**Why an edge function for the Slack webhook?**  
The Slack Interactivity Request URL must be a public HTTPS endpoint that responds within 3 seconds. Supabase edge functions (Deno) are globally deployed and cold-start in ~50ms — well within the budget. The alternative (a separate Lambda or Cloud Run service) adds infra complexity for a function that runs only when someone clicks a button.

### 3. Doppler for secrets management

**Why not plain GitHub Secrets?**  
GitHub Secrets are repo-scoped and unaudited. Rotating a secret requires manual updates in multiple places (GitHub, Supabase, local `.env`). Doppler provides a single source of truth: one rotation in Doppler propagates to GitHub Actions (via CLI), the edge function (via API at cold-start), and local dev (via `doppler run --`). It also provides an audit trail for every secret access.

**Secret topology:**
- Doppler holds all secrets.
- GitHub Actions stores only `DOPPLER_TOKEN`. The Doppler CLI (`doppler run --`) injects all other secrets as env vars at runtime.
- Supabase edge function stores only `DOPPLER_TOKEN`. The function calls the Doppler REST API on cold-start and caches secrets for the lifetime of the instance.
- Local dev uses `doppler run -- npm run <script>` — no `.env` file required.

### 4. Slack for the human approval gate

**Why Slack and not an email or web UI?**  
The board already uses Slack. Interactive message buttons are low-friction — one click to approve or reject, no separate login required. Slack's Interactivity API (button payloads) is well-documented and reliable.

**Why not skip the approval gate entirely?**  
The pipeline uses AI-generated content that will be published under the company's Facebook page. Human review for the first ~20 posts is a safeguard against hallucinations or off-brand content. After `APPROVAL_THRESHOLD` clean posts, the gate auto-disables and the pipeline goes fully autonomous.

### 5. Facebook Graph API for publishing

**Why not Buffer, Hootsuite, or a scheduling tool?**  
Direct API access gives the pipeline full control over post timing, metadata, and error handling. Third-party scheduling tools add cost, a login dependency, and a moving target for API compatibility.

**Token expiry risk:** Long-lived page access tokens expire after ~60 days. The `snapshot.yml` workflow warns via Slack when the token is older than 50 days (`FACEBOOK_TOKEN_CREATED_AT`). Rotation requires a manual step (generate new token in Facebook Developer Console, update in Doppler).

---

## Failure modes and recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| GitHub Actions run fails | Actions UI + email | Re-run workflow manually |
| Claude API error during generation | Error logged in Actions run | Re-run; story candidate is not consumed |
| Slack notification not received | Check Actions run log | Verify `SLACK_WEBHOOK_URL` in Doppler |
| Edge function returns 503 (Doppler unreachable) | Slack shows error on button click | Retry; Doppler SLA is 99.9% |
| GitHub API workflow dispatch fails | Edge function logs error to Slack | Check `GITHUB_TOKEN` scopes and expiry |
| Facebook publish fails | Error logged in Actions run, Slack notification | Retry; check `FACEBOOK_PAGE_ACCESS_TOKEN` |
| Facebook token expired | Slack warning from snapshot.yml | Rotate token in Facebook Dev Console, update in Doppler |

---

## Revisit criteria

This architecture was chosen for minimal operational overhead at launch. Revisit if:

- **Volume scales**: daily cron + on-demand publish is fine up to ~100 posts/day. Beyond that, consider a queue (e.g. BullMQ or Supabase pg_cron) to decouple generation from publishing.
- **Doppler cold-start latency becomes a problem**: if Slack 3-second timeout is hit, switch to the push-secrets model (`doppler run -- supabase secrets set`) at deploy time instead of pulling at runtime.
- **Multi-region is needed**: Supabase edge functions run globally; GitHub Actions is US-based. For latency-sensitive publishing, move scheduling to Supabase pg_cron.
- **Audit or compliance requirements**: add structured logging (e.g. ship GitHub Actions logs to a SIEM) and store approval decisions with user identity in `draft_posts`.
