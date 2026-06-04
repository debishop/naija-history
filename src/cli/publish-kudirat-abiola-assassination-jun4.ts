/**
 * Publish script — She Died So Nigeria Could Live: The Murder That Still Haunts Us 30 Years Later
 * (The Lens Facebook Page, Thursday June 4, 2026 — Assassination of Kudirat Abiola)
 *
 * Single-image post. Image:
 *   1. Hafsat Abiola (daughter of Kudirat Abiola, founder of KIND) — CC BY 2.0 (Wikimedia Commons)
 *      Source: The Institute for Inclusive Security via Flickr / Wikimedia Commons
 *      Note: No freely licensed photograph of Kudirat Abiola herself exists on Wikimedia Commons.
 *            The only known image is marked "fair use" on Wikipedia and cannot be used commercially.
 *
 * Draft sourced from THEAAA-730. Research brief from THEAAA-730 issue description.
 * Word count: ~645 words (within 600–700 requirement).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/7/7b/Hafsat_Abiola_Nigerian_activist.jpg';
const IMAGE_CAPTION =
  'Hafsat Abiola, daughter of Alhaja Kudirat Abiola and founder of the Kudirat Initiative for Democracy (KIND), which carries her mother\'s legacy forward. Credit: The Institute for Inclusive Security via Wikimedia Commons (CC BY 2.0).';

const POST_BODY = `She Died So Nigeria Could Live: The Murder That Still Haunts Us 30 Years Later

Thirty years ago today, on the morning of June 4, 1996, a brave woman stepped into a white Mercedes Benz in Lagos and never came home.

Her name was Alhaja Kudirat Olayinka Adeyemi Abiola. She was 44 years old, a mother of seven children, and one of the most powerful voices in Nigeria's fight for democracy. By 12:30 that afternoon, she was dead. (Sources: Wikipedia; OldNaija)

Here is what happened that morning.

Kudirat was traveling to the Canadian High Commission in Lagos when, at approximately 9:30 AM near the 7Up bus stop on Oregun Road in Ikeja, two cars suddenly blocked her vehicle. Six heavily armed gunmen opened fire. A bullet struck Kudirat in the forehead. Her driver, Dauda Atanda, was also shot and killed. She was rushed to Eko Hospital on Mobolaji Bank Anthony Way in Ikeja, where doctors pronounced her dead between 12:15 and 12:30 PM. (Sources: OldNaija; Federal Ministry of Information)

Nigeria has never fully recovered from that morning.

Who Was Kudirat Abiola?

Kudirat was the senior wife of Chief MKO Abiola, the man who had won Nigeria's presidential election on June 12, 1993, in a contest widely described as the freest and fairest in the country's history. (Sources: Wikipedia; Historical Nigeria) When General Babangida's military government annulled those results, and when Sani Abacha later seized power and imprisoned MKO Abiola on treason charges in 1994, Kudirat did not retreat. She stepped forward.

She organized oil workers' strikes, rallied market women, students, and civil servants across the country. She co organized an eight week oil workers' strike in 1994, forcing international attention onto Abacha's brutal military regime. (Sources: Historical Nigeria; Pulse Nigeria) She became the undeniable face of resistance, standing in the public square where her husband could not.

She was not a politician. She was a wife and a mother who chose her country over her own safety, and she ultimately paid the highest price for that courage.

Who Killed Her?

General Abacha's Chief Security Officer, Major Hamza Al Mustapha, was charged with ordering the assassination. Kudirat's personal assistant, Alhaji Lateef Shofolahan, was alleged to have betrayed her location to the killers. (Sources: Wikipedia; Pulse Nigeria) Both were sentenced to death by hanging in January 2012, but a Lagos court released them on appeal in July 2013.

As of 2025, no one has been definitively convicted for her murder. In March 2025, the ECOWAS court dismissed the family's suit entirely. (Source: Wikipedia) Justice, for Kudirat Abiola, remains an open wound that Nigeria has yet to close.

The Legacy She Left Behind

Kudirat's assassination did not silence Nigeria. It galvanized it.

Her daughter, Hafsat Abiola, founded the Kudirat Initiative for Democracy (KIND) in her mother's memory. A cenotaph in Kudirat's honor stands along Mobolaji Johnson Way in Oregun, Lagos, erected by then Governor Bola Ahmed Tinubu. In 1998, New York City dedicated Kudirat Abiola Corner to her name. Radio Kudirat, a pro democracy shortwave station based in Norway, carried her legacy to the world. In 2014, the documentary film The Supreme Price told her story to a global audience. And in 2018, President Buhari declared June 12 Nigeria's official Democracy Day. (Source: Wikipedia) The very day Kudirat and her husband gave everything to defend now belongs to all Nigerians.

This year, 2026, marks 30 years since she was taken from us. Thirty years since a bullet tried to silence a movement. It did not succeed.

She was 44 years old. She was fearless. She was Nigeria.

Today, we remember Alhaja Kudirat Abiola.

What does her sacrifice mean to you? And do you believe justice for her murder will ever truly be served in Nigeria?

Photo: Hafsat Abiola, daughter of Kudirat Abiola, founder of the Kudirat Initiative for Democracy (KIND). Credit: The Institute for Inclusive Security (CC BY 2.0).

#KudiratAbiola #June4 #NigerianHistory #JusticeForKudirat #NeverForget #June12DemocracyDay #MKOAbiola #TheLens #DemocracyNigeria #HerstoryNigeria #Abacha30Years #NigeriaRemembers`;

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

async function publishWithPhoto(
  pageId: string,
  pageToken: string,
  photoId: string,
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const params = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
  });
  params.append('attached_media[0]', `{"media_fbid":"${photoId}"}`);

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

  console.log('Uploading image (Hafsat Abiola)...');
  const photoId = await uploadPhoto(pageId, pageToken, IMAGE_URL, IMAGE_CAPTION);
  console.log(`Image uploaded: ${photoId}`);

  console.log('Publishing post...');
  const postId = await publishWithPhoto(pageId, pageToken, photoId);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
