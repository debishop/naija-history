/**
 * Publish script — THEY CAME WITH THEIR BODIES AND THEIR VOICES
 * (The Lens Facebook Page, Tuesday May 27, 2026 — Colonial Era and Resistance)
 *
 * Two-image post. Images:
 *   1. Memorial at the Women's War Site — CC BY-SA 4.0 (Wikimedia Commons)
 *   2. Sculpture: End of the Aba Women's Riot — CC BY-SA 4.0 (Wikimedia Commons)
 *
 * Draft sourced from THEAAA-711. Visual assets from THEAAA-712.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/5/55/The_Mock_Grave_of_the_1929_Women_Riot.jpg';
const IMAGE_1_CAPTION =
  'The Mock Grave in Memory of the 1929 Women\'s War. Memorial plaque at the Women\'s War site. Credit: Dappa Solomon / I-PAC PICTURES via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/e/eb/End_of_Aba_women_riot.jpg';
const IMAGE_2_CAPTION =
  'Contemporary sculpture commemorating the Aba Women\'s Riot, University of Uyo, Akwa Ibom State, Nigeria. Credit: Harriwillz via Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `They Came With Their Bodies and Their Voices. Britain Answered With Bullets.

In November 1929, tens of thousands of Igbo women across southeastern Nigeria did something that would shake the foundations of British colonial power. They stood up. Together.

What happened next became one of the most extraordinary acts of collective resistance in African history. It is known as Ogu Umunwanyi, the Women's War. And it began with one woman refusing to be silenced.

On November 18, 1929, a census enumerator named Mark Emereuwa arrived at the home of a widow named Nwanyeruwa in Oloko village. The British colonial government had been conducting a census since October 14, 1929, a survey that many Igbo people feared was a precursor to taxing women. When Emereuwa asked Nwanyeruwa to count her goats and people, she refused and accused him of threatening her. A physical altercation broke out. Within days, ten thousand women had gathered at the Native Administration compound in Oloko. (Sources: Wikipedia, Women's War; Global Nonviolent Action Database)

The spark was lit. And it would not be extinguished.

The uprising spread across six thousand square miles of southeastern Nigeria. At least 25,000 women mobilized, using a practice as old as Igbo society itself known as "sitting on a man." In this tradition, women who had been wronged would gather outside the home of the offender, singing, dancing, and making noise until justice was delivered. (Source: Van Allen, Judith, 1975, "Aba Riots or the Igbo Women's War?", Ufahamu)

But this was no quiet protest. The women attacked Native Courts, which were symbols of British imposed rule and corruption. They demanded the removal of the Warrant Chiefs, African men appointed by the British to govern, many of whom had abused their power terribly. They looted European trading stores and released prisoners from colonial jails. They wore palm fronds, painted themselves in white, and chanted war songs that had not been heard in a generation. (Sources: BlackPast, Aba Women's Riots; Afigbo, Adiele E., 1972, The Warrant Chiefs)

At the center of the storm were remarkable leaders. Ikonnia, Nwannedia, and Nwugo, known as the Oloko Trio, coordinated the organized protests that spread the uprising across the region. Mary Okezie, a literate and composed woman, submitted a formal grievance memo to the British Commission of Inquiry that followed, giving written voice to the community's demands. (Source: Global Nonviolent Action Database)

The British colonial government panicked. And then it reached for its guns.

In December 1929, British soldiers opened fire on crowds of unarmed women. Approximately 55 women were killed. More than 50 were wounded. Not a single British soldier died. (Sources: BlackPast, Aba Women's Riots; Falola, Toyin, 2008, A History of Nigeria, Cambridge University Press)

The massacre did not end the resistance. It amplified it.

In March 1930, the British were forced to convene the Aba Commission of Inquiry. The findings were damning. By 1930, the Warrant Chief system, that corrupt colonial imposition, was abolished entirely. Women were appointed to Native Courts for the first time in the history of colonial Nigeria. The plan to impose taxes on women was abandoned, confirming what the women had feared from the very beginning: the census had been a prelude to taxing them. (Sources: Wikipedia, Women's War; Global Nonviolent Action Database)

They had won. Not with weapons. With their bodies, their voices, and an ancient tradition of demanding accountability.

Ogu Umunwanyi stands as proof that ordinary people, women dismissed by a colonial government as beneath political consideration, could move history. They changed the law. They dismantled a corrupt system. And they did it in less than three months.

Nwanyeruwa, Ikonnia, Nwannedia, Nwugo, and Mary Okezie deserve to be household names in every Nigerian home.

What do you think? Were you taught about the Aba Women's War in school? Tell us what you remember. If you were not, why do you believe this story has been left out of so many classrooms?

Photos: (1) The Mock Grave in Memory of the 1929 Women's War. Credit: Dappa Solomon / I-PAC PICTURES via Wikimedia Commons (CC BY-SA 4.0). (2) Sculpture commemorating the Aba Women's Riot, University of Uyo. Credit: Harriwillz via Wikimedia Commons (CC BY-SA 4.0).

#AbaWomensWar #OguUmunwanyi #NigerianHistory #IgboWomen #ColonialResistance #AfricanHistory #WomensRights #TheLens #NigerianHeritage #BlackHistory #ResistanceHistory #AfroPride #WomenWhoFightBack`;

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

  console.log('Uploading image 1 (Memorial at the Women\'s War Site)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Sculpture: End of the Aba Women\'s Riot)...');
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
