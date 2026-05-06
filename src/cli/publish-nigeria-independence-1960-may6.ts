import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { uploadPagePhoto, publishPostWithPhoto } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/0/03/Jaja-Wachuku%2C_Abubakar_Tafawa_Balewa_and_Princess_Alexandra_of_Kent_on_Nigeria%27s_Independence_Day_October_1%2C_1960.jpg';
const IMAGE_CAPTION = 'Jaja Wachuku, Prime Minister Abubakar Tafawa Balewa, and Princess Alexandra of Kent on Nigeria Independence Day, October 1, 1960. Photo: Mark Kauffman/LIFE Magazine.';

const POST_BODY = `Just after midnight on October 1, 1960, silence fell across Lagos Race Course. Between thirty thousand and forty thousand Nigerians had gathered in the warm night air, standing shoulder to shoulder, dressed in their finest, waiting for a moment that many had spent their entire lives imagining. Their eyes were fixed on a flagpole where the British Union Jack had flown for decades, representing a power that had long controlled their land, their resources, and their future. Then, slowly, the flag came down. And as it descended, the green, white, green flag of an independent Nigeria rose in its place. The crowd met the moment with composed solemnity, polite applause greeting the rising flag. A nation was born.

That night, Prime Minister Sir Abubakar Tafawa Balewa stood before his people and spoke words that continue to echo across generations:

"Today is Independence Day. The first of October 1960 is a date to which for two years every Nigerian has been eagerly looking forward. At last, our great day has arrived, and Nigeria is now indeed an independent sovereign nation."

Source: BlackPast.org, 1960 Independence Day Speech of Sir Abubakar Tafawa Balewa

The moment was more than symbolic. It was the culmination of years of agitation, negotiation, and sacrifice by Nigerians who refused to accept that their destiny belonged in foreign hands. The Union Jack did not come down on its own. It came down because Nigerians organized, demanded, and earned their place as a free people.

Princess Alexandra of Kent stood at the ceremony that night, representing Queen Elizabeth II, a recognition of the gravity of what was unfolding on the world stage. The eyes of the international community were fixed on Nigeria, and Nigeria met the moment with composure and pride. Source: Wikipedia, Independence Day (Nigeria)

Tafawa Balewa, the teacher from Bauchi who became the voice of a nation, was named Nigeria's first Prime Minister. Beside him stood Dr. Nnamdi Azikiwe, who served as the first native Governor General of Nigeria. Three years later, on October 1, 1963, when Nigeria became a republic, Azikiwe became the country's first President, completing a transition that began in the euphoria of that October midnight. Source: Britannica, Independent Nigeria

The celebrations stretched well into the morning. Highlife musicians Victor Olaiya and Bobby Benson played as Nigerians danced and rejoiced across the country. The music was not incidental to the occasion. It was part of the declaration. A free people celebrate freely, loudly, and joyfully. Source: Historical Nigeria, Nigeria's Independence in 1960: Events and Celebrations

Nigeria moved quickly to claim its place in the world. Shortly after independence, the country joined the United Nations, announcing its arrival as a sovereign state among nations. At home, the new government invested immediately in the future of its people. Within just two years of independence, four new universities had been established across the country, a powerful signal that Nigeria understood national freedom required an educated, empowered citizenry. Source: Britannica, Independent Nigeria

To see archival footage from that extraordinary night, watch the video here: https://www.youtube.com/watch?v=arpys66YjFE

That midnight at Lagos Race Course remains one of the defining moments in African history. A flag going up is not only the business of presidents and prime ministers. It belongs to every person who stood in that crowd, every family who stayed awake through the night to listen on the radio, and every generation that came after. Independence is both an event and a responsibility passed from one generation to the next.

The story of October 1, 1960 is not simply the story of a colony gaining independence. It is the story of a people reclaiming their dignity, asserting their capacity to shape their own future, and announcing to the world that the most populous nation on the African continent would write its own chapter from that day forward. Source: Britannica, Independent Nigeria; Wikipedia, Independence Day (Nigeria)

What part of Nigeria's independence story moves you the most? Drop your thoughts below and share this with someone who needs to know this history.

#NigerianIndependence #NigerianHistory #IndependenceDay #October1960 #TafawaBalewa #Azikiwe #Nigeria #NigerianHeritage #AfricanHistory #NationBuilding #IndependenceAndNationBuilding #TheLens`;

const THEME = "Nigeria Independence Day 1960 — Independence and Nation Building";

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
      `direct://nigeria-independence-1960-may6`,
      'direct',
      `Direct — ${THEME}`,
      `Nigeria Independence Day 1960 — May 6, 2026`,
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
    [storyId, body, THEME, '', `Direct — ${THEME}`, body.match(/#\w+/g) ?? []]
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
