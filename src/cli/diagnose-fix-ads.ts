/**
 * Diagnoses and fixes Week 1 ad WITH_ISSUES, verifies Week 2 delivery.
 *
 * Reads FACEBOOK_SYSTEM_USER_TOKEN (or FACEBOOK_PAGE_ACCESS_TOKEN) from env.
 * Intended to be run via: doppler run -- npx ts-node src/cli/diagnose-fix-ads.ts
 */

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const AD_ACCOUNT_ID = '2850682585083691';
const WEEK1_CAMPAIGN_ID = '120246582238410441';
const WEEK1_AD_ID = '120246582281050441';
const WEEK2_CAMPAIGN_ID = '120246582284510441';
const WEEK2_AD_ID = '120246582299210441';

function getToken(): string {
  const token =
    process.env['FACEBOOK_SYSTEM_USER_TOKEN'] ??
    process.env['FACEBOOK_PAGE_ACCESS_TOKEN'] ??
    process.env['FACEBOOK_PAGE_TOKEN'];
  if (!token) {
    throw new Error(
      'No Facebook token found. Set FACEBOOK_SYSTEM_USER_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN.'
    );
  }
  return token;
}

async function apiGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = getToken();
  const url = new URL(`${GRAPH_API_BASE}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json['error']) {
    throw new Error(`API GET ${path} failed: ${JSON.stringify(json['error'] ?? json)}`);
  }
  return json;
}

async function apiPost(path: string, body: Record<string, string>): Promise<unknown> {
  const token = getToken();
  const params = new URLSearchParams({ access_token: token, ...body });
  const res = await fetch(`${GRAPH_API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json['error']) {
    throw new Error(`API POST ${path} failed: ${JSON.stringify(json['error'] ?? json)}`);
  }
  return json;
}

interface AdInsights {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
}

interface AdIssue {
  error_code?: number;
  error_summary?: string;
  error_message?: string;
  error_type?: string;
}

interface AdData {
  id?: string;
  name?: string;
  status?: string;
  effective_status?: string;
  issues_info?: AdIssue[];
  recommendations?: unknown[];
  insights?: { data?: AdInsights[] };
}

interface AccountData {
  id?: string;
  name?: string;
  account_status?: number;
  disable_reason?: number;
  currency?: string;
  balance?: string;
  amount_spent?: string;
  spend_cap?: string;
}

async function diagnoseAd(adId: string, label: string): Promise<AdData> {
  console.log(`\n=== ${label} (Ad ${adId}) ===`);

  const fields = [
    'id', 'name', 'status', 'effective_status',
    'issues_info', 'recommendations',
    'insights{spend,impressions,reach,clicks}',
  ].join(',');

  let adData: AdData = {};
  try {
    adData = await apiGet(adId, { fields }) as AdData;
  } catch (err) {
    console.error(`  ERROR fetching ad: ${String(err)}`);
    return {};
  }

  console.log(`  Name:             ${adData.name}`);
  console.log(`  Status:           ${adData.status}`);
  console.log(`  Effective status: ${adData.effective_status}`);

  const insights = adData.insights?.data?.[0];
  console.log(`  Spend:            $${insights?.spend ?? '0.00'}`);
  console.log(`  Impressions:      ${insights?.impressions ?? '0'}`);
  console.log(`  Reach:            ${insights?.reach ?? '0'}`);
  console.log(`  Clicks:           ${insights?.clicks ?? '0'}`);

  if (adData.issues_info && adData.issues_info.length > 0) {
    console.log(`  Issues (${adData.issues_info.length}):`);
    for (const issue of adData.issues_info) {
      console.log(`    [${issue.error_code}] ${issue.error_summary}`);
      if (issue.error_message) console.log(`      Detail: ${issue.error_message}`);
      if (issue.error_type) console.log(`      Type: ${issue.error_type}`);
    }
  } else {
    console.log(`  Issues:           none`);
  }

  if (adData.recommendations && (adData.recommendations as unknown[]).length > 0) {
    console.log(`  Recommendations:  ${JSON.stringify(adData.recommendations, null, 2)}`);
  }

  return adData;
}

async function checkAdSet(adSetId: string, label: string): Promise<void> {
  console.log(`\n--- ${label} Ad Set (${adSetId}) ---`);
  try {
    const fields = 'id,name,status,effective_status,issues_info,daily_budget,end_time,targeting,bid_strategy,optimization_goal';
    const data = await apiGet(adSetId, { fields }) as Record<string, unknown>;
    console.log(`  Status: ${data['status']} / Effective: ${data['effective_status']}`);
    console.log(`  Daily budget: $${Number(data['daily_budget'] as string ?? 0) / 100}`);
    console.log(`  End time: ${data['end_time'] ?? 'not set'}`);
    console.log(`  Optimization: ${data['optimization_goal']}`);
    console.log(`  Bid strategy: ${data['bid_strategy']}`);
    const issues = data['issues_info'] as AdIssue[] | undefined;
    if (issues && issues.length > 0) {
      console.log(`  Ad Set Issues:`);
      for (const issue of issues) {
        console.log(`    [${issue.error_code}] ${issue.error_summary}: ${issue.error_message}`);
      }
    }
  } catch (err) {
    console.error(`  ERROR fetching ad set: ${String(err)}`);
  }
}

async function checkCampaign(campaignId: string, label: string): Promise<void> {
  console.log(`\n--- ${label} Campaign (${campaignId}) ---`);
  try {
    const fields = 'id,name,status,effective_status,objective,issues_info';
    const data = await apiGet(campaignId, { fields }) as Record<string, unknown>;
    console.log(`  Status: ${data['status']} / Effective: ${data['effective_status']}`);
    console.log(`  Objective: ${data['objective']}`);
    const issues = data['issues_info'] as AdIssue[] | undefined;
    if (issues && issues.length > 0) {
      for (const issue of issues) {
        console.log(`  Campaign Issue [${issue.error_code}]: ${issue.error_summary}`);
      }
    }
  } catch (err) {
    console.error(`  ERROR fetching campaign: ${String(err)}`);
  }
}

async function checkAdCreative(adId: string): Promise<void> {
  console.log(`\n--- Creative for ad ${adId} ---`);
  try {
    const data = await apiGet(adId, { fields: 'creative{id,name,status,object_story_id,object_story_spec}' }) as Record<string, unknown>;
    const creative = data['creative'] as Record<string, unknown> | undefined;
    if (!creative) {
      console.log('  No creative data returned');
      return;
    }
    console.log(`  Creative ID: ${creative['id']}`);
    console.log(`  Creative name: ${creative['name']}`);
    console.log(`  Creative status: ${creative['status']}`);
    if (creative['review_feedback_summary']) {
      console.log(`  Review feedback: ${JSON.stringify(creative['review_feedback_summary'], null, 2)}`);
    }
    if (creative['object_story_id']) {
      console.log(`  Post ID (story): ${creative['object_story_id']}`);
    }
  } catch (err) {
    console.error(`  ERROR fetching creative: ${String(err)}`);
  }
}

async function checkAdAccount(): Promise<void> {
  console.log(`\n=== Ad Account act_${AD_ACCOUNT_ID} ===`);
  try {
    const fields = 'id,name,account_status,disable_reason,currency,balance,amount_spent,spend_cap';
    const data = await apiGet(`act_${AD_ACCOUNT_ID}`, { fields }) as AccountData;
    const statusMap: Record<number, string> = {
      1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW',
      8: 'PENDING_SETTLEMENT', 9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE',
      101: 'CLOSED', 201: 'ANY_ACTIVE', 202: 'ANY_CLOSED',
    };
    const statusNum = data.account_status ?? -1;
    const statusLabel = statusMap[statusNum] ?? `UNKNOWN(${statusNum})`;
    console.log(`  Account name:   ${data.name}`);
    console.log(`  Status:         ${statusLabel}`);
    if (data.disable_reason != null && data.disable_reason !== 0) {
      console.log(`  Disable reason: ${data.disable_reason}`);
    }
    console.log(`  Currency:       ${data.currency}`);
    console.log(`  Balance:        $${(Number(data.balance ?? 0) / 100).toFixed(2)}`);
    console.log(`  Amount spent:   $${(Number(data.amount_spent ?? 0) / 100).toFixed(2)}`);
    if (data.spend_cap) {
      console.log(`  Spend cap:      $${(Number(data.spend_cap) / 100).toFixed(2)}`);
    }
  } catch (err) {
    console.error(`  ERROR fetching account: ${String(err)}`);
  }
}

async function tryFixWeek1Ad(adData: AdData): Promise<boolean> {
  const issues = adData.issues_info ?? [];
  const effectiveStatus = adData.effective_status ?? '';

  // Check if the issue is something we can fix automatically
  const hasCreativeIssue = issues.some(
    (i) => (i.error_code ?? 0) >= 1800000 && (i.error_code ?? 0) < 1900000
  );
  const hasBillingIssue = issues.some(
    (i) => (i.error_code ?? 0) >= 1200000 && (i.error_code ?? 0) < 1300000
  );
  const hasPolicyIssue = issues.some(
    (i) => String(i.error_type ?? '').toLowerCase().includes('policy') ||
           String(i.error_summary ?? '').toLowerCase().includes('policy')
  );

  if (hasCreativeIssue) {
    console.log('\n  >> Creative issue detected — cannot auto-fix. Human review required.');
    return false;
  }
  if (hasBillingIssue) {
    console.log('\n  >> Billing issue detected — check ad account payment method.');
    return false;
  }
  if (hasPolicyIssue) {
    console.log('\n  >> Policy violation detected — cannot auto-fix. Human review required.');
    return false;
  }

  // If ad is PAUSED and not ACTIVE, try to unpause it
  if (adData.status === 'PAUSED' || effectiveStatus === 'PAUSED' || effectiveStatus === 'WITH_ISSUES') {
    console.log('\n  >> Attempting to set ad status to ACTIVE...');
    try {
      const result = await apiPost(WEEK1_AD_ID, { status: 'ACTIVE' }) as Record<string, unknown>;
      console.log(`  >> Result: ${JSON.stringify(result)}`);
      return true;
    } catch (err) {
      console.error(`  >> Failed to unpause ad: ${String(err)}`);
      return false;
    }
  }

  console.log('\n  >> No auto-fixable issue pattern found. Manual review required.');
  return false;
}

async function getAdSetsForCampaign(campaignId: string): Promise<string[]> {
  try {
    const data = await apiGet(`${campaignId}/adsets`, { fields: 'id,name' }) as { data?: Array<{id: string}> };
    return (data.data ?? []).map((a) => a.id);
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('Meta Ads Diagnostic & Fix Report');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('========================================');

  // 1. Check ad account health
  await checkAdAccount();

  // 2. Week 1 - campaign, ad set, ad
  await checkCampaign(WEEK1_CAMPAIGN_ID, 'Week 1');
  const week1AdSets = await getAdSetsForCampaign(WEEK1_CAMPAIGN_ID);
  if (week1AdSets.length > 0) {
    await checkAdSet(week1AdSets[0], 'Week 1');
  }
  const week1AdData = await diagnoseAd(WEEK1_AD_ID, 'Week 1 Ad (WITH_ISSUES)');
  await checkAdCreative(WEEK1_AD_ID);

  // 3. Attempt fix on Week 1 ad
  console.log('\n=== Attempting Week 1 Fix ===');
  const week1Issues = week1AdData.issues_info ?? [];
  if (week1Issues.length === 0 && week1AdData.effective_status !== 'WITH_ISSUES') {
    console.log('  No issues found on Week 1 ad — no fix needed.');
  } else {
    const fixed = await tryFixWeek1Ad(week1AdData);
    if (fixed) {
      console.log('  >> Week 1 ad status set to ACTIVE. Verifying...');
      const verifyData = await diagnoseAd(WEEK1_AD_ID, 'Week 1 Ad (post-fix verification)');
      console.log(`  >> Post-fix effective_status: ${verifyData.effective_status}`);
    } else {
      console.log('  >> Auto-fix was NOT possible. Issues require manual intervention.');
    }
  }

  // 4. Week 2 - campaign, ad set, ad
  await checkCampaign(WEEK2_CAMPAIGN_ID, 'Week 2');
  const week2AdSets = await getAdSetsForCampaign(WEEK2_CAMPAIGN_ID);
  if (week2AdSets.length > 0) {
    await checkAdSet(week2AdSets[0], 'Week 2');
  }
  await diagnoseAd(WEEK2_AD_ID, 'Week 2 Ad (ACTIVE, $0 spend)');
  await checkAdCreative(WEEK2_AD_ID);

  console.log('\n========================================');
  console.log('Diagnostic complete.');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
