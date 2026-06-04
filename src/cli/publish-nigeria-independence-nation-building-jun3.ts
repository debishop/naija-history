/**
 * Publish script — The Night Nigeria Was Born: The Untold Stories Behind October 1, 1960
 * (The Lens Facebook Page, Wednesday June 3, 2026 — Independence and Nation Building)
 *
 * Single-image post. Image:
 *   1. Jaja Wachuku, Prime Minister Abubakar Tafawa Balewa, and Princess Alexandra of Kent
 *      at Nigeria's Independence Day, Lagos Race Course, October 1, 1960.
 *      Photographer: Mark Kauffman (LIFE Magazine)
 *      License: Public Domain (published 1960; 50+ years elapsed, public domain in Nigeria and US)
 *      Source: Wikimedia Commons
 *
 * Additional visual assets (not in this post, available for repurposing):
 *   2. Azikiwe swearing Balewa as Prime Minister, 1960
 *      Photographer: Private Photo Library Eko Adele / Emi Ni Afrika
 *      License: Public Domain (Nigeria Copyright Act, 50+ years)
 *      Source: https://upload.wikimedia.org/wikipedia/commons/8/81/Azikiwe_swearing_Balewa_as_prime_minister%2C_1960.jpg
 *   3. Ahmadu Bello at Nigerian Independence Celebration in Lagos, October 1, 1960
 *      Photographer: Moneta Sleet Jr.
 *      License: Public Domain (Nigeria Copyright Act, 50+ years) — Source: Saint Louis Art Museum
 *      Source: https://upload.wikimedia.org/wikipedia/commons/a/ab/Ahmadu_Bello_at_Nigerian_Independence_Celebration_in_Lagos.png
 *
 * Archive video (included in post body):
 *   "Nigerian Independence Day: Incredible Archive Footage Captures Nigeria's New Beginnings (1960)"
 *   YouTube: https://www.youtube.com/watch?v=arpys66YjFE
 *
 * Draft sourced from THEAAA-733. Research brief from THEAAA-732. Visual assets: THEAAA-735.
 * Word count: ~640 words (within 600-700 requirement).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/0/03/Jaja-Wachuku%2C_Abubakar_Tafawa_Balewa_and_Princess_Alexandra_of_Kent_on_Nigeria%27s_Independence_Day_October_1%2C_1960.jpg';
const IMAGE_CAPTION =
  'Jaja Wachuku (Nigeria\'s first UN Ambassador), Prime Minister Abubakar Tafawa Balewa, and Princess Alexandra of Kent at Nigeria\'s Independence Day ceremony, Lagos Race Course, October 1, 1960. Photographer: Mark Kauffman (LIFE Magazine). Public Domain.';

const POST_BODY = `The Night Nigeria Was Born: The Untold Stories Behind October 1, 1960

At the stroke of midnight on October 1, 1960, something happened in Lagos that shook the continent and moved millions to tears.

The British Union Jack was lowered. A new green and white flag rose over Lagos Race Course before an estimated crowd of 30,000 to 40,000 jubilant Nigerians. And just like that, the most populous country in Africa was free. (Source: Encyclopaedia Britannica, "Nigeria: Independent Nigeria")

But who were the people behind that extraordinary moment? And what happened to the dream they built?

The Man Who Spoke for a Nation

Standing at the podium that night was Sir Abubakar Tafawa Balewa, Nigeria's first Prime Minister. A schoolteacher from Bauchi who rose through the ranks of colonial governance, Balewa delivered words that still echo today.

"The first of October 1960 is a date to which for two years every Nigerian has been eagerly looking forward. At last, our great day has arrived, and Nigeria is now indeed an independent sovereign nation." (Source: BlackPast.org, "1960 Sir Abubakar Tafawa Balewa, Independence Day Speech")

He added: "Without bitterness, without bloodshed, without violence, Nigeria has attained her freedom and sovereignty." These words were not just rhetoric. They were a miracle. After nearly a century of colonial rule, Nigeria had become independent through negotiation, not war. (Source: Legit.ng, "Nigeria Independence Day: Full Text of Tafawa Balewa's Speech")

The Father of Nigerian Nationalism

Standing beside Balewa was Dr. Nnamdi Azikiwe, known across Africa as Zik. Born in Zungeru in 1904, Azikiwe had spent decades as a journalist and nationalist agitator, building the case for Nigerian independence through his newspapers and speeches. He became Nigeria's first indigenous Governor General in 1960, then its first President when Nigeria became a republic on October 1, 1963. (Source: Wikipedia, "Nnamdi Azikiwe")

Azikiwe carried a singular vision: "The need to revive the stature of man in Africa and restore the dignity of man in the world." (Source: Wikipedia, "Nnamdi Azikiwe")

The Young Student Who Gave Nigeria Its Flag

Here is the story most Nigerians have never fully heard. The green and white flag that flew over Lagos on that historic midnight was designed by a young engineering student named Michael Taiwo Akinkunmi. He was just 23 years old and studying at Norwood Technical College in London when he saw a newspaper advertisement seeking flag design entries for the newly independent nation. He entered his green, white, green design and won 100 British pounds. (Source: Wikipedia, "Taiwo Akinkunmi")

Akinkunmi returned to Nigeria and lived most of his life as a quiet civil servant in Ibadan, his monumental contribution known to few. He died on August 29, 2023. His story is a powerful reminder of how ordinary Nigerians built an extraordinary nation.

What the Founders Built

The years immediately following independence were a season of genuine nation building. Under Balewa's administration, the University of Nigeria at Nsukka was established in 1960, offering Nigerians access to world class higher education on home soil. The First National Development Plan, launched in 1962, allocated approximately £676.8 million toward infrastructure, agriculture, industry, and education. Nigeria joined the United Nations in October 1960 and quickly became a leading voice for African solidarity on the world stage. (Source: Wikipedia, "First Nigerian Republic")

The dream, however, faced an early and brutal interruption. On January 15, 1966, a military coup overthrew the government and assassinated Balewa, ending the First Republic.

The Unfinished Vision

Sixty five years after independence, the story of October 1, 1960, is not simply history. It is a mirror. Balewa's vision of a Nigeria that serves Africa and the world remains both an aspiration and a challenge. The flag Akinkunmi drew still flies. The question is whether its promise is being kept.

What does Nigerian independence mean to you today? Share your thoughts below.

Watch rare archive footage from independence night: https://www.youtube.com/watch?v=arpys66YjFE

#NigerianIndependence #October1st #NigeriaAt65 #AfricanHistory #NigerianHistory #TafawaBalewa #NnamdiAzikiwe #TheLensNigeria #NigeriaStrong #ProudlyNigerian #AfricanPride #IndependenceDay #NaijaPride`;

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

  console.log('Uploading image (Nigeria Independence Day 1960)...');
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
