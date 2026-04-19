# Nigerian History Pipeline — Operations Runbook

---

## Normal Operations

**The pipeline runs fully automatically. No human trigger is needed for standard daily operation.**

| What happens | When | Who |
|---|---|---|
| Story fetched, draft generated, approval gate checked | Daily at 08:00 UTC | GitHub Actions (automatic) |
| Slack notification with full post content + approve link | On each run while gate is active (first 20 posts) | Reviewer reads and clicks approve |
| Slack notification: post published | After approval or gate disables | Informational only |
| Engagement snapshot collected | ~48h after publish | GitHub Actions (automatic) |
| Slack warning: token approaching expiry | When FB token > 50 days old | Reviewer rotates token before day 60 |

**Reviewers only need to:**
1. Watch Slack for approval notifications
2. Click the workflow link in the notification and enter the draft ID to approve
3. After 20 clean posts, the gate turns off — no further action needed

---

## First-Time Setup

Complete once per deployment. Human must do these steps.

### 1. Database (Supabase)

- [ ] Create a free project at [supabase.com](https://supabase.com)
- [ ] Copy the `postgres://` connection string from Project → Settings → Database
- [ ] Run migrations locally against the new DB:
  ```bash
  DATABASE_URL="<supabase-connection-string>" npm run db:migrate
  ```
- [ ] Confirm tables exist:
  ```bash
  psql "$DATABASE_URL" -c '\dt'
  ```
  Expected: `story_candidates`, `draft_posts`, `post_records`, `engagement_records`

### 2. GitHub Secrets

In the GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `DATABASE_URL` | Supabase connection string |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Long-lived page access token (60-day expiry) |
| `FACEBOOK_PAGE_ID` | `61577657207009` |
| `SLACK_WEBHOOK_URL` | Incoming webhook URL (see step 3) |
| `GITHUB_WORKFLOW_URL` | Full URL to the `publish-approved.yml` workflow: `https://github.com/<owner>/<repo>/actions/workflows/publish-approved.yml` |

### 3. GitHub Variables

In the GitHub repo → Settings → Secrets and variables → Actions → Variables, add:

| Variable | Value |
|---|---|
| `APPROVAL_THRESHOLD` | `20` (or lower for testing) |
| `FACEBOOK_TOKEN_CREATED_AT` | Today's date in ISO format, e.g. `2026-04-19` |

### 4. Slack Incoming Webhook

- [ ] Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
- [ ] Enable Incoming Webhooks → Add New Webhook to Workspace → pick your channel
- [ ] Copy the webhook URL → add as `SLACK_WEBHOOK_URL` GitHub Secret

### 5. Enable workflows

- [ ] Push the repo to GitHub (workflows are in `.github/workflows/`)
- [ ] Go to Actions tab → confirm all three workflows are listed:
  - Daily Pipeline
  - Publish Approved Post
  - Engagement Snapshot

### 6. Test run (manual dispatch)

- [ ] Go to Actions → Daily Pipeline → Run workflow
- [ ] Watch Slack for the `run_start` notification
- [ ] Confirm `approval_required` notification arrives with post content

---

## First Live Post (One-Time Manual Run)

The board approved one manual human-in-the-loop run to verify secrets and sanity-check the first production post before automation takes over.

**CEO or CTO does this:**

```bash
# Clone repo and set env
git clone <repo-url>
cd nigeria-history-pipeline
cp .env.example .env
# Populate all values in .env

# Fetch the first story
npm run cli:fetch-story -- --url "https://archivi.ng/the-nok-terracotta-culture-nigerias-oldest-art/"

# Generate the draft (use the story ID printed above)
npm run cli:generate-post -- --storyId <STORY_ID>

# Read the draft carefully
psql "$DATABASE_URL" -c "SELECT id, body FROM draft_posts ORDER BY id DESC LIMIT 1;"
```

If the content looks good:

```bash
# Approve and publish
psql "$DATABASE_URL" -c "UPDATE draft_posts SET status='approved' WHERE id=<DRAFT_ID>;"
npm run cli:publish-post -- --draftId <DRAFT_ID>

# Confirm post appears live
# Open: https://www.facebook.com/61577657207009
```

After ~48 hours:

```bash
# Capture engagement snapshot
npm run cli:snapshot-engagement -- --postRecordId <POST_RECORD_ID>
```

Once this first post is confirmed live and engagement snapshot works, the autonomous schedule takes over.

---

## Facebook Token Rotation (Do Before Day 60)

Long-lived page tokens expire after 60 days. The pipeline sends a Slack warning when the token is >50 days old.

```bash
# Generate a new long-lived token (requires app credentials)
curl "https://graph.facebook.com/v19.0/oauth/access_token?\
  grant_type=fb_exchange_token&\
  client_id=<APP_ID>&\
  client_secret=$FACEBOOK_APP_SECRET&\
  fb_exchange_token=<SHORT_LIVED_TOKEN>"
```

- [ ] Update `FACEBOOK_PAGE_ACCESS_TOKEN` GitHub Secret with the new token
- [ ] Update `FACEBOOK_TOKEN_CREATED_AT` GitHub Variable to today's date

---

## Break-Glass: Emergency Manual Operations

Use these only if the automated workflows fail and you need to manually intervene.

### Manually re-run the pipeline

```bash
export $(cat .env | xargs)
npm run cli:run-pipeline
```

### Manually approve a pending draft

```bash
DRAFT_ID=<id> npm run cli:approve-post
```

Or via psql + publish:

```bash
psql "$DATABASE_URL" -c "UPDATE draft_posts SET status='approved' WHERE id=<DRAFT_ID>;"
npm run cli:publish-post -- --draftId <DRAFT_ID>
```

### Manually run snapshot check

```bash
npm run cli:check-snapshots
```

### Rollback: Delete a Bad Publish

**1. Get the Facebook post ID:**
```bash
psql "$DATABASE_URL" -c "SELECT facebook_post_id FROM post_records WHERE id=<POST_RECORD_ID>;"
```

**2. Delete via Graph API:**
```bash
curl -X DELETE \
  "https://graph.facebook.com/v19.0/<FACEBOOK_POST_ID>" \
  -d "access_token=$FACEBOOK_PAGE_ACCESS_TOKEN"
```

Expected response: `{"success": true}`

**3. Mark the record in the DB:**
```bash
psql "$DATABASE_URL" -c "UPDATE post_records SET status='failed', error_message='Manually deleted after publish' WHERE id=<POST_RECORD_ID>;"
psql "$DATABASE_URL" -c "UPDATE draft_posts SET status='rejected' WHERE id=<DRAFT_POST_ID>;"
```

**4. Verify deletion:** reload the Facebook Page — post should not appear.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Domain not whitelisted` | Article URL domain not in `config/whitelist.json` | Add domain and re-run |
| `Required secret "X" is not set` | Missing env var or GitHub Secret | Add the missing secret and re-run workflow |
| `All N seed URLs have already been fetched` | Seed list exhausted | Add new article URLs to `config/article-seeds.json` and push |
| `DraftPost X has status "draft"` | Forgot to approve draft | Run `DRAFT_ID=<id> npm run cli:approve-post` |
| `Facebook Graph API error (HTTP 400)` | Token expired or missing permissions | Rotate `FACEBOOK_PAGE_ACCESS_TOKEN` (see token rotation above) |
| `Facebook Graph API error (HTTP 429)` | Rate limited | Wait 15 minutes — publisher retries automatically up to 3 times |
| `PostRecord X has no facebook_post_id` | Post failed to publish | Check `post_records.error_message`; fix root cause and re-run |
| Claude returns empty response | API quota or network issue | Check `ANTHROPIC_API_KEY` validity; retry |
| Slack notifications not arriving | Missing webhook | Verify `SLACK_WEBHOOK_URL` GitHub Secret is correct |
