/**
 * Direct publish for Nigeria Independence Day 1960 post (May 6, 2026).
 * No database dependency — uses Facebook API directly via env vars.
 * For use when DATABASE_URL is unavailable (e.g. Doppler not configured).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/0/03/Jaja-Wachuku%2C_Abubakar_Tafawa_Balewa_and_Princess_Alexandra_of_Kent_on_Nigeria%27s_Independence_Day_October_1%2C_1960.jpg';
const IMAGE_CAPTION = 'Jaja Wachuku, Prime Minister Abubakar Tafawa Balewa, and Princess Alexandra of Kent on Nigeria Independence Day, October 1, 1960. Photo: Mark Kauffman/LIFE Magazine.';

const POST_BODY = `Just after midnight on October 1, 1960, silence fell across Lagos Race Course. Between thirty thousand and forty thousand Nigerians had gathered in the warm night air, standing shoulder to shoulder, dressed in their finest, waiting for a moment that many had spent their entire lives imagining. Their eyes were fixed on a flagpole where the British Union Jack had flown for decades, representing a power that had long controlled their land, their resources, and their future. Then, slowly, the flag came down. And as it descended, the green, white, green flag of an independent Nigeria rose in its place. The crowd met the moment with composed solemnity, polite applause greeting the rising flag. A nation was born.

That night, Prime Minister Sir Abubakar Tafawa Balewa stood before his people and spoke words that continue to echo across generations:

"Today is Independence Day. The first of October 1960 is a date to which for two years every Nigerian has been eagerly looking forward. At last, our great day has arrived, and Nigeria is now indeed an independent sovereign nation."

Source: BlackPast.org, 1960 Independence Day Speech of Sir Abubakar Tafawa Balewa

The moment was more than symbolic. It was the culmination of years of agitation, negotiation, and sacrifice by Nigerians who refused to accept that their destiny belonged in foreign hands. The Union Jack did not come down on its own. It came down because Nigerians organized, demanded, and earned their place as a free people.

Princess Alexandra of Kent stood at the ceremony that night, representing Queen Elizabeth II, a recognition of the gravity of what was unfolding on the world stage. The eyes of the international community were fixed on Nigeria, and Nigeria met the moment with composure and pride. Source: Wikipedia, Independence Day (Nigeria)

Tafawa Balewa, the teacher from Bauchi who became the voice of a nation, was named Nigeria's first Prime Minister. Beside him stood Dr. Nnamdi Azikiwe, who served as the first native Governor General of Nigeria. Three years later, on October 1, 1963, when Nigeria became a republic, Azikiwe became the country's first President, completing a transition that began in the euphoria of that October midnight. Source: Britannica, Independent Nigeria

The celebrations stretched well into the morning. Highlife musicians Victor Olaiya and Bobby Benson played as Nigerians danced and rejoiced across the country. The music was not incidental to the occasion. It was part of the declaration. A free people celebrate freely, loudly, and joyfully. Source: Historical Nigeria, Nigeria's Independence in 1960: Events and Celebrations

Nigeria moved quickly to claim its place in the world. Shortly after independence, the country joined the United Nations, announcing its arrival as a sovereign state among nations. At home, the new government invested immediately in the future of its people. Within just two years of independence, four new universities had been established across the country, a powerful signal that Nigeria understood national freedom required an educated, empowered citizenry. Source: Britannica, Independent Nigeria

To see archival footage from that extraordinary night, watch the video here: https://www.youtube.com/watch?v=arpys66YjFE

That midnight at Lagos Race Course remains one of the defining moments in African history. A flag going up is not only the business of presidents and prime ministers. It belongs to every person who stood in that crowd, every family who stayed awake through the night to listen on the radio, and every generation that came after. Independence is both an event and a responsibility passed from one generation to the next.

The story of October 1, 1960 is not simply the story of a colony gaining independence. It is the story of a people reclaiming their dignity, asserting their capacity to shape their own future, and announcing to the world that the most populous nation on the African continent would write its own chapter from that day forward. Source: Britannica, Independent Nigeria; Wikipedia, Independence Day (Nigeria)

What part of Nigeria's independence story moves you the most? Drop your thoughts below and share this with someone who needs to know this history.

#NigerianIndependence #NigerianHistory #IndependenceDay #October1960 #TafawaBalewa #Azikiwe #Nigeria #NigerianHeritage #AfricanHistory #NationBuilding #IndependenceAndNationBuilding #TheLens`;

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

async function uploadPhoto(pageId: string, pageToken: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/photos`;
  const body = new URLSearchParams({
    url: IMAGE_URL,
    caption: IMAGE_CAPTION,
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

async function publishWithPhoto(pageId: string, pageToken: string, photoId: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const body = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
    'attached_media[0]': `{"media_fbid":"${photoId}"}`,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await response.json()) as { id?: string; error?: GraphApiError };
  if (!response.ok || json.error || !json.id) {
    throw new Error(`Publish failed: ${json.error?.message ?? `HTTP ${response.status}`}`);
  }
  return json.id;
}

async function main(): Promise<void> {
  const systemUserToken = process.env['FACEBOOK_SYSTEM_USER_TOKEN'] ?? process.env['FACEBOOK_PAGE_ACCESS_TOKEN'];
  const pageId = process.env['FACEBOOK_PAGE_ID'];

  if (!systemUserToken || !pageId) {
    throw new Error('FACEBOOK_SYSTEM_USER_TOKEN (or FACEBOOK_PAGE_ACCESS_TOKEN) and FACEBOOK_PAGE_ID must be set.');
  }

  console.log('Resolving page access token...');
  const pageToken = await resolvePageAccessToken(pageId, systemUserToken);

  console.log('Uploading photo...');
  const photoId = await uploadPhoto(pageId, pageToken);
  console.log(`Photo uploaded: ${photoId}`);

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
