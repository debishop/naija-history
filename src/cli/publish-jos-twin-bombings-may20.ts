/**
 * Publish script — TWO BOMBS. 118 DEAD. The Day Boko Haram Brought Terror to the Heart of Nigeria
 * (The Lens Facebook Page, Today in Nigeria History — Wednesday May 20, 2026)
 *
 * Single-image post. Image:
 *   1. Cart pusher at Jos Terminus Market, Nigeria — CC BY-SA 4.0 (Adeniji A.O., Wiki Loves Africa 2017)
 *
 * Image source: Wikimedia Commons.
 * Draft sourced from THEAAA-597; Claim 11 revised per THEAAA-599 (CNN casualty discrepancy, not negotiation).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/b/ba/CartPusher_JosTerminusMarket_Nigeria.jpg';
const IMAGE_1_CAPTION =
  'A man pushing a wheelbarrow at the Jos Terminus Market, Nigeria. This market, once described as the largest indoor market in all of West Africa, was the target of two car bomb attacks on May 20, 2014, killing at least 118 people. Photo: Adeniji A.O. / Wiki Loves Africa 2017 via Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `TWO BOMBS. 118 DEAD.

The Day Boko Haram Brought Terror to the Heart of Nigeria

May 20, 2014 began like most Tuesdays in Jos. The Terminus Market, once the largest indoor market in all of West Africa, was packed with traders, buyers, and workers going about the business of their day. (Source: Wikipedia, Jos Main Market) Children ran errands. Merchants called out prices. Plateau State's capital city hummed with the ordinary, irreplaceable rhythm of Nigerian commerce and life. Nobody knew that by sunset, this city would be in mourning.

At 3:00 PM, a suicide car bomb tore through the heart of the Terminus Market. The explosion was devastating. Stalls collapsed. Fires swept across the market floor. Bodies lay where they fell. Screams rose over the smoke. Emergency responders rushed in immediately. They came to pull people from the rubble, to carry the wounded, to save what lives still could be saved.

Then, 30 minutes later, a second bomb detonated near a hospital right next to the market. This one was designed to kill the rescuers.

That was not an accident. That was a message.

At least 118 people were killed that afternoon. More than 56 others were wounded. Multiple bodies were burned beyond recognition in the wreckage. Some estimates placed the death toll as high as 150. In a single afternoon, one of the deadliest terrorist attacks in Nigerian history had unfolded in a market where people had come simply to earn a living. (Source: Wikipedia, 2014 Jos bombings)

Nigerian government officials and international analysts attributed the attack to Boko Haram, the extremist group already waging a brutal insurgency across Nigeria's northeast. VOA News reported that officials directly named Boko Haram as responsible. But what made May 20 so significant was not only the scale of the destruction. It was what it revealed about where the war was heading.

This was Boko Haram's fourth urban attack in six weeks. For years, the group had operated primarily in the northeast, far from Nigeria's political and commercial heartland. But now they were in Jos, the symbolic center of Nigeria's Middle Belt. As one analyst stated at the time, "They are trying to make the country ungovernable." (Source: Christian Science Monitor, 2014)

The timing was no coincidence. Just five weeks earlier, on April 14, 2014, Boko Haram had abducted 276 schoolgirls from the town of Chibok, sparking the global #BringBackOurGirls movement. The world was already watching Nigeria with growing alarm. And then came Jos.

President Goodluck Jonathan called the bombings "a tragic assault on human freedom." UK Foreign Secretary William Hague condemned them as a "cowardly, inhumane crime." The United States State Department called the attacks "unconscionable, terrorist acts." Words of condemnation circled the globe, but 118 people were already gone. (Source: Wikipedia, 2014 Jos bombings)

CNN's original report from May 20, 2014 captured the chaos that followed, including a stark discrepancy in the official death toll. NEMA coordinator Mohammed Abdulsalam reported 118 dead, while Plateau State Commissioner Chris Olakpe put the figure at just 46 killed with 45 injured. That the government could not agree on how many Nigerians had died, even as the nation mourned, revealed something deeply troubling: a government still struggling to comprehend the full scale of what it faced. (Source: CNN, May 20, 2014)

Twelve years later, Nigeria still reckons with that era. The northeast continues to recover. Displaced communities are still rebuilding. The scars on Jos run deep. And the Terminus Market, once West Africa's most celebrated trading hub, carries the memory of that Tuesday afternoon in its walls and in the silence of all the people who never came home.

They came for a market. They came for the rescuers. They came for a city already on its knees.

Jos did not break. But Nigeria would never be the same.

What do you remember about May 20, 2014? And what do you believe Nigeria must do to ensure that attacks like this never happen again? Share your thoughts in the comments.

#NigeriaHistory #JosBombings #NeverForget #BokoHaram #TodayInNigeriaHistory #NigeriaStrong #PlateauState #MiddleBelt #NigeriaRemembers #TheLens #EndTerrorism #Jos #NigeriaRises`;

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

  console.log('Uploading image (Cart pusher at Jos Terminus Market)...');
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
