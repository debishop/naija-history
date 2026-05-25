/**
 * Publish script — The Day Nigeria Stitched Africa Together: How One Leader's Words Built a Continent
 * (The Lens Facebook Page, Today in Nigeria History — Sunday May 25, 2026)
 *
 * Three-image post. Images:
 *   1. Balewa delivering Nigeria's first Independence Day speech, Oct 1 1960 — Public Domain (Wikimedia Commons / Mark Kauffman / LIFE Magazine)
 *   2. Abubakar Tafawa Balewa portrait — CC0 Public Domain (Wikimedia Commons)
 *   3. Prime Minister Tafawa Balewa in office, 1962 — CC BY-SA 3.0 (Wikimedia Commons)
 *
 * Draft sourced from THEAAA-672. Fact-checked and verified.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/a/a0/Abubakar_Tafawa_Balewa_delivering_first_Nigeria%27s_Independence_Day_speech_1_October_1960.jpg';
const IMAGE_1_CAPTION =
  'Sir Abubakar Tafawa Balewa delivers Nigeria\'s first Independence Day speech on October 1, 1960. Credit: Mark Kauffman / LIFE Magazine via Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/0/09/Abubakar_Tafawa_Balewa_1.jpg';
const IMAGE_2_CAPTION =
  'Sir Abubakar Tafawa Balewa, Nigeria\'s first and only Prime Minister. Credit: via Wikimedia Commons (CC0 Public Domain).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/a/aa/Abubakar_Tafawa_Balewa_%281962%29.jpg';
const IMAGE_3_CAPTION =
  'Prime Minister Tafawa Balewa in office, 1962. Credit: via Wikimedia Commons (CC BY-SA 3.0).';

const POST_BODY = `The Day Nigeria Stitched Africa Together: How One Leader's Words Built a Continent

Addis Ababa. May 25, 1963.

Leaders and delegates from 32 African states gathered under the same sky for the first time. The continent was still trembling from the weight of colonialism, still sorting out what it meant to be free, still arguing about what kind of Africa they were building together.

Two camps had formed. The Casablanca Bloc wanted immediate political union, one Africa right now. The Monrovia Group preferred gradual cooperation, each nation keeping its sovereignty. The gap between them threatened to fracture the continent before it could even find its footing.

Then Nigeria's Prime Minister Sir Abubakar Tafawa Balewa stepped forward.

Balewa, already known across the world as the "Golden Voice of Africa," had spent the previous year doing the quiet, unglamorous work of bridge building. In January 1962, Nigeria convened a conference in Lagos that produced a draft framework for African unity, one that neither bloc could easily reject. That proposal, alongside draft charters submitted by Ethiopia and Ghana, shaped the final OAU Charter signed by those 32 nations in Addis Ababa. (Source: Wikipedia, Organisation of African Unity)

When Balewa rose to speak that day, he looked out at presidents, prime ministers and emperors including Ethiopia's Haile Selassie I, Ghana's Kwame Nkrumah, and Tanzania's Julius Nyerere, and he said words that still echo:

"I am pleased to say that, from now on, there will be no question of the so called Monrovia and Casablanca Blocs. We all belong to Africa."

(Source: BlackPast.org, Tafawa Balewa's Addis Ababa Speech)

That sentence did not just close a debate. It declared a new reality into existence.

The Organisation of African Unity was born that day, and it chose Addis Ababa as its permanent home in recognition of Ethiopia's role as a symbol of African resistance to colonialism. But the intellectual architecture of the organization, the principles of sovereignty, noninterference, and graduated solidarity, bore Nigeria's fingerprints. (Source: South African History Online)

Nigeria's commitment to the OAU went far beyond a founding signature. The country was consistently among the largest financial contributors to the organisation and later the African Union, contributing as much as 15 million US dollars in a single year toward the body's running costs. Nigeria also led the charge on resolutions against apartheid and used its continental influence to isolate the apartheid regime in South Africa. (Source: The Nigerian Voice)

When the OAU eventually transformed into the African Union in 2002, Nigeria under President Olusegun Obasanjo played a central role in stewarding that transition, ensuring the new body carried forward the founding ideals into the twenty first century. Nigeria had also helped found ECOWAS in 1975, building the West African pillar of the same vision Balewa articulated in 1963. (Source: The Nigerian Voice)

Today, 63 years later, Africa Day is still marked on May 25. The African Union's theme for 2025 is "Justice for Africans and People of African Descent through Reparations," a call that connects directly to the decolonial spirit that drove those 32 leaders to Addis Ababa in the first place. (Source: African Union)

Balewa did not live to see the full arc of what he helped build. He was killed during Nigeria's first military coup in January 1966, less than three years after that historic day. But the organization he helped shape outlasted him, outlasted the Cold War, outlasted apartheid, and continues to shape the African continent today. (Source: Wikipedia, Abubakar Tafawa Balewa)

63 years ago, a Nigerian stood before a divided continent and told it: you are one. And the continent believed him.

What does Africa Day mean to you today, and do you think Nigeria still plays the same unifying role on the continent that Balewa envisioned in 1963?

Photos: (1) Sir Abubakar Tafawa Balewa delivering Nigeria's first Independence Day speech, October 1, 1960. Credit: Mark Kauffman / LIFE Magazine via Wikimedia Commons (Public Domain). (2) Sir Abubakar Tafawa Balewa, Nigeria's first and only Prime Minister. Credit: via Wikimedia Commons (CC0 Public Domain). (3) Prime Minister Tafawa Balewa in office, 1962. Credit: via Wikimedia Commons (CC BY-SA 3.0).

Video: Commemorating 60 Years of the OAU/AU (African Union official documentary): https://www.youtube.com/watch?v=Em5yJVO9f10

#AfricaDay #OAUFounding #NigeriaHistory #TafawaBalewa #GoldenVoiceOfAfrica #TheLens #TodayInNigeriaHistory #AfricanUnity #AfricaDay2026 #NigeriaInAfrica #ProudlyAfrican #AfricanHistory #NigeriaProud`;

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

  console.log('Uploading image 1 (Balewa delivering Independence Day speech, 1960)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Balewa portrait)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Balewa in office, 1962)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
