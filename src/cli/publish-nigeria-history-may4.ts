import * as dotenv from 'dotenv';
dotenv.config();

import { initSecrets } from '../services/secrets';
import { getPool, closePool } from '../db/pool';
import { publishPost } from '../services/facebook';
import { notifySlack } from '../services/notifications';

const POST_BODY = `🗓️ TODAY IN NIGERIA HISTORY — May 4

The Week Nigeria Almost Did Not Survive: May 1967 and the Countdown to Civil War

On May 4, 1967, Nigeria stood at the edge of its most catastrophic hour. In less than four weeks, the country would fracture into a war that would kill between one and three million people and reshape the entire African continent's understanding of statehood, sovereignty, and secession. But on this date, in the tense quiet before the storm, the decisions being made in Lagos and Enugu were still reversible. Just barely.

Understanding what happened in the first days of May 1967 means understanding everything about modern Nigeria.

The Aburi Accord: Promised Peace, Broken Promise

The roots of the May 1967 crisis stretched back to two military coups in 1966. The first coup, on January 15, 1966, killed Prime Minister Abubakar Tafawa Balewa, the Sardauna of Sokoto Sir Ahmadu Bello, and several senior military officers. The Northern political establishment interpreted it as an Igbo-engineered putsch. Seven months later, on July 29, 1966, a counter-coup swept through the military, and Lt. Col. Yakubu Gowon, a Christian Northerner from Plateau State, seized power. In the weeks that followed came the pogroms: an estimated 30,000 Igbo civilians living in the North were killed. Between one and two million Igbo refugees streamed back to the Eastern Region.

The stage was set for catastrophe. But one last diplomatic effort was made.

In January 1967, Gowon and the Eastern Region's military governor, Lt. Col. Chukwuemeka Odumegwu Ojukwu, met in Aburi, Ghana. Supervised by Ghanaian Head of State Lt. General Joseph Ankrah, they negotiated what became known as the Aburi Accord. The agreement proposed a loose confederation that would give each region substantial autonomy while preserving a nominal federal framework. It also contained provisions for the safety of Easterners living in other regions of Nigeria.

For a brief moment, it seemed Nigeria might survive intact.

But the federal civil servants and the Northern political establishment lobbied aggressively against the Aburi agreement. By March 1967, Gowon's government had retreated from the accord's key provisions. "On Aburi we stand," Ojukwu declared, as federal officials gutted the agreement's meaning one clause at a time. The Eastern Region's trust in the federal government was broken entirely.

May 1967: The Final Countdown

By the time May 4, 1967 arrived, Nigeria was caught in an accelerating spiral toward war. The federal government had imposed an economic blockade on the Eastern Region. Ojukwu had seized federal assets and institutions within the East. Igbo officers had been expelled from or had fled the federal military. The Eastern Region's Consultative Assembly was meeting regularly in Enugu.

During the first week of May 1967, diplomatic channels remained open but were narrowing fast. British diplomatic cables from that period document growing alarm in London. American officials were watching closely. African leaders attempted quiet mediation. Ethiopian Emperor Haile Selassie and other OAU leaders tried to facilitate a negotiated settlement between Lagos and Enugu.

But a fundamental contradiction was unresolvable by May 4. Gowon had decided on sweeping constitutional restructuring: the division of Nigeria's then-four regions into twelve states. This restructuring would split the Eastern Region into three smaller states and cut the Igbo heartland off from the oil-rich coastal areas around Port Harcourt and Bonny. This was precisely what Ojukwu had warned would push the East toward independence. And it did.

The Declaration That Changed Everything

On May 27, 1967, the Eastern Region Consultative Assembly convened in Enugu and gave Ojukwu a formal mandate to declare independence at the earliest practicable date. Gowon's government responded the same day by promulgating the 12-state decree. Three days later, on May 30, 1967, Ojukwu stood before a massive crowd in Enugu and proclaimed the sovereign Republic of Biafra.

The Nigerian Civil War began formally on July 6, 1967, when federal troops crossed into Biafra at Garkem.

What followed was thirty months of devastating conflict. Federal forces advanced on multiple fronts and Biafran forces pushed back with remarkable tenacity despite growing encirclement. The war produced some of Africa's most haunting images: children suffering from kwashiorkor, a protein deficiency resulting from the federal food blockade. These photographs moved the world and gave rise to modern humanitarian journalism. The international medical relief organization Medecins Sans Frontieres was founded partly in direct response to what French doctors witnessed while working inside Biafra.

After the War: Reconciliation and Its Limits

When Biafra surrendered on January 15, 1970, exactly four years to the day after the first coup, Gowon delivered one of his most memorable lines: "No victor, no vanquished." Nigeria would not impose punitive reparations on the former Biafran territories. The reconciliation policy was generous in its political framing.

But the economic wounds ran deep. The federal government's confiscation of Igbo bank accounts, the contested "abandoned property" policies in Rivers State and South Eastern State, and the £20 policy (which limited each returning Igbo person to only £20 regardless of their actual prewar savings) left many families destitute and dispossessed. The economic marginalization became a long-standing grievance among Igbo communities across Nigeria.

Today, the memory of Biafra remains deeply contested. May 30 is commemorated annually by groups such as the Movement for the Actualization of the Sovereign State of Biafra and the Indigenous People of Biafra, despite government restrictions on such commemorations. The Nigerian state and mainstream political opinion insist that the hard-won national unity achieved after 1970 cannot be undone. But the underlying questions of equity, resource control, and political representation that drove the 1967 crisis have not disappeared from Nigerian public life.

What May 4 Teaches Nigeria

On May 4, 1967, the path to catastrophe was still being walked but had not yet been fully taken. It is a reminder that political crises of such magnitude do not arrive suddenly. They are built slowly, grievance by grievance, betrayal by betrayal, broken accord by broken accord. They are also, at nearly every stage, reversible. Until suddenly they are not.

Nigeria survived the Biafran War. More than five decades later, it remains one of Africa's largest and most complex democracies, still held together by the same federal structure that was at the center of the 1967 crisis. The debates about resource control, state creation, federalism, and self-determination remain very much alive in contemporary Nigerian politics.

The lessons of May 1967 are not merely history. They are present politics in a country still working out the terms of its union.

What aspect of Nigeria's civil war history do you believe needs more open discussion today? Share your thoughts below!

Watch more: https://www.youtube.com/watch?v=NOgPFDsJABo

#TodayInNigeriaHistory #NigerianHistory #NigerianCivilWar #Biafra #May1967 #Ojukwu #Gowon #AburiAccord #NigeriaUnity #Africa #NigerianPolitics #Federalism #AfricanHistory #BiafranWar #Nigeria1967 #NigerianHeritage #AfricanUnity #Reconciliation #NigeriaAtWar #LestWeForget`;

const THEME = 'Nigerian Civil War Origins — May 1967';

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
      `direct://nigerian-civil-war-may-1967`,
      'direct',
      `Direct — ${THEME}`,
      `Today in Nigeria History — May 4: The Week Before Biafra`,
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
