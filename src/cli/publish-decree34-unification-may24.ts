/**
 * Publish script — The Decree That Broke Nigeria: One Stroke of a Pen and a Nation Was Never the Same
 * (The Lens Facebook Page, Today in Nigeria History — Sunday May 24, 2026)
 *
 * Two-image post. Images:
 *   1. Official portrait of General Aguiyi Ironsi — Public Domain (via Wikimedia Commons)
 *   2. Ironsi at Leopoldville, Congo (1964) — Public Domain (via Wikimedia Commons)
 *
 * Image source: Wikimedia Commons.
 * Draft sourced from THEAAA-660.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/2/2b/Major_Gen._J.T.U._Aguiyi_Ironsi_%28cropped%29.jpg';
const IMAGE_1_CAPTION =
  'Major General Johnson Thomas Umunnakwe Aguiyi Ironsi, Nigeria\'s first military Head of State, who signed Decree No. 34 (the Unification Decree) on May 24, 1966. Credit: via Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/6/69/Major_General_Johnson_Aguiyi-Ironsi_with_his_stuffed_crocodile_mascot_at_Leopoldville%2C_Congo.png';
const IMAGE_2_CAPTION =
  'Major General Johnson Aguiyi Ironsi at Leopoldville, Republic of the Congo, July 1, 1964, during his UN peacekeeping command role. Credit: via Wikimedia Commons (Public Domain).';

const POST_BODY = `The Decree That Broke Nigeria: One Stroke of a Pen and a Nation Was Never the Same

On May 24, 1966, General Johnson Thomas Umunnakwe Aguiyi Ironsi signed a document that would shake Nigeria to its very foundation and set off a chain of events still felt sixty years later.

Its official name was the Constitution (Suspension and Modification) (No. 5) Decree 1966. History would record it more simply as Decree No. 34 or the Unification Decree.

With that single document, Ironsi abolished Nigeria's federal structure entirely. The Federation of Nigeria ceased to exist. In its place, the Republic of Nigeria was born: a unitary state where all power flowed from the centre. The four regions were stripped of their autonomy. Every regional civil service was merged into a single National Public Service. A country built on centuries of diverse governance was, by decree, declared one unified entity. (Sources: ICIR Nigeria; Lawson Akhigbe)

Ironsi, who had become Nigeria's first military Head of State following the January 1966 coup, believed unity was the antidote to the crisis that had brought him to power. As early as January 1966, he had declared to Nigerians that tribal loyalties and activities promoting sectional interests must give way to the urgent task of national reconstruction. (Source: Wikipedia, Johnson Aguiyi Ironsi)

The North disagreed. Violently.

Within five days of the announcement, mass protests erupted across Northern Nigeria. By May 29, the streets of Kano, Kaduna, Zaria, and other northern cities were in turmoil. Military governors including Lieutenant Colonel Hassan Katsina openly warned Ironsi that the decree would not stand. Northern emirs submitted formal grievances, fearing that a unified civil service would disadvantage Northern Nigerians competing against a more educated South. (Sources: ICIR Nigeria; National Impact Nigeria)

What followed was one of the darkest chapters in Nigerian history.

Between May and September 1966, mass violence targeting Igbo communities erupted across the North. Historians and researchers estimate the death toll at between 8,000 and 30,000 Nigerians killed. Over one million Igbo people were forced to abandon their homes and return to the Eastern Region. (Source: Wikipedia, 1966 Anti Igbo Pogrom)

The political crisis did not stop there.

On July 29, 1966, a military counter coup ended the Ironsi era in the most brutal terms. Ironsi himself was seized, tortured, and killed. Lieutenant Colonel Francis Fajuyi, the Western Region Governor who had hosted Ironsi at Government House in Ibadan, was also murdered that night. The men who gathered to build one Nigeria became casualties of the very divisions that decree had promised to dissolve. (Source: Wikipedia, Johnson Aguiyi Ironsi)

General Yakubu Gowon assumed leadership and moved to contain the damage. On August 31, 1966, Decree 9 formally repealed Decree 34. The following year, Decree 14 replaced the four regions with twelve states, a structural change that appeared to restore balance but preserved the same centralising logic at its core. (Sources: Lawson Akhigbe; TheCable)

It was not enough to hold the country together.

On May 30, 1967, Lieutenant Colonel Odumegwu Ojukwu declared the Republic of Biafra. The Nigerian Civil War began and did not end until January 1970. Millions perished. An entire generation was left to carry the wound.

Sixty years on, legal scholars and constitutional experts argue that the centralising spirit of Decree 34 was never truly reversed. It lives, they say, embedded in the bones of Nigeria's 1999 Constitution: in the federal grip over resources, security, and the lives of over 200 million Nigerians. The ghost of May 24, 1966 has never been fully exorcised. (Sources: Lawson Akhigbe; TheCable)

One decree. Sixty years. And the question refuses to go away.

Has Nigeria truly moved beyond the centralisation that Decree No. 34 introduced, or are we still living inside the political structure that one military signature created in 1966? Tell us what you think.

Photos: (1) Major General Johnson Thomas Umunnakwe Aguiyi Ironsi, Nigeria's first military Head of State. Credit: via Wikimedia Commons (Public Domain). (2) Ironsi at Leopoldville, Congo, 1964. Credit: via Wikimedia Commons (Public Domain).

#TodayInNigerianHistory #Decree34 #NigerianHistory #IronsiDecree #NigeriaUnification #NigerianPolitics #Biafra #NigerianCivilWar #1966Nigeria #AguiyiIronsi #NigeriaFederalism #HistoricalNigeria`;

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

  console.log('Uploading image 1 (General Aguiyi Ironsi portrait)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Ironsi at Leopoldville, Congo)...');
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
