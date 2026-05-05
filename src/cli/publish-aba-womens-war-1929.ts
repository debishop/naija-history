import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { uploadPagePhoto, publishPostWithPhoto } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/e/eb/End_of_Aba_women_riot.jpg';
const IMAGE_CAPTION = 'A sculpture at the University of Uyo, Nigeria, honouring the women who stood against British colonial rule in 1929. Credit: Harriwillz via Wikimedia Commons, CC BY-SA 4.0.';

const POST_BODY = `November 18, 1929. A census agent knocks on a door in Oloko. Within days, tens of thousands of women are on the march.

It began with one woman saying no.

Her name was Nwanyeruwa. On November 18, 1929, a colonial census agent named Mark Emereuwa arrived at her compound in Oloko, in what is now Abia State. He was counting people, livestock, and property as a preliminary step toward extending British taxation to women. Nwanyeruwa had heard the rumours about what the census truly meant, and she refused to cooperate. Her defiance in that single moment became the spark for the largest organised protest led by women in West African colonial history. (Wikipedia, Women's War; Van Allen, 1972)

What happened next would shake colonial Nigeria to its foundations.

Three women from Oloko, Ikonnia, Nwannedia, and Nwugo, today known as the Oloko Trio, helped organise and lead the response. The women of Oloko sent palm leaves from village to village, an ancient Igbo signal calling women to assemble in protest. The message needed no translation. Across the Owerri and Calabar Provinces, women recognised the leaves and began to gather. (Wikipedia, Women's War)

Within days, the movement had grown beyond anything the colonial administration could have imagined. It spread across 6,000 square miles, drawing approximately 10,000 women from six ethnic groups: Igbo, Ibibio, Andoni, Ogoni, Efik, and Ijaw. This was the Women's War, known in Igbo as Ogu Umunwanyi and in Ibibio as Ekong Iban. (Falola, 2008; Wikipedia, Women's War)

This was not a riot. It was organised resistance rooted in tradition.

The primary form of protest was known as "sitting on a man," an ancient Igbo method of public accountability. Women gathered outside a warrant chief's compound and sang songs describing his offences. They danced through the night, wearing ferns and painting their faces. They did not stop until justice was demanded and heard. (Van Allen, 1972)

The British colonial government responded with force. By late December 1929, ten native courts had been destroyed and several European factories looted. Colonial troops opened fire on the women. Approximately 55 women were killed. (Falola, 2008; Wikipedia, Women's War)

But the women did not stop. They persisted.

By 1930, the colonial administration had abolished the warrant chief system entirely, the very system the women had risen against. For the first time, women were appointed to the Native Court system. Plans to extend taxation to women were permanently abandoned. (Afigbo, 1967; Wikipedia, Women's War)

The women won.

Scholars describe the Women's War as the first major protest of its kind led by women in West Africa, and as a direct precursor to the Nigerian nationalist movements of the 1940s and 1950s that eventually led to independence in 1960. (Falola, 2008)

Today, a sculpture at the University of Uyo stands in their honour, a permanent reminder that it was ordinary women, with palm leaves and painted faces and unstoppable determination, who forced a colonial empire to back down.

They were not politicians. They held no official title or colonial authority. But when the British assumed they could simply count them, tax them, and move on, they found out what those women were truly made of.

Watch: The Women Who Took on the British Empire and Won | Aba Women's War 1929
https://www.youtube.com/watch?v=HwmNyDHac2M

Photo: A sculpture at the University of Uyo, Nigeria, honouring the women who stood against British colonial rule in 1929. Credit: Harriwillz via Wikimedia Commons, CC BY SA 4.0.

What do you think? Should Nigeria establish a national day to honour the women of the Aba Women's War of 1929? Let us know in the comments below.

#AbaWomensWar #WomensWar1929 #OguUmunwanyi #NigerianHistory #NigerianWomen #IgboHistory #ColonialHistory #AfricanHistory #Nigeria #NigerianHeritage #WestAfrica #AfricanWomen #WomenEmpowerment #BritishColonialism #TodayInNigerianHistory`;

const THEME = "Aba Women's War of 1929 — Nigerian History";

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
      `direct://aba-womens-war-1929`,
      'direct',
      `Direct — ${THEME}`,
      `Aba Women's War of 1929 — Nigerian History`,
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
    [storyId, body, `Aba Women's War of 1929 — Nigerian History`, '', `Direct — ${THEME}`, body.match(/#\w+/g) ?? []]
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

  console.log('Uploading photo to Facebook...');
  const photoId = await uploadPagePhoto(IMAGE_URL, IMAGE_CAPTION);
  console.log(`Photo uploaded with ID: ${photoId}`);

  const facebookPostId = await publishPostWithPhoto(draft, photoId);
  console.log('Published post with photo.');

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
