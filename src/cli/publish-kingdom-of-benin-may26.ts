/**
 * Publish script — BEFORE EUROPE HAD ITS RENAISSANCE, BENIN WAS ALREADY A SUPERPOWER
 * (The Lens Facebook Page, Monday May 26, 2026 — Precolonial Heritage)
 *
 * Three-image post. Images:
 *   1. Brass Head of an Oba (18th century), Brooklyn Museum — CC BY 3.0 (Wikimedia Commons)
 *   2. Benin Bronzes at British Museum (2023) — CC BY-SA 4.0 (Wikimedia Commons)
 *   3. Benin Bronze Sculptural Bust — Public Domain (Wikimedia Commons)
 *
 * Draft sourced from THEAAA-697. Visual assets from THEAAA-699.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/b/b2/Brooklyn_Museum_39.111_Head_of_an_Oba_%282%29.jpg';
const IMAGE_1_CAPTION =
  'Brass Head of an Oba (18th century), Kingdom of Benin. Brooklyn Museum collection. Credit: Brooklyn Museum / Wikimedia Commons (CC BY 3.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/7/70/Benin_bronzes_british_museum_2023.JPG';
const IMAGE_2_CAPTION =
  'Benin Bronzes on display at the British Museum (2023) — more than 3,000 royal bronzes looted during the 1897 British Punitive Expedition. The restitution movement to return them to Nigeria is ongoing. Credit: Geni / Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/16/Benin_Bronze.JPG';
const IMAGE_3_CAPTION =
  'Benin Bronze sculptural bust — an example of the extraordinary lost-wax casting technique mastered by Benin\'s royal craftsmen from the 14th century onward. Credit: Wikimedia Commons (Public Domain).';

const POST_BODY = `Before Europe Had Its Renaissance, Benin Was Already a Superpower

Before Europe had its Renaissance, the Kingdom of Benin was building walls longer than the Great Wall of China, casting bronze masterpieces that stunned European explorers, and trading with Portugal as equals.

This was Benin. Not a legend. A fact.

A Kingdom Born from Greatness

Around 1180 AD, the city of Benin was established — and by around 1200 AD, Oba Eweka I had founded the royal dynasty that would endure for centuries. Located in present day Edo State, Nigeria, Benin was not a simple chiefdom or village settlement. It was a sophisticated, organized state complete with a palace complex, a military structure, extensive trade networks, and a powerful administrative system that commanded respect across the entire region.

Then came the ruler who would take everything even further. Then came Oba Ewuare the Great.

The Golden Age

From around 1440 to 1473, Oba Ewuare the Great transformed Benin into one of the most powerful kingdoms in all of West Africa. He rebuilt the capital city from the ground up, expanded the kingdom's borders through a series of military campaigns, and laid the foundations for the artistic and cultural golden age that would define Benin's legacy for centuries to come.

The Art That Stunned the World

From the 14th century onward, Benin's royal craftsmen produced some of the most extraordinary art in human history, using a technique called lost wax casting to create intricate brass and bronze sculptures of breathtaking detail. When a Portuguese explorer arrived at Benin in 1485, he encountered a civilization whose craftsmanship was unlike anything Europeans had ever witnessed.

The raw material for these bronzes came partly from brass manillas traded through the Portuguese commercial exchange. These works were not simple trinkets or decorative objects. They were royal records, political statements, and cultural archives rendered permanently in metal for generations to come.

Then in 1897, British forces stormed Benin City in what they called a Punitive Expedition and looted more than 3,000 bronze sculptures and other royal treasures. Those pieces now sit in museums across Europe and America, far from the land where they were born. The restitution movement is growing, with some institutions beginning to return pieces to Nigeria. But the work is far from finished.

Walls That Shook the World

Here is a fact that should be taught in every school across the continent. The Kingdom of Benin constructed an earthwork system measuring over 16,000 kilometres in total length, earning a Guinness World Record as the longest earthworks of the pre-mechanical era. The walls themselves reached up to 9 metres high, with a surrounding ditch reaching 17 metres from the bottom of the ditch to the top of the rampart.

That is longer than the Great Wall of China.

These were not primitive trenches. They were precision engineered, built over centuries, and designed to protect a civilization that had every right to defend what it had created.

Why This Matters

The story of the Kingdom of Benin is the story of what Africa built long before colonialism arrived to rewrite the narrative. It is the story of architects, engineers, artists, diplomats, and kings who created something extraordinary and enduring.

Nigeria carries this legacy. Every Nigerian carries it.

The Benin Bronzes are more than art. They are proof. The walls are more than earthworks. They are a testament. And the kingdom that built them is more than history. It is an inheritance.

The question now is whether we will claim it.

The Benin Kingdom's walls were longer than the Great Wall of China, yet most of us never learned this in school. What part of Nigeria's precolonial history shocked you the most when you first discovered it?

Photos: (1) Brass Head of an Oba (18th century), Brooklyn Museum. Credit: Brooklyn Museum / Wikimedia Commons (CC BY 3.0). (2) Benin Bronzes at the British Museum (2023). Credit: Geni / Wikimedia Commons (CC BY-SA 4.0). (3) Benin Bronze sculptural bust. Credit: Wikimedia Commons (Public Domain).

#KingdomOfBenin #BeninBronzes #NigerianHistory #PrecolonialAfrica #BeninWalls #AfricanHeritage #EdoHistory #NigeriaProud #AfricanCivilization #ObaEwuare #TheLens #NigerianHeritage #BlackHistory`;

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

  console.log('Uploading image 1 (Brass Head of an Oba, Brooklyn Museum)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Benin Bronzes at British Museum)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Benin Bronze Sculptural Bust)...');
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
