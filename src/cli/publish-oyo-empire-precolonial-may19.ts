/**
 * Publish script — The Oyo Empire: Nigeria Had a Democracy Before Democracy Had a Name
 * (The Lens Facebook Page, Precolonial Heritage — Monday May 19, 2026)
 *
 * Three-image gallery post. Image order:
 *   1. Map of Oyo Empire at Greatest Extent, c. 1780 (Henry B. Lovejoy)
 *   2. Oyo Empire Political System Diagram
 *   3. Palace of the Alaafin of Oyo, mid-1900s
 *
 * Image sources: Wikimedia Commons.
 *   Image 1: CC BY-SA 4.0 (Henry B. Lovejoy, Canadian Journal of African Studies)
 *   Image 2: CC BY-SA 3.0 (Mapadalehinmioluwa)
 *   Image 3: Public Domain
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/85/Oyo_Empire_at_Its_Greatest_Extent%2C_c._1780_%285%29.jpg';
const IMAGE_1_CAPTION =
  'Map of the Oyo Empire at its greatest extent, c. 1780. At its peak, the empire stretched across approximately 270,000 square kilometres, from present day Lagos and Oyo into what is now Benin Republic. Source: Henry B. Lovejoy, "Re Drawing Historical Maps of the Bight of Benin Hinterland, c. 1780," Canadian Journal of African Studies, Vol. 47, No. 3, via Wikimedia Commons (CC BY SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/2/29/Old_Oyo_Empire_Political_System_Under_Alaafin_of_Oyo.gif';
const IMAGE_2_CAPTION =
  'Diagram of the Oyo Empire political system showing the tripartite structure: the Alaafin (King), the Oyo Mesi (Council of Seven led by the Bashorun), and the Ogboni Society. Three branches of authority that predated Montesquieu by centuries. Source: Wikimedia Commons (CC BY SA 3.0).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/5/52/Palace_of_Alaafin_of_Oyo_circa_mid-1900s.jpg';
const IMAGE_3_CAPTION =
  'Palace of the Alaafin of Oyo, photographed in the mid 1900s. The Alaafin was the supreme political and spiritual head of the Oyo Empire, but the constitution constrained his power through the Oyo Mesi council and the Ogboni Society. Source: Wikimedia Commons (Public Domain).';

const POST_BODY = `Nigeria Had a Democracy Before Democracy Had a Name

Before the British Parliament. Before the American Constitution. Before the philosopher Montesquieu wrote his famous theories on the separation of powers in 1748. The Yoruba people of the Oyo Empire had already built a government where a king could be removed by law, not by rebellion.

Not by a coup. Not by bloodshed. By a calabash.

The Oyo Empire, founded around 1300 CE in what is now southwestern Nigeria, grew into one of the most powerful and politically sophisticated states in all of West Africa. At its height in the 18th century, it stretched across approximately 270,000 square kilometres, from present day Lagos and Oyo down into what is now Benin Republic, where the Kingdom of Dahomey paid annual tribute to Oyo for nearly a century (World History Encyclopedia).

But the real story is not the size. It is the system.

Oyo ran on a tripartite constitutional structure that would be recognizable to any modern political scientist (African Histories at Wake Forest). Three institutions. Three sources of power. Each one checking the others.

First: the Alaafin. The king. Semidivine, the supreme political and spiritual head of the empire. Powerful, yes. But not absolute.

Second: the Oyo Mesi. A council of seven chiefs led by the Bashorun, the empire's equivalent of a Prime Minister. They held electoral power over who became Alaafin and joint approval rights over major decisions. They also held one weapon no Western democracy has ever matched: the constitutional right to demand the death of a tyrannical king. They would present him with an empty calabash or a dish of parrot eggs, and the Bashorun would declare: "the gods reject you, the people reject you, the earth rejects you." The Alaafin was then expected to take his own life, along with his eldest son and his counselor. This was not rebellion. It was procedure. (Wikipedia, Oyo Empire, citing S.A. Akintoye and R.C.C. Law)

Third: the Ogboni Society. A body of elder aristocrats representing popular religious authority. Even the Oyo Mesi had to reckon with the Ogboni. No single institution could act alone. If both the council and the Ogboni rejected an Alaafin, his fate was sealed.

Executive power. Legislative and electoral power. Popular religious check. Three separate branches of authority, centuries before Montesquieu put the idea on paper.

The most dramatic test came between 1750 and 1774. Bashorun Gaha, the most powerful Prime Minister in Oyo history, weaponized forced abdication for personal gain, orchestrating the removal of four successive Alaafins. That one man exploited the system does not prove it was weak. It proves the system was real. Alaafin Abiodun eventually ended Gaha's reign, had him executed, and restored royal authority. The constitution survived (Britannica, Oyo Empire).

When Oyo collapsed in 1835, sacked by the forces of Ilorin, it was the end of a long unraveling. Military commander Afonja launched his rebellion around 1817, inviting Fulani jihadist forces into Ilorin as allies, a catastrophic miscalculation. Those same allies turned on him, and Afonja was dead by 1823. The Ilorin that destroyed the capital twelve years later was already a foreign power.

The consequences echoed far beyond West Africa. The resulting Yoruba refugee crisis fed directly into the Atlantic slave trade. Thousands of Yoruba captives carried their culture across the ocean to Brazil, Cuba, Trinidad, and the United States. Candomblé. Santería. Trinidad Orisha. All of these living religious traditions today are direct descendants of Oyo Yoruba spiritual life (Henry B. Lovejoy, Canadian Journal of African Studies, Vol. 47, No. 3). The empire fell. The culture endured.

Nigeria's current governance crisis is often framed as a failure of African political culture. Weak institutions. No accountability. Endless impunity.

But Oyo had accountability. Oyo had institutional checks. Oyo had a mechanism to remove a bad ruler without firing a single shot.

The question is not whether Africans were capable of democratic governance. History answered that long before the question was asked.

The question is: what dismantled it?

Could Nigeria's governance struggles today trace back to institutions that were broken, not institutions that never existed? Drop your thoughts in the comments.

#OyoEmpire #NigerianHistory #PrecolonialAfrica #AfricanDemocracy #YorubaHeritage #NigerianHeritage #AfricanHistory #BlackHistory #TheLens #PrecolonialHeritage #WestAfricanHistory #AfricaBeforeColonialism #NaijaHistory`;

interface GraphApiError {
  message: string;
  type: string;
  code: number;
}

async function resolvePageAccessToken(pageId: string, token: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}?fields=access_token&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url);
  const json = (await response.json()) as { access_token?: string; error?: GraphApiError };
  if (!response.ok || json.error) {
    return token;
  }
  return json.access_token ?? token;
}

async function uploadPhoto(
  pageId: string,
  pageToken: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/photos`;
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    published: 'false',
    access_token: pageToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await response.json()) as { id?: string; error?: GraphApiError };
  if (!response.ok || json.error || !json.id) {
    throw new Error('Photo upload failed: ' + (json.error?.message ?? 'HTTP ' + response.status));
  }
  return json.id;
}

async function publishWithPhotos(
  pageId: string,
  pageToken: string,
  photoIds: string[],
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const params = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
  });
  photoIds.forEach((id, i) => {
    params.append(`attached_media[${i}]`, `{"media_fbid":"${id}"}`);
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = (await response.json()) as { id?: string; error?: GraphApiError };
  if (!response.ok || json.error || !json.id) {
    throw new Error('Publish failed: ' + (json.error?.message ?? 'HTTP ' + response.status));
  }
  return json.id;
}

async function main(): Promise<void> {
  const systemUserToken =
    process.env['FACEBOOK_SYSTEM_USER_TOKEN'] ?? process.env['FACEBOOK_PAGE_ACCESS_TOKEN'];
  const pageId = process.env['FACEBOOK_PAGE_ID'];

  if (!systemUserToken || !pageId) {
    throw new Error(
      'FACEBOOK_SYSTEM_USER_TOKEN (or FACEBOOK_PAGE_ACCESS_TOKEN) and FACEBOOK_PAGE_ID must be set.',
    );
  }

  console.log('Resolving page access token...');
  const pageToken = await resolvePageAccessToken(pageId, systemUserToken);

  console.log('Uploading image 1 (Map of Oyo Empire at Greatest Extent)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Political System Diagram)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Palace of the Alaafin of Oyo)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with three-image gallery...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
