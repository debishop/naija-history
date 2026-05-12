/**
 * Publish script — OAU Renaming: Three Days After He Died
 * (Today in Nigerian History, May 12, 2026)
 *
 * Three-image post using Facebook multi-photo attach approach.
 * Image order:
 *   1. Chief Obafemi Awolowo portrait, 1959 (hero/lead)
 *   2. OAU Campus Gate, Ile Ife (place/institution)
 *   3. Awolowo Statue, Allen Roundabout, Lagos (legacy/monument)
 *
 * Sources: Wikipedia (Obafemi Awolowo, Obafemi Awolowo University)
 *          OAU Official Site (oauife.edu.ng)
 *          Federal Ministry of Information
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL = 'https://upload.wikimedia.org/wikipedia/commons/7/74/Obafemi_Awolowo.jpg';
const IMAGE_1_CAPTION =
  'Chief Obafemi Awolowo, first Premier of the Western Region of Nigeria, photographed in 1959. Source: Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/4/49/A_view_of_Obafemi_Awolowo_University_campus_gate.jpg';
const IMAGE_2_CAPTION =
  'The iconic gate of Obafemi Awolowo University, Ile Ife, Osun State, Nigeria. Source: Wikimedia Commons.';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/19/Chief_Obafemi_Awolowo_statue%2CAllen_roundabout_%2CLagos.jpg';
const IMAGE_3_CAPTION =
  'Statue of Chief Obafemi Awolowo at Allen Roundabout, Lagos, Nigeria. Source: Wikimedia Commons.';

const POST_BODY = `Today in Nigerian History | May 12, 1987

Three Days After He Died, Nigeria Made His Name Immortal

On May 9, 1987, Nigeria lost one of its greatest sons. Chief Obafemi Awolowo was gone. The nation was in mourning. And then, just three days later, on May 12, 1987, something happened that said more than any eulogy ever could. General Ibrahim Babangida signed a military decree, and the University of Ife became Obafemi Awolowo University forever. (Source: Wikipedia, Obafemi Awolowo University)

That is how you honor a giant.

Who was Chief Obafemi Awolowo? Born in Ikenne, Ogun State in 1909, Awolowo grew into one of the most consequential political leaders Nigeria has ever produced. He served as the first Premier of the Western Region from 1954 to 1959, and in that role, he did not just govern. He transformed. (Source: Wikipedia, Obafemi Awolowo)

Under his leadership, the Western Region became the first in Africa to introduce free primary education. He also launched free healthcare for children across the region. These were not promises. They were delivered. He changed the daily lives of millions of ordinary Nigerians before those words were fashionable in any boardroom or party manifesto. (Source: Wikipedia, Obafemi Awolowo)

His industrialization agenda transformed the Western Region into one of Nigeria's most economically productive areas, building infrastructure and attracting investment that others would spend decades trying to replicate. (Source: Wikipedia, Obafemi Awolowo)

He gave Africa its first television station. In 1959, Awolowo's government established the Western Nigeria Television Service, WNTV, the first television broadcasting service in sub-Saharan Africa. (Source: Wikipedia, Obafemi Awolowo) While others were still debating what was possible, Awolowo was already showing what was done.

He gave Nigeria its currency identity. When he served as Federal Commissioner for Finance, Awolowo proposed and championed the name Naira for the national currency. (Source: Wikipedia, Obafemi Awolowo) Every time a Nigerian pulls out cash today, they are, whether they know it or not, touching Awolowo's fingerprints on this nation.

The university that now carries his name was founded in 1961 by Samuel Ladoke Akintola, then the Premier of the Western Region. (Source: OAU Official Site) It sits in the ancient city of Ile Ife in Osun State, and its campus covers more than 13,000 acres of land, making it one of the largest university campuses on the African continent. (Source: Wikipedia, Obafemi Awolowo University) Under Vice Chancellor Hezekiah Oluwasanmi, the university relocated to its now iconic sprawling campus and built the academic reputation it carries today. (Source: OAU Official Site)

Today, Obafemi Awolowo University is consistently ranked among the top universities in Nigeria and across Africa. It has produced lawyers, doctors, engineers, writers, and innovators who have gone on to shape Nigeria and the world. Every student who walks through the famous gate in Ile Ife walks beneath a name that stood for something.

When Babangida signed that decree on May 12, 1987, he was not doing Awolowo a favor. He was paying a debt Nigeria owed. A man who brought free education, free healthcare for children, sub-Saharan Africa's first television station, and the name of the national currency deserved more than a statue. He deserved a living institution. He deserved a place where young Nigerians would learn, grow, and carry forward the belief that excellence and service are not mutually exclusive.

Emeka Ojukwu called him the best president Nigeria never had. (Source: Wikipedia, Obafemi Awolowo) Awolowo ran for president and lost. But his legacy did not need the title. It outlasted the men who beat him.

Three days after he died, Nigeria gave him forever.

Related video:
Awolowo: A Political Giant: https://www.youtube.com/watch?v=LZU3qr4_FBo

Sources: Wikipedia | OAU Official Site | Federal Ministry of Information

What do you think was Awolowo's greatest gift to Nigeria? Was it free education, the television station, the Naira, or something else entirely? Tell us in the comments.

#ObafemiAwolowo #OAU #NigerianHistory #TodayInNigerianHistory #TheLens #NigeriaProud #AfricanHistory #NigerianHeritage #Awolowo #WesternNigeria #FreeEducation #Nigeria`;

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

  console.log('Uploading image 1 (Awolowo portrait — hero)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (OAU campus gate)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Awolowo statue, Lagos)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with three images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
