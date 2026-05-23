/**
 * Publish script — They Marched for Peace. The City Burned for Three Months. The Kaduna Sharia Riots of 2000.
 * (The Lens Facebook Page, Today in Nigeria History — Saturday May 23, 2026)
 *
 * Two-image post. Images:
 *   1. Bishop Josiah Idowu Fearon — CC BY 2.0 (via Wikimedia Commons)
 *   2. Kaduna River, Kaduna, Nigeria — CC BY-SA 4.0 (via Wikimedia Commons)
 *
 * Image source: Wikimedia Commons.
 * Draft sourced from THEAAA-645.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/6/63/Archbishop_Josiah_Fearon_OUR_DIFFERENCES_ARE_NOT_THE_CAUSE_OF_OUR_PROBLEMS._THEY%E2%80%99RE_OUR_SALVATION._%2822671495688%29_%28cropped%29.jpg';
const IMAGE_1_CAPTION =
  'Bishop Josiah Idowu Fearon, Anglican Bishop of Kaduna and peace builder during the 2000 Kaduna Sharia Riots. He cofounded the Centre for the Study of Islam and Christianity and later became Secretary General of the Anglican Communion. Credit: via Wikimedia Commons (CC BY 2.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/9/90/Kaduna_River%2C_Kaduna_%28Nigeria%29%2C_2007.JPG';
const IMAGE_2_CAPTION =
  'The Kaduna River, Kaduna, Nigeria, 2007. Credit: via Wikimedia Commons (CC BY SA 4.0).';

const POST_BODY = `May 23, 2000. The fires were finally going out in Kaduna. But the city that remained was not the same city that had stood three months earlier.

It began with a law, and a march.

On February 3, 2000, Governor Ahmed Mohammed Makarfi announced that Kaduna State would adopt Sharia law. For Christian communities in the city, it was a shock. Kaduna was unlike most northern Nigerian states. Its population was almost equally divided between Muslims and Christians, a balance that had long made it both a symbol of coexistence and a flashpoint. (Source: Wikipedia, 2000 Kaduna riots)

On February 21, the Christian Association of Nigeria organised a peaceful protest march against the announcement. Within hours, Muslim youths clashed with marchers. The violence that followed was not a riot in the ordinary sense. It was a collapse. Churches and mosques were set on fire. Families fled on foot. Neighbourhoods that had coexisted for decades turned on each other in a single afternoon. (Source: Wikipedia, 2000 Kaduna riots; Human Rights Watch, "The Miss World Riots: Continued Impunity for Killings in Kaduna," 2003)

This first wave, which Nigerians came to call "Sharia 1," burned from February 21 to 25. It stopped. People across Nigeria hoped the worst was over.

It was not.

On May 22, the violence returned. "Sharia 2" swept through the city for two days, killing and displacing with no less ferocity than before. When it ended on May 23, the toll was almost beyond reckoning.

A judicial commission placed the official death toll at 1,295 people. Human Rights Watch estimated the true number at between 2,000 and 5,000. Approximately 125,000 people were driven from their homes. The physical destruction was vast: 123 churches, 55 mosques, 1,944 houses and 746 vehicles destroyed. (Source: Wikipedia, 2000 Kaduna riots; Human Rights Watch, 2003; IOSR Journal, "Kaduna State Sharia Crisis of 2000")

What came after the fire was nearly as devastating as the fire itself. Human Rights Watch documented a systematic failure to prosecute anyone responsible. Perpetrators on both sides walked free. Communities that had lost everything were given no justice and no accountability. (Source: Human Rights Watch, "The Miss World Riots: Continued Impunity for Killings in Kaduna," 2003)

The city never looked the same again. Muslim residents concentrated in the north of Kaduna. Christian residents moved to the south. The violence accelerated calls to split Kaduna State into separate zones entirely. Streets that had once held both communities became quiet reminders of what had been lost. (Source: The New Humanitarian, "Focus: Tension Between Communities in Kaduna State," 2001)

In the middle of all of this, a few voices refused to let the city fracture completely. Bishop Josiah Idowu Fearon, the Anglican Bishop of Kaduna, became one of the most consequential peace builders of the crisis. Together with Muslim leaders, he established the Centre for the Study of Islam and Christianity and dedicated years to interfaith dialogue, insisting that the two religions shared far more than the violence had revealed. He later became Secretary General of the Anglican Communion, carrying the lessons he had learned in Kaduna to a global audience. (Source: Wikipedia, Josiah Idowu Fearon; Berkley Center, Georgetown University, "A Discussion with Bishop Josiah Fearon of Kaduna, Nigeria")

The Kaduna Sharia Riots are widely described as the worst outbreak of violence in Nigeria since the Civil War. They remain a warning about how quickly a carefully managed diversity can become an unmanaged catastrophe. They are also a reminder that even in the worst moments, individual choices matter. (Source: Wikipedia, 2000 Kaduna riots)

Twenty five years later, the divided city remains divided. The question Kaduna quietly asks every year is one Nigeria has never fully answered: is it possible to truly live together again?

What do you think is the most important step for Nigerian communities to heal from religious or ethnic violence? Share your thoughts in the comments.

Photos: (1) Bishop Josiah Idowu Fearon, Anglican Bishop of Kaduna. Credit: via Wikimedia Commons (CC BY 2.0). (2) The Kaduna River, Kaduna, Nigeria. Credit: via Wikimedia Commons (CC BY SA 4.0).

#KadunaRiots #TodayInNigeriaHistory #NigerianHistory #TheLens #ReligiousViolence #NigeriaRemembers #KadunaState #NigeriaUnity #NeverAgain #PeaceBuilding #InterfaithNigeria`;

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

  console.log('Uploading image 1 (Bishop Josiah Idowu Fearon)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Kaduna River)...');
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
