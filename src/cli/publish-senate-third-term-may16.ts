/**
 * Publish script — The Day Nigeria Said No: 20 Years Since the Senate Stopped Obasanjo's Third Term
 * (The Lens Facebook Page, Today in Nigeria History — Friday May 16, 2026)
 *
 * Three-image gallery post. Image order:
 *   1. Nigerian National Assembly Building exterior (site of the vote)
 *   2. Nigeria Senate Red Chamber interior (where the vote happened)
 *   3. President Obasanjo at the White House, March 2006 (context)
 *
 * Images: Wikimedia Commons. Images 1 & 2 CC BY-SA 4.0; Image 3 Public Domain.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/f6/National_Assembly_Building%2C_Abuja%2C_Nigeria.jpg';
const IMAGE_1_CAPTION =
  'The Nigerian National Assembly Building, Abuja. Site of the historic May 16, 2006 Senate vote. Photo: Kabusa16 via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/1d/Nigeria_Senate_Building_%28Red_Chamber%29.jpg';
const IMAGE_2_CAPTION =
  'The Red Chamber of the Nigerian Senate, where the third-term amendment was defeated on May 16, 2006. Photo: Kabusa16 via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/8d/Olusegun_Obasanjo_with_George_Bush_March_29%2C_2006.jpg';
const IMAGE_3_CAPTION =
  'President Olusegun Obasanjo at the White House, March 29, 2006. Six weeks before the Senate would end his third-term bid. Photo: White House (Public Domain).';

const POST_BODY = `THE DAY NIGERIA SAID NO

Twenty Years Since the Senate Protected Your Future

On May 16, 2006, something extraordinary happened inside the Nigerian Senate Chamber in Abuja. A bill designed to extend President Olusegun Obasanjo's presidency beyond his second term came to a voice vote. When Senate President Ken Nnamani called for the noes, the chamber erupted. The sound was unmistakable. Without hesitation, Nnamani declared: "By this result, the Senate has said clearly and eloquently that we discontinue further proceedings on this amendment Bill." (Source: Mail & Guardian, May 16, 2006)

Today marks exactly 20 years since that moment. Nigeria's democracy had its finest hour not on a battlefield, but in a chamber where elected legislators looked power in the face and said no.

The story behind that vote is one of courage under enormous pressure. From late 2005, Obasanjo's political allies had been pushing a sweeping constitutional amendment package. Buried inside it was a clause that would have allowed a third presidential term, directly contradicting the 1999 Constitution, which limited presidents to two terms of four years each. Obasanjo had first taken office in 1999 and won a second term in 2003; the constitution made clear he had to leave office by May 2007. (Source: Washington Post, May 16, 2006)

The campaign to push the bill through was aggressive. Reports emerged that senators were offered 70 million naira each to vote in favour, while House of Representatives members faced similar inducements. (Source: Sahara Reporters, Ken Nnamani account; Senator Adeyeye testimony) The allegations sent shockwaves through civil society. Labour unions, opposition parties, religious leaders, and international observers all rallied against the bill, mounting pressure that reverberated across the country. (Source: VOA News; NPR)

Ken Nnamani, the Senate President at the time, has since spoken publicly about what he faced. He confirmed that he turned down a substantial financial offer and accepted that his political career would suffer as a result. He also ensured the session was broadcast live on AIT television, a decision that made the vote transparent to millions of Nigerians watching at home. When the noes carried the chamber that afternoon, Nigerians across the country rejoiced. (Source: Sahara Reporters; Historical Nigeria)

Senator Yari Gandi of Sokoto State captured the mood of the chamber: "Today, Nigerians have spoken and have defeated resoundingly the monster called 'third term'. It is a victory for Nigeria, it is a victory for democracy." (Source: Mail & Guardian, May 16, 2006)

The consequences of that vote extended far beyond one afternoon in Abuja. It secured Nigeria's first transfer of power from one elected civilian president to another, when Obasanjo handed over to Umaru Musa Yar'Adua in May 2007, a milestone the country had never achieved since independence. (Source: Washington Post, May 16, 2006) It also sent a message across the African continent, where other leaders in countries such as Uganda and Cameroon were already seeking ways to extend their own tenures. Nigeria's Senate had demonstrated that constitutional term limits could be defended.

Twenty years later, the questions that day raised have not faded. What makes a democracy durable? Is it written rules alone, or the human willingness to uphold them when the pressure is greatest? Nnamani and the senators who voted against the bill chose the constitution over personal gain. They chose the future of a republic over one man's ambition.

Nigeria has faced many tests since then. Some have been passed. Others have not. But on May 16, 2006, the Nigerian Senate gave the country something worth remembering: proof that the people, through their representatives, can hold the line.

On this 20th anniversary, that record belongs to all Nigerians.

Twenty years after the Senate defended the constitution in 2006, do you believe Nigeria's democratic institutions have grown stronger, or is there still unfinished work to protect what was won that day? Share your thoughts below.

#NigeriaHistory #ThirdTermDefeat #NigerianDemocracy #20YearsLater #ConstitutionMatters #KenNnamani #Obasanjo #AfricanDemocracy #NigerianSenate #NaijaPolitics #NigeriaForward #TheLens #NaijaHistory`;

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

  console.log('Uploading image 1 (National Assembly exterior)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Red Chamber interior)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Obasanjo at White House)...');
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
