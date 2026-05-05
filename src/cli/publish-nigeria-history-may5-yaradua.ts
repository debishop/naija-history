import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { publishPost } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const POST_BODY = `🗓️ TODAY IN NIGERIAN HISTORY — May 5

Death of President Yar'Adua: The Constitutional Crisis That Shook Nigeria's Republic

On the morning of May 5, 2010, Nigeria woke to news that would stop the nation cold. President Umaru Musa Yar'Adua had died at the Aso Rock Presidential Villa in Abuja. He was 58 years old. With his passing, Nigeria lost its 13th president and made an unwanted entry into the history books: Yar'Adua became the first democratically elected Nigerian president to die in office.

The story of his final months was not simply one of a leader's failing health. It was a constitutional drama that gripped the country for nearly six months and exposed fractures running deep through Nigeria's political foundations.

Born on August 16, 1951, in Katsina to an elite Fulani family, Yar'Adua came from a line of political prominence. His older brother, Shehu Musa Yar'Adua, had served as Chief of Staff, Supreme Headquarters under military Head of State Olusegun Obasanjo. After earning his degree at Ahmadu Bello University, Umaru carved his own path as a teacher, businessman, and governor of Katsina State, serving two terms between 1999 and 2007. He arrived at the presidency in 2007 with an ambitious platform he called the Seven Point Agenda, covering power, transportation, food security, education, land reform, security, and wealth creation.

But within two years, his body was failing him. Yar'Adua had lived for years with kidney disease, a condition that had long predated his time in office. He also suffered from pericarditis, a serious inflammation of the sac surrounding the heart.

In November 2009, he flew to Saudi Arabia for urgent treatment. He left without formally notifying the National Assembly of his absence, as the constitution required. For weeks, then months, Nigeria had a president it could neither see nor hear from.

The Senate moved to fill the void on February 9, 2010. Senators invoked what they called the doctrine of necessity, a principle not found anywhere in the Nigerian constitution, to transfer executive powers to Vice President Goodluck Jonathan as Acting President. It was an extraordinary step, debated by Nigerian legal scholars to this day.

Yar'Adua returned to Abuja secretly on the night of February 24, 2010, slipping into the presidential villa under cover of darkness. He remained incapacitated and took no meaningful part in governance.

On May 5, 2010, he died.

The following morning, Goodluck Jonathan was sworn in as the substantive President of Nigeria, becoming the first president from the Niger Delta region.

His death did not pass without political consequence. Northern leaders had long relied on an informal power rotation agreement within the Peoples Democratic Party, which alternated the presidency between the north and south of the country. Yar'Adua had served only three years of what was meant to be eight years under the northern share of that power. His death meant the south would hold the presidency ahead of schedule, and the tension that followed shaped one of Nigeria's most bitterly contested election seasons in 2011.

Those who knew Yar'Adua described a deeply religious man of unusual personal humility for Nigerian politics. His administration made genuine progress on the amnesty programme in the Niger Delta. Yet the secrecy around his illness, the constitutional vacuum it created, and the unfulfilled promises of his Seven Point Agenda defined a complicated inheritance for the nation.

Fifteen years on, the questions his presidency raised about transparency, the limits of power, and the resilience of Nigeria's constitutional order remain as relevant as ever.

Nigeria remembers him today.

What do you believe is the most important lesson Yar'Adua's presidency left for Nigeria's political future?

📷 President Umaru Yar'Adua at the World Economic Forum Annual Meeting, Davos, 2008 (Andy Mettler / World Economic Forum, CC BY-SA 2.0): https://upload.wikimedia.org/wikipedia/commons/2/27/YarAdua_WEF_2008.jpg

#TodayInNigerianHistory #NigerianHistory #YarAdua #NigerianPresident #NigerianPolitics #May5 #Nigeria2010 #NigerianHeritage #Nigeria #AfricanHistory #NigeriaRemembers #GoodluckJonathan #PDP #Katsina #NigerianGovernance #ConstitutionalCrisis #SevenPointAgenda #NigerianRepublic #NigerDelta #AsoRock`;

const THEME = "Death of President Yar'Adua — Today in Nigerian History, May 5, 2010";

async function saveDraftPost(body: string): Promise<string> {
  const pool = getPool();
  interface CandidateRow { id: number }
  interface DraftRow { id: number }

  const candidateResult = await pool.query<CandidateRow>(
    `INSERT INTO story_candidates
       (source_url, source_domain, source_name, title, summary, raw_content, content_hash, published_at, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, md5($6), NULL, NOW())
     ON CONFLICT (content_hash) DO UPDATE SET fetched_at = story_candidates.fetched_at
     RETURNING id`,
    [
      `direct://yaradua-death-may5-2010`,
      'direct',
      `Direct — ${THEME}`,
      `Today in Nigerian History — May 5: Death of President Yar'Adua`,
      body.slice(0, 500),
      body,
    ]
  );
  const storyId = candidateResult.rows[0].id;

  const existing = await pool.query<DraftRow>(
    `SELECT id FROM draft_posts WHERE story_candidate_id = $1 ORDER BY id DESC LIMIT 1`,
    [storyId]
  );
  if (existing.rows.length > 0) {
    return String(existing.rows[0].id);
  }

  const draftResult = await pool.query<DraftRow>(
    `INSERT INTO draft_posts
       (story_candidate_id, body, source_citation, source_url, source_name, hashtags, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'approved')
     RETURNING id`,
    [storyId, body, `Today in Nigerian History — May 5`, '', `Direct — ${THEME}`, body.match(/#\w+/g) ?? []]
  );
  return String(draftResult.rows[0].id);
}

async function markDraftPublished(draftId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE draft_posts SET status = 'published', updated_at = NOW() WHERE id = $1`,
    [Number(draftId)]
  );
}

async function writePostRecord(draftId: string, facebookPostId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO post_records (draft_post_id, facebook_post_id, status)
     VALUES ($1, $2, 'published')`,
    [Number(draftId), facebookPostId]
  );
}

async function getExistingPostRecord(draftId: string): Promise<string | null> {
  const pool = getPool();
  interface RecordRow { facebook_post_id: string }
  const result = await pool.query<RecordRow>(
    `SELECT facebook_post_id FROM post_records WHERE draft_post_id = $1 AND status = 'published' LIMIT 1`,
    [Number(draftId)]
  );
  return result.rows[0]?.facebook_post_id ?? null;
}

async function main(): Promise<void> {
  initSecrets();

  const draftId = await saveDraftPost(POST_BODY);
  console.log(`Draft saved as ID ${draftId}`);

  const existingPostId = await getExistingPostRecord(draftId);
  if (existingPostId) {
    const facebookPostUrl = `https://www.facebook.com/${existingPostId}`;
    console.log(`Already published: ${facebookPostUrl}`);
    await notifySlack({ event: 'published', facebookPostUrl, excerpt: POST_BODY.slice(0, 200) });
    return;
  }

  const draft = {
    id: draftId,
    storyCandidateId: '0',
    body: POST_BODY,
    hashtags: (POST_BODY.match(/#\w+/g) ?? []).map((h) => h.slice(1)),
    sourceUrl: '',
    sourceName: `Direct — ${THEME}`,
    generatedAt: new Date(),
    status: 'approved' as const,
  };

  const facebookPostId = await publishPost(draft);
  console.log('Published text post.');

  await markDraftPublished(draftId);
  await writePostRecord(draftId, facebookPostId);

  const facebookPostUrl = `https://www.facebook.com/${facebookPostId}`;
  console.log(`Published: ${facebookPostUrl}`);

  await notifySlack({
    event: 'published',
    facebookPostUrl,
    excerpt: POST_BODY.slice(0, 200),
  });
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  })
  .finally(() => closePool());
