# First-Slice Live Run Runbook

Manual runbook for executing the first live end-to-end run of the Nigerian history content pipeline. Follow each section in order.

---

## Pre-flight Checklist

Complete all items before executing any pipeline command.

### Secrets

- [ ] `DATABASE_URL` is set in your environment and points to the production (or staging) PostgreSQL instance
- [ ] `ANTHROPIC_API_KEY` is set and valid (test: `curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}'`)
- [ ] `FACEBOOK_PAGE_ACCESS_TOKEN` is set (a long-lived Page access token for the Lens page, ID `61577657207009`)
- [ ] `FACEBOOK_APP_SECRET` is set

### Database

- [ ] Database is reachable: `psql "$DATABASE_URL" -c '\dt'`
- [ ] Migrations are applied: `npm run db:migrate`
- [ ] Confirm tables exist: `story_candidates`, `draft_posts`, `post_records`, `engagement_records`

### Credentials rotation

- [ ] Facebook Page access token rotated within the last 30 days (see THEAAA-5)
- [ ] Token has `pages_manage_posts` and `pages_read_engagement` permissions

### Whitelist

- [ ] Confirm target article URL is in `config/whitelist.json` (check domain matches exactly)

### Dry run

- [ ] Integration test suite passes: `npm test`

---

## Step-by-Step Pipeline Commands

### Step 1 — Fetch a story

```bash
npm run cli:fetch-story -- --url "<ARTICLE_URL>"
```

**What to check:**
- Command prints the story ID (e.g. `Story saved: id=42`)
- Row appears in `story_candidates`: `psql "$DATABASE_URL" -c "SELECT id, title, source_name FROM story_candidates ORDER BY id DESC LIMIT 1;"`
- Title and source name look correct

**Example URL (whitelisted):**
```
https://reuters.com/world/africa/<article-slug>
```

---

### Step 2 — Generate a draft post

```bash
npm run cli:generate-post -- --storyId <STORY_ID>
```

**What to check:**
- Command prints the draft post ID (e.g. `Draft saved: id=7, status=draft`)
- Row in `draft_posts`: `psql "$DATABASE_URL" -c "SELECT id, status, source_name, body FROM draft_posts ORDER BY id DESC LIMIT 1;"`
- Body contains `📚 Source:` with the correct source name and URL
- Body contains `#NigerianHistory` and `#Africa`
- Tone and factual content look accurate — **read the full post before proceeding**

> **STOP HERE.** Review the draft post body carefully. Do not proceed to publish until the content is approved.

To approve the draft for publishing:
```bash
psql "$DATABASE_URL" -c "UPDATE draft_posts SET status='approved' WHERE id=<DRAFT_ID>;"
```

---

### Step 3 — Publish to Facebook

```bash
npm run cli:publish-post -- --draftId <DRAFT_ID>
```

**What to check:**
- Command prints the Facebook post ID (e.g. `Published: facebookPostId=61577657207009_987654321`)
- `post_records` table has a new row with `status='published'`
- `draft_posts` row updated to `status='published'`
- Verify post appears on the Facebook Page: open https://www.facebook.com/61577657207009 in a browser

```bash
psql "$DATABASE_URL" -c "SELECT id, facebook_post_id, status FROM post_records ORDER BY id DESC LIMIT 1;"
```

---

### Step 4 — Snapshot engagement (run after ~48 hours)

After 48 hours, run:

```bash
npm run cli:snapshot-engagement -- --postRecordId <POST_RECORD_ID>
```

**What to check:**
- Command prints the engagement record (reactions, comments, shares, reach)
- `engagement_records` table has the new snapshot:
  ```bash
  psql "$DATABASE_URL" -c "SELECT * FROM engagement_records ORDER BY id DESC LIMIT 1;"
  ```
- Metrics are non-zero for a healthy post

---

## Rollback: Deleting a Bad Publish

If a post needs to be removed from Facebook after publishing:

### 1. Get the Facebook post ID

```bash
psql "$DATABASE_URL" -c "SELECT facebook_post_id FROM post_records WHERE id=<POST_RECORD_ID>;"
```

### 2. Delete via Graph API

```bash
curl -X DELETE \
  "https://graph.facebook.com/v19.0/<FACEBOOK_POST_ID>" \
  -d "access_token=$FACEBOOK_PAGE_ACCESS_TOKEN"
```

Expected response: `{"success": true}`

### 3. Mark the record as failed in the DB

```bash
psql "$DATABASE_URL" -c "UPDATE post_records SET status='failed', error_message='Manually deleted after publish' WHERE id=<POST_RECORD_ID>;"
psql "$DATABASE_URL" -c "UPDATE draft_posts SET status='rejected' WHERE id=<DRAFT_POST_ID>;"
```

### 4. Verify deletion

- Reload the Facebook Page — post should no longer appear
- If the delete returns an error (permission issue), escalate to the Page admin to remove manually via the Facebook interface

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Domain not whitelisted` | Article URL domain not in `config/whitelist.json` | Add domain and restart, or use a different article |
| `Required secret "X" is not set` | Missing env var | Set the missing env var and retry |
| `DraftPost X has status "draft"` | Forgot to approve draft | Run the `UPDATE draft_posts SET status='approved'` query above |
| `Facebook Graph API error (HTTP 400)` | Token expired or missing permissions | Rotate `FACEBOOK_PAGE_ACCESS_TOKEN` (see THEAAA-5) |
| `Facebook Graph API error (HTTP 429)` | Rate limited | Wait 15 minutes and retry; publisher retries automatically up to 3 times |
| `PostRecord X has no facebook_post_id` | Post failed to publish | Check `post_records.error_message`; fix the root cause and republish |
| Claude returns empty response | API quota or network issue | Check `ANTHROPIC_API_KEY` validity and retry |
