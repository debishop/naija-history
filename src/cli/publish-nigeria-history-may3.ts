import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { uploadPagePhoto, publishPostWithPhoto, publishPost } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const POST_BODY = `🗓️ TODAY IN NIGERIA HISTORY — May 3

World Press Freedom Day: A Date Africans Helped Create — and Nigeria's Fight to Live It

Every year on May 3, the world pauses to honour the journalists who risk everything to tell the truth. Editors imprisoned without charge. Newsrooms raided at gunpoint. Reporters silenced by bombs. This day — World Press Freedom Day — was not handed down from the powerful to the powerless. It was born in Africa, demanded by African journalists who refused to stay silent. And Nigeria's story is at the very heart of why this day matters.

---

The African Roots of World Press Freedom Day

On May 3, 1991, journalists from across the African continent gathered in Windhoek, the capital of Namibia, for a UNESCO-sponsored seminar titled "Promoting an Independent and Pluralistic African Press." The seminar took place just one year after Namibia gained independence from South Africa's apartheid-era administration — a time charged with democratic hope across the continent.

At the close of that seminar, the journalists adopted what became known as the Windhoek Declaration — a historic document calling for free, independent, and pluralistic media across Africa. It was signed on May 3, 1991. Two years later, the United Nations General Assembly designated May 3 as World Press Freedom Day in honour of that declaration.

Africa did not just participate in global press freedom. Africa created the international moment that defines it.

---

Nigeria: A Nation That Tested Every Principle

If the Windhoek Declaration represents Africa's highest aspirations for a free press, Nigeria's history represents both the heroism of those who lived that ideal and the brutality of those who tried to destroy it.

From the colonial era through decades of military dictatorship, Nigerian journalists were some of the most courageous and most persecuted on the continent.

Dele Giwa: The Voice That Would Not Be Silenced

No discussion of Nigerian press freedom is complete without Dele Giwa. In 1984, Giwa co-founded Newswatch magazine alongside Ray Ekpu, Dan Agbese, and Yakubu Mohammed. Newswatch transformed Nigerian journalism with bold, investigative reporting that the ruling military government found deeply threatening. The magazine covered stories others were afraid to touch — corruption, human rights abuses, and the abuse of power at the highest levels.

On October 19, 1986, Dele Giwa was killed at his Lagos home by a parcel bomb. He was 39 years old. The assassination remains officially unsolved, but its message was chillingly clear: speak too loudly, and the state will silence you permanently.

Giwa's murder did not silence Nigerian journalism. It steeled it. Newswatch continued publishing even after the military government temporarily shut it down. Journalists carried on, knowing the risks.

The June 12 Crisis and the Media Under Fire

Perhaps no period tested the Nigerian press as severely as the years surrounding the annulment of the June 12, 1993 presidential election. Chief Moshood Abiola won that election in what was widely regarded as Nigeria's freest vote. When General Ibrahim Babangida annulled the results, Nigerians rose in protest — and so did the press.

The military regime's response was to go after the media. Publications were seized. Editors were detained. Journalists went into exile or underground. The Nigerian press paid a heavy price for reporting the truth about June 12. But the truth survived. And when democracy was eventually restored on May 29, 1999, it was in part because journalists had refused to stop telling it.

---

Press Freedom Today: The Work Is Not Done

Nigeria's constitution guarantees freedom of the press. But constitutional guarantees and lived reality are not always the same thing. Nigerian journalists continue to face harassment, arbitrary detention, and legal threats. Investigative reporters covering corruption or political violence remain targets. The battle Dele Giwa and his generation fought is not over — it has simply moved to new arenas.

On World Press Freedom Day, Nigerians are reminded that a free press is not a luxury. It is the infrastructure of democracy. Without journalists who can investigate, report, and publish without fear, citizens cannot hold power accountable. Governance becomes a black box. Corruption thrives in the dark.

---

Remembering the Fallen, Honoring the Living

This May 3, we remember the Nigerian journalists who gave their lives for the truth: Dele Giwa, and the many whose names never made the international headlines but who kept reporting when it was dangerous to do so.

We celebrate the editors, reporters, and publishers who continue working today despite threats and pressure.

And we recommit to the ideal that African journalists helped write into international law in Windhoek in 1991: that a free, independent, and pluralistic press is not a gift from governments — it is a right that belongs to every people.

Nigeria helped build World Press Freedom Day. Let us honour it by defending what it stands for.

What aspect of Nigeria's press freedom history resonates most with you? Share your thoughts below!

Watch more: https://www.youtube.com/watch?v=1M9DnD2VsyU

#WorldPressFreedomDay #NigeriaHistory #TodayInNigeriaHistory #PressFreedom #DeleGiwa #NigerianJournalism #Windhoek1991 #FreePress #Nigeria #Africa #WindhoekDeclaration #MilitaryRule #June12 #NigerianMedia #Newswatch #JournalismMatters #TruthTellers #AfricanHistory #HumanRights (Photo: Next/CPJ)`;

const IMAGE_URL = 'https://cpj.org/wp-content/uploads/2009/10/Dele20Giwa1.jpg';
const THEME = 'Nigerian Press Freedom — World Press Freedom Day';

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
      `direct://nigerian-press-freedom-day`,
      'direct',
      `Direct — ${THEME}`,
      `Today in Nigeria History — May 3: World Press Freedom Day`,
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
    [storyId, body, `Today in Nigeria History — May 3`, '', `Direct — ${THEME}`, body.match(/#\w+/g) ?? []]
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

  let facebookPostId: string;

  try {
    console.log(`Uploading image from: ${IMAGE_URL}`);
    const photoId = await uploadPagePhoto(IMAGE_URL, POST_BODY.slice(0, 200));
    console.log(`Photo uploaded, ID: ${photoId}`);
    facebookPostId = await publishPostWithPhoto(draft, photoId);
    console.log('Published with photo.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Photo upload failed (${msg}). Publishing text-only.`);
    facebookPostId = await publishPost(draft);
    console.log('Published text-only.');
  }

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
