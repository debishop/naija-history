import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { publishPost } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const POST_BODY = `🗓️ TODAY IN NIGERIA HISTORY — May 4

Fire Over Kano: The EAS Airlines Disaster That Changed Nigerian Aviation Forever

On the afternoon of May 4, 2002, a passenger aircraft lifted off from Mallam Aminu Kano International Airport and never made it out of the city. Within minutes, EAS Airlines Flight 4226 had ploughed through the rooftops of Gwammaja, one of Kano's most densely populated residential quarters, killing 73 of the 77 people on board and dozens of people on the ground. It remains one of the deadliest aviation disasters in Nigerian history, and its aftermath reshaped the country's approach to air safety in ways still felt today.

The Flight That Never Left Kano

EAS Airlines Flight 4226 was operated by a BAC One Eleven 525FT aircraft, registered 5N ESF, on a scheduled passenger service from Kano to Lagos. It was carrying 69 passengers and 8 crew members when it departed the runway on the afternoon of May 4, 2002.

From the first seconds after takeoff, something was terribly wrong.

According to investigators and the Aviation Safety Network, the crew failed to execute a proper takeoff within the available runway distance. The aircraft overran, and during that overrun the engines ingested dust from the runway surface. The flight crew then failed to retract the landing gear after becoming airborne, increasing drag and preventing the aircraft from gaining safe altitude. As they fought for control, the captain transmitted his final words to air traffic control, reporting that his takeoff was difficult, that he had heard a sound in his right engine, that the aircraft was wobbling, and that he believed he was in a difficult situation.

The plane struck a mosque minaret, then tore through a cluster of residential homes and an Islamic school in the Gwammaja Quarters before bursting into flames.

The Human Toll

Sixty six passengers and seven crew members died on board. On the ground, the crash killed at least 30 civilians and injured more than 47 others. More than 30 homes were destroyed. The total death toll exceeded 100 people, with official counts placing it at approximately 103 (Aviation Safety Network; Wikipedia). Only four people survived.

Among the dead was Ishaya Mark Aku, Nigeria's Minister of Sport. He had been travelling to Lagos for a FIFA World Cup warm up match between Nigeria and Kenya ahead of the 2002 World Cup. Also killed were Julie Useni and Danjuma Useni, the wife and son of Jeremiah Useni, the former Federal Capital Territory Minister. The loss of public figures alongside ordinary citizens made the grief of that day feel national in reach.

A Nation in Mourning

President Olusegun Obasanjo declared two days of national mourning. Aviation Minister Kema Chikwe moved swiftly: all BAC One Eleven aircraft in Nigeria were grounded pending review (The New Humanitarian, May 9, 2002). In the weeks that followed, the federal government introduced a sweeping new rule: no aircraft more than 22 years old could be registered to operate in Nigeria.

The investigation was unsparing. Pilot error, failure to follow procedures, aging aircraft, inadequate maintenance oversight, and missing flight recorders all contributed. These were correctable failures that had been allowed to persist. The crash remains the deadliest accident ever involving a BAC One Eleven aircraft, and it is widely recognised as the event that made aviation reform politically unavoidable in Nigeria.

Twenty four years later, the lessons of Gwammaja are written into Nigerian aviation law. The Gwammaja community bore the full weight of that disaster: homes destroyed, neighbours lost, a neighbourhood forever marked by what fell from the sky that Saturday. The four survivors of Flight 4226 lived. More than 100 people did not.

Over 100 lives lost on May 4, 2002. How has Nigeria's aviation sector changed since that tragedy? Share your thoughts below.

📷 Aircraft image: 5N ESF (BAC One Eleven 525FT) photographed in 1992 in TAROM livery (Torsten Maiwald/JetPix, GNU FDL 1.2): https://upload.wikimedia.org/wikipedia/commons/e/ed/British_Aerospace_BAC-111-525FT_One-Eleven%2C_Tarom_AN0195094.jpg

📷 Kano Airport aerial view (Javy010, CC BY-SA 4.0): https://upload.wikimedia.org/wikipedia/commons/0/08/Overview_of_Kano_Airport.jpg

#TodayInNigeriaHistory #NigerianHistory #EASAirlines #KanoAirDisaster #NigerianAviation #May4 #AviationSafety #Nigeria2002 #NigerianHeritage #Kano #FlightSafety #NCAA #NigerianCivilAviationAuthority #AfricanHistory #NigeriaRemembers #AviationDisaster #NeverForget #NigeriaAviation #GwammajaKano #NigerianLives`;

const THEME = 'EAS Airlines Flight 4226 Kano Air Disaster — May 4, 2002';

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
      `direct://eas-airlines-flight-4226-kano-2002`,
      'direct',
      `Direct — ${THEME}`,
      `Today in Nigeria History — May 4: Fire Over Kano — The EAS Airlines Disaster`,
      body.slice(0, 500),
      body,
    ]
  );
  const storyId = candidateResult.rows[0].id;

  // Re-use existing draft if one already exists for this story candidate
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
    [storyId, body, `Today in Nigeria History — May 4`, '', `Direct — ${THEME}`, body.match(/#\w+/g) ?? []]
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
