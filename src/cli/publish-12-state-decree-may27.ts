/**
 * Publish script — THE DECREE THAT BROKE NIGERIA
 * (The Lens Facebook Page, Tuesday May 27, 2026 — Today in Nigeria History)
 *
 * Two-image post. Images:
 *   1. General Yakubu Gowon portrait — Public Domain (Wikimedia Commons)
 *   2. Map of Nigerian States 1967-1976 — CC BY-SA 3.0 (Wikimedia Commons)
 *
 * Draft sourced from THEAAA-703. Visual assets from THEAAA-704.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/b/b7/Gen._Yakubu_Gowon_GCFR_%28cropped%29.jpg';
const IMAGE_1_CAPTION =
  'General Yakubu Gowon, Head of State of Nigeria (1966 to 1975). He signed the 12 State Creation Decree on May 27, 1967. Credit: Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/9/9a/Nigeria_states-1967-1976.png';
const IMAGE_2_CAPTION =
  'Map of the 12 states created by Gowon\'s May 27, 1967 decree, which remained in place until 1976. The Eastern Region was split into East Central State, South Eastern State, and Rivers State. Credit: Wikimedia Commons (CC BY SA 3.0).';

const POST_BODY = `The Decree That Broke Nigeria: The Day Gowon Drew New Borders and Changed Everything

On May 27, 1967, a single government decree set in motion a chain of events that would cost over one million Nigerian lives.

General Yakubu Gowon, Head of State of Nigeria, signed a decree that abolished the country's four regions and replaced them with twelve new states. It looked like a governance decision on paper. In reality, it was a calculated act of political warfare (Wikipedia, Nigerian Civil War).

Nigeria had been simmering with tension since the military coup of January 1966 and the retaliatory coup of July 1966. The Igbo people of the Eastern Region had suffered horrific violence in the north during the pogroms of 1966, and hundreds of thousands had fled back east. Colonel Odumegwu Ojukwu, Military Governor of the Eastern Region, had been locked in negotiations with the federal government over the future of Nigeria. Those talks had collapsed (The History Ville, Why Ojukwu declared the Republic of Biafra).

Then came Gowon's decree.

The four regions became twelve states overnight. The predominantly Igbo Eastern Region was carved into three: East Central State, South Eastern State, and Rivers State. The strategic genius and the cruelty of this move lay in where the lines were drawn. The oil producing areas of the Niger Delta, which had been part of the Eastern Region, were assigned to the new Rivers State. East Central State, the Igbo heartland, was left without access to those oil revenues (ARJONLINE, Creation of States in Nigeria, 1967 to 1996).

This was not incidental. It was deliberate. The federal government understood that oil was the financial spine of any future Biafran state. By separating the oil fields from the Igbo majority territory, Gowon's decree ensured that any breakaway republic would be economically crippled before it ever got started (Wikipedia, Nigerian Civil War).

For Ojukwu and the Eastern Region, the decree was the final answer to every question they had been asking. Three days later, on May 30, 1967, Ojukwu stood before a cheering crowd and proclaimed the independent Republic of Biafra (Wikipedia, 1967 in Nigeria).

The war began on July 6, 1967, when federal troops crossed into Biafra. What followed was one of the most devastating conflicts in modern African history. The blockade of Biafra cut off food supplies to civilians. Images of children suffering from severe malnutrition shocked the world and drew international attention to the conflict for the first time. By the time Biafra surrendered on January 15, 1970, estimates of the dead ranged from one million to three million people, the majority of them civilians who starved (Wikipedia, Nigerian Civil War).

Gowon famously declared after the war that there were no victors and no vanquished. Whether that sentiment was ever truly honoured is a question Nigerians are still answering today.

The twelve states created in 1967 became the foundation on which Nigeria's current 36 state structure was eventually built. The borders Gowon drew that May morning are still with us in one form or another.

History does not always announce itself loudly. Sometimes it arrives in the form of a government document. Sometimes a decree is more dangerous than a bullet.

On May 27, 1967, Nigerians woke up to a redrawn map. Three days later, they woke up to a new country within their borders. And six weeks after that, they woke up to war.

We are still reckoning with what was set in motion on that day.

What do you think? Could the Nigerian Civil War have been avoided, or was the 12 State Decree inevitable given the tensions of 1966? Drop your thoughts in the comments.

Photos: (1) General Yakubu Gowon, Head of State of Nigeria. Credit: Wikimedia Commons (Public Domain). (2) Map of the 12 states created by the May 27, 1967 decree. Credit: Wikimedia Commons (CC BY SA 3.0).

#NigerianHistory #Biafra #NigerianCivilWar #TodayInHistory #Nigeria #Gowon #Ojukwu #AfricanHistory #NigeriaAt65 #NeverForget #BlackHistory #WestAfrica #NigeriaHistory`;

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
    throw new Error(`Photo upload failed: ${json.error?.message ?? `HTTP ${response.status}`}`);
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
    throw new Error(`Publish failed: ${json.error?.message ?? `HTTP ${response.status}`}`);
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

  console.log('Uploading image 1 (General Yakubu Gowon portrait)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Map of Nigerian States 1967 to 1976)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Publishing post with images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
