/**
 * Publish script — He Signed One Decree. Fifty Three Years Later, Every Nigerian Graduate Still Lives With What It Said.
 * (The Lens Facebook Page, Today in Nigeria History — Friday May 22, 2026)
 *
 * Single-image post. Image:
 *   1. Nigerian corps members during swearing in ceremony at NYSC Orientation Camp — CC BY-SA 4.0
 *      (Vitusemmanuelnnaemeka via Wikimedia Commons)
 *
 * Image source: Wikimedia Commons.
 * Draft sourced from THEAAA-620.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/d/de/Corp_Members_During_Swearing-in_Ceremony_at_NYSC_Orientation_Camp.jpg';
const IMAGE_1_CAPTION =
  'Nigerian corps members during a swearing in ceremony at an NYSC Orientation Camp. The National Youth Service Corps was founded on May 22, 1973 by General Yakubu Gowon as a post Civil War instrument of national integration. Credit: Vitusemmanuelnnaemeka via Wikimedia Commons (CC BY SA 4.0).';

const POST_BODY = `May 22, 1973. A general signs a decree. Within two months, 2,364 young Nigerians are on their way to communities they have never seen and people they have never known.

It began with a war, and a question.

Three years earlier, the Nigerian Civil War had ended. Approximately three million people had died. The country that remained was one nation on paper but was still quietly at war with itself. Communities that had once traded with each other were now silent with grief and suspicion. General Yakubu Gowon had declared no victor, no vanquished, but everyone knew that declarations alone cannot heal people. (Source: Pulse Nigeria, "50 years ago, Gowon created NYSC to stop another civil war")

Gowon built his rebuilding plan around three pillars: Reconciliation, Reconstruction, and Rehabilitation. Roads and buildings could be repaired with money and labour. But how do you rebuild the trust between people who had stood on opposite sides of one of Africa's bloodiest conflicts? (Source: Pulse Nigeria, "50 years ago, Gowon created NYSC to stop another civil war")

On May 22, 1973, Gowon signed Decree No. 24, and the National Youth Service Corps was born. Every Nigerian graduate under the age of 30 would be posted to serve for one year in a state different from their state of origin. Not in their hometown. Not among their own people. Somewhere else. Someone else's home. (Source: Wikipedia, National Youth Service Corps; NYSC Official Website)

The mind behind this idea was Chief Adebayo Adedeji, then Federal Commissioner for Economic Development and the intellectual architect of the scheme. Adedeji saw something bigger than a post war remedy. He saw a permanent instrument for building a nation. Young Nigerians would live beside each other, eat from each other's kitchens, and discover that the stranger they had been taught to fear was simply a neighbour they had never yet met. (Source: The Beam Media, "The History and Visionaries Behind the NYSC")

Colonel Ahmadu Adah Alli became the first Director General of the Corps, giving the scheme its operational structure from the very beginning. (Source: The Beam Media, "The History and Visionaries Behind the NYSC")

Less than seven weeks after the decree was signed, on July 2, 1973, the first batch of corps members reported for duty. There were 2,364 of them. Fresh graduates, packed and posted to communities they had never visited, among people whose customs were unfamiliar. That was the whole point. (Source: Class Notes NG, "Establishment of NYSC, May 22, 1973")

What Gowon and Adedeji understood is something easy to say and difficult to achieve: you cannot legislate unity. You can only create the conditions for it. The Corps was their attempt to do exactly that, one posting at a time, one friendship at a time, one year at a time.

Fifty three years later, millions of Nigerians carry the NYSC discharge certificate. For many, the service year was the first time they truly left home. The first time they lived among people who were nothing like them. And the first time they discovered just how much they had in common. (Source: Wikipedia, National Youth Service Corps)

The debates about the Corps are real. Security risks in certain states have made some postings dangerous. Critics argue the scheme no longer reflects the Nigeria it was designed to build. The conversations are worth having.

But the question Gowon asked in 1973 still stands: how do you build one country from a people who have never truly met each other?

The Corps was his answer. Nigeria is still deciding if it was enough.

Was NYSC the greatest gift Gowon gave Nigeria? Or has it outlived its purpose? Tell us what you think in the comments.

Photo: Nigerian corps members during a swearing in ceremony at an NYSC Orientation Camp. Credit: Vitusemmanuelnnaemeka via Wikimedia Commons (CC BY SA 4.0).

#NYSC #NationalYouthServiceCorps #TodayInNigeriaHistory #NigerianHistory #GowonLegacy #NigeriaUnity #TheLens #NigerianYouth #NigeriaAt53 #PostWarNigeria #NigeriaRemembers`;

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

  console.log('Uploading image (NYSC corps members swearing in ceremony)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image uploaded: ${photoId1}`);

  console.log('Publishing post with image...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
