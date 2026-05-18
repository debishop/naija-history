/**
 * Publish script — Blood on the Streets of Kano: The 1953 Kano Riots
 * (The Lens Facebook Page, Today in Nigeria History — Sunday May 18, 2026)
 *
 * Three-image gallery post. Image order:
 *   1. Chief Anthony Enahoro (1957) — mover of the 1953 self-government motion
 *   2. Sir Ahmadu Bello, Sardauna of Sokoto (1959) — NPC leader who opposed the motion
 *   3. Emir of Kano on the March (c.1910) — historical portrait of Kano's pre-riot era
 *
 * Image sources: Wikimedia Commons.
 *   Image 1: CC BY-SA 4.0 (Wikimedia user "Bendel")
 *   Images 2 & 3: Public Domain
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL = 'https://upload.wikimedia.org/wikipedia/commons/8/80/Chief_Anthony_Enahoro.png';
const IMAGE_1_CAPTION =
  'Chief Anthony Enahoro, 1957. As an Action Group MP, he moved the historic 1956 self-government motion in the House of Representatives in March 1953, setting off the chain of events that led to the Kano Riots. Photo: Wikimedia Commons / "Bendel" (CC BY-SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/2/2c/Sir_Ahmadu_Bello_%281959%29.jpg';
const IMAGE_2_CAPTION =
  'Sir Ahmadu Bello, Sardauna of Sokoto, 1959. Leader of the Northern People\'s Congress, he led Northern opposition to the 1956 self-government motion, arguing the North needed more time before independence. Photo: Eliot Elisofon / Smithsonian Institution via Wikimedia Commons (Public Domain).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/1c/Emir_of_Kano_c.1910.jpg';
const IMAGE_3_CAPTION =
  'The Emir of Kano on the march, circa 1910. Kano was one of the most important cities in colonial Northern Nigeria, a centre of Islamic learning, trade, and Hausa-Fulani political authority. The city bore the weight of the 1953 riots that exposed Nigeria\'s deepest political fault lines. Photo: E.D. Morel via Wikimedia Commons (Public Domain).';

const POST_BODY = `BLOOD ON THE STREETS OF KANO

The Day Nigeria's Political Crisis Became a Massacre

On May 18, 1953, the British colonial government declared a State of Emergency across Northern Nigeria. It came after two days of violence on May 16 and May 17 that had left 46 people dead, more than 200 wounded, and an entire country shaken to its foundation. The 1953 Kano Riots were not random acts of mob violence. They were the deadly collision of two different visions for what Nigeria should become. (Source: Wikipedia; FCTEMIS Academic Notes; UK Parliament Hansard, May 20, 1953)

It started with a motion.

In March 1953, Chief Anthony Enahoro, a young Action Group politician from what is now Edo State, stood on the floor of the House of Representatives in Lagos and moved that Nigeria be granted self government by 1956. For the Action Group and the NCNC, this was a natural next step. The British had promised independence, and they wanted a date on it. (Source: Wikipedia; OldNaija)

The North was not ready.

The Northern People's Congress, led by Ahmadu Bello, the Sardauna of Sokoto, rejected the motion. For the NPC, self government by 1956 was a trap: a deal that would hand power to the more educated and politically organised South before the North could build its institutions. They amended the motion to read "as soon as practicable" instead of 1956. When the NPC delegation returned to Kano, they were received as heroes who had stood firm against southern ambition. (Source: Wikipedia; Face2Face Africa; OldNaija)

Then came the tour.

Chief Samuel Akintola and a delegation of Action Group politicians arrived in Kano in May 1953 to hold political rallies in the North. To Northern residents, this felt like a direct provocation: southern politicians entering their territory to campaign for a policy the North had just defeated. Tension built rapidly. On May 16, a crowd gathered near the railway station where the delegation had arrived. What began as shouting became stone throwing and then open violence. (Source: Wikipedia; OldNaija; The Guardian Nigeria)

The violence erupted on May 16 and continued through May 17.

Southern residents in the Sabon Gari quarter in Kano, particularly Igbo residents, bore the brunt of the violence as mobs moved through the city. Houses were attacked. Businesses were looted and burned. People were killed in the streets. When it was over, 46 people had lost their lives and more than 200 had been injured. The colonial government imposed a curfew and rushed in reinforcements before declaring the State of Emergency on May 18. (Source: Wikipedia; FCTEMIS Academic Notes; Face2Face Africa)

Two days later, on May 20, 1953, the British Parliament held an emergency debate. Minister of State for Colonial Affairs Henry Hopkinson addressed the House of Commons. His words made clear what everyone now understood: Nigeria could not continue under a constitutional arrangement that forced regions with fundamentally different interests and timelines into a single political space. (Source: UK Parliament Hansard, May 20, 1953)

What followed changed Nigeria permanently.

The Lyttelton Constitution of 1954 reorganised Nigeria into a federation of three regions, each with its own government and legislature. Power was decentralised. The federal structure that carried Nigeria to independence in 1960 was built on this foundation. (Source: Wikipedia; FCTEMIS Academic Notes; The Guardian Nigeria)

More than seventy years later, the arguments that lit Kano on fire in 1953 are still very much alive. Debates about resource control, regional autonomy, and equitable development remain at the centre of Nigerian politics. The Kano Riots did not resolve those tensions. They simply made them impossible to ignore any longer. (Source: The Guardian Nigeria)

Today in Nigeria History, we remember the 46 lives lost in those days of violence, and the question their deaths forced on the country: what kind of Nigeria did everyone actually want?

That question has never been fully answered. Do you think Nigeria's federal structure has served the country well, or has it created more problems than it solved? Share your thoughts in the comments.

#NigerianHistory #TodayInHistory #KanoRiots1953 #NigeriaFederalism #NeverForget #AfricanHistory #May18 #ColonialHistory #NaijaHistory #NigeriaStrong #OurHistory`;

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

  console.log('Uploading image 1 (Chief Anthony Enahoro)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Sir Ahmadu Bello)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Emir of Kano c.1910)...');
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
