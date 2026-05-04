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

EAS Airlines Flight 4226 was operated by a BAC One-Eleven 525FT aircraft, registered 5N-ESF, on a scheduled passenger service from Kano to Lagos. The aircraft was carrying 69 passengers and 8 crew members when it departed the runway at Mallam Aminu Kano International Airport on the afternoon of May 4, 2002.

From the first seconds after takeoff, something was terribly wrong.

According to investigators and reporting by the Aviation Safety Network, the crew failed to execute a proper takeoff within the available runway distance. The aircraft overran, and during that overrun the engines ingested dust from the runway surface. Making matters worse, the flight crew failed to retract the landing gear after becoming airborne. The aircraft struggled to gain altitude with its gear down, its engines compromised, and the dense urban sprawl of Kano directly ahead.

The plane struck a mosque minaret. It then tore through a cluster of residential homes and an Islamic school in the Gwammaja Quarters before bursting into flames. The BBC and CNN reported the disaster the same day. What had been a routine afternoon commuter flight became a catastrophe within moments of leaving the ground.

The Human Toll

The numbers were staggering. Sixty-six passengers and seven crew members died on board. On the ground, the crash killed at least 30 civilians and injured more than 47 others. More than 30 homes were destroyed. The total death toll exceeded 100 people, with official counts placing it at approximately 103 (Aviation Safety Network; Wikipedia). Early news reports cited higher preliminary figures before final body counts were complete (The New Humanitarian, May 6, 2002; CNN, May 5, 2002). Only four people survived.

Among the dead was Ishaya Mark Aku, Nigeria's Minister of Sport. Aku had been travelling to Lagos in connection with a FIFA World Cup warm-up match between Nigeria and Kenya ahead of the 2002 World Cup in Japan and South Korea. Also killed were Julie Useni and Danjuma Useni, the wife and son of Jeremiah Useni, the former Federal Capital Territory Minister. The loss of government figures alongside hundreds of ordinary citizens underscored how indiscriminate the disaster was.

A City in Shock, a Nation in Mourning

Kano reacted with grief and fury. Gwammaja Quarters descended into scenes of rescue workers pulling bodies from smoldering wreckage while residents attempted to save whatever they could from destroyed homes. President Olusegun Obasanjo declared two days of national mourning. Aviation Minister Kema Chikwe moved swiftly: all BAC One-Eleven aircraft operating in Nigeria were grounded pending review (The New Humanitarian, May 9, 2002).

The decision pointed to a deeper crisis that the Kano disaster had made impossible to ignore. Many of the aircraft operating in Nigerian skies were aging, poorly maintained, and inadequately regulated. The BAC One-Eleven that crashed into Gwammaja had been manufactured decades earlier. In the immediate aftermath of the disaster, the federal government introduced a sweeping new rule: no aircraft more than 22 years old could be registered to operate in Nigeria.

A Watershed for Nigerian Aviation

The EAS Airlines crash did not occur in isolation. It was one disaster in a string of aviation tragedies that struck Nigeria in the early 2000s. The Bellview Airlines crash of October 2005 and the Sosoliso Airlines crash of December 2005 followed within a few years, each adding further pressure on regulators, the government, and the public to demand structural reform.

Together, these disasters forced a reckoning with Nigeria's aviation safety culture. The Nigerian Civil Aviation Authority (NCAA) came under sustained pressure to modernize. The result was the development and promulgation of the Nigerian Civil Aviation Regulations (NCAR), a comprehensive regulatory framework designed to bring Nigerian aviation standards in line with international norms. The EAS Airlines disaster of 2002 is widely recognized as the event that gave that reform effort its urgency and political momentum.

The causes identified in the Kano crash were not mysteries: pilot error, failure to follow established procedures, aging aircraft, and an oversight environment that had allowed unsafe conditions to persist. These were correctable failures. The tragedy was that correction required more than 100 deaths to become politically unavoidable.

What Kano Remembered

Gwammaja was a neighborhood of ordinary lives on the afternoon of May 4, 2002. People were going to work, children were in school. A mosque stood as a landmark on the approach path. By that afternoon, the neighborhood was the center of a national tragedy, its streets full of rescuers, its sky still thick with smoke from the burning wreckage of a modern passenger aircraft that had failed its most basic task: to carry people safely from one city to another.

The four survivors of Flight 4226 lived. More than 100 people did not.

Twenty-four years later, the lessons of that afternoon are written into Nigerian aviation law. The question is whether those laws are enforced with the same urgency that their creation demanded.

Over 100 lives lost in seconds on May 4, 2002. How has Nigeria's aviation sector changed since that tragedy? Share your thoughts below.

Watch more: https://www.youtube.com/watch?v=RHyS3N5BLDY

📷 Aircraft image: 5N-ESF (BAC One-Eleven 525FT) photographed in 1992 in TAROM livery (Torsten Maiwald/JetPix, GNU FDL 1.2): https://upload.wikimedia.org/wikipedia/commons/e/ed/British_Aerospace_BAC-111-525FT_One-Eleven%2C_Tarom_AN0195094.jpg

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

async function main(): Promise<void> {
  initSecrets();

  const draftId = await saveDraftPost(POST_BODY);
  console.log(`Draft saved as ID ${draftId}`);

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
