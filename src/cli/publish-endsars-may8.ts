/**
 * Publish script — EndSARS: Nigeria's Youth Revolution Against Police Brutality (Modern Nigeria, May 8, 2026).
 * Two-image post using Facebook multi-photo attach approach.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/d/da/END_SARS_PROTEST_in_Lagos%2C_Nigeria.jpg';
const IMAGE_1_CAPTION =
  'Large crowd of EndSARS protesters marching in Lagos, Nigeria, October 9, 2020. Credit: TobiJamesCandids / Wikimedia Commons, CC BY-SA 4.0.';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/3/39/Protesters_at_the_endSARS_protest_in_Lagos%2C_Nigeria_59.jpg';
const IMAGE_2_CAPTION =
  'EndSARS protesters gathered in Lagos, Nigeria, October 13, 2020. Credit: Kaizenify (AYOKANMI OYEYEMI / KAIZEN FOTOGRAPHY) / Wikimedia Commons, CC BY-SA 4.0.';

const POST_BODY = `In October 2020, Nigeria's youth did something the entire political establishment had declared impossible. They shut down a feared police unit in two weeks, using nothing but their phones, their feet, and an unshakeable belief that their lives mattered.

The Fear They Lived Under

For nearly three decades, young Nigerians had lived under the shadow of the Special Anti Robbery Squad. SARS was established in late 1992 as a plainclothes unit of the Nigerian Police Force. Over the years it became notorious for targeting young Nigerians who carried laptops, wore dreadlocks, or had tattoos, treating them as suspected internet fraudsters regardless of innocence.

This was not perception. It was documented fact. In 2016, Amnesty International published a report documenting torture, mock executions, and physical assault carried out by SARS officers. By 2020, Amnesty had verified 82 cases of abuse and extrajudicial killings between January 2017 and May 2020 alone. In 2017, over 10,000 Nigerians signed a petition demanding SARS be disbanded. Nothing changed. (Amnesty International; Wikipedia)

The Spark

On October 3, 2020, a video circulated showing a SARS officer shooting a young man in Ughelli, Delta State, then driving away in the victim's vehicle. Two days later, news broke that officers of the Nigerian Police Force had killed Daniel Chibuike, known as Sleek, an aspiring musician aged 20, in Rivers State.

The country did not wait for a leader to emerge. On October 8, 2020, young Nigerians took to the streets in Lagos, Abuja, Port Harcourt, and Ibadan simultaneously. They organised over Twitter and Instagram. There was no central command, no single voice directing them. Just a generation that had finally had enough. (Al Jazeera; Nairametrics)

Five Demands and a Dissolution

The protesters were specific. They brought five demands: immediate release of all arrested protesters; justice and compensation for past victims of SARS brutality; an independent body to oversee the investigation of abuses within 10 days; psychological evaluation and retraining of disbanded SARS officers before redeployment; and a pay increase for police officers to reduce incentives for corruption.

On October 11, 2020, the Inspector General of Police announced the immediate dissolution of SARS across all 36 states. A replacement unit called SWAT was announced. The protesters, rightly skeptical that this was anything more than a rebranding exercise, kept going. (Wikipedia; Al Jazeera)

The Night at Lekki

On October 20, 2020, the Lagos State Government announced a curfew beginning at 4 pm. That evening, at the Lekki toll gate, hundreds of young Nigerians remained gathered peacefully. They were waving the Nigerian flag and singing the national anthem.

Soldiers arrived. The lights went out. And then came the gunfire.

Amnesty International confirmed at least 12 peaceful protesters were killed at Lekki and Alausa that night. The Nigerian Army initially denied any deployment. Eight days later, it admitted soldiers had been present at the toll gate, but denied opening fire. Over a month later, on November 21, it admitted those soldiers had been given live ammunition. The Lagos State Judicial Panel later confirmed that soldiers shot peaceful protesters. To this day, no military officer has been prosecuted. (Amnesty International; Al Jazeera; CNN)

What It Meant

The world took notice. The EndSARS hashtag generated over 28 million tweets, making it one of the most viral African social movements in history. Solidarity protests took place in London, New York, Toronto, Berlin, Dublin, and Johannesburg. The Nigerian diaspora raised millions of naira through crowdfunding for food, legal aid, and medical care. Total confirmed deaths across the unrest reached 69, comprising 51 civilians, 11 police officers, and 7 soldiers. (Wikipedia; Georgetown Journal of International Affairs)

Each October 20, Nigerians now mark Lekki Massacre Remembrance Day. The promised reforms have largely stalled. SWAT is widely seen as SARS simply rebranded. But EndSARS proved something that cannot be taken away: Nigeria's youth can organise, they can demand, and they can force change. The question of whether those in power will ever answer for what happened at Lekki remains open.

The generation that stopped SARS with their phones is still watching.

What do you think the EndSARS movement achieved, and what remains unfinished? Share your thoughts in the comments.

Sources: Amnesty International | Al Jazeera | Wikipedia | Nairametrics | Georgetown Journal of International Affairs | CNN

#EndSARS #NigerianHistory #LekkiMassacre #ModernNigeria #TheLens #Nigeria #EndSARSProtest #NigerianYouth #JusticeForEndSARS #October20 #PoliceReform #SARS #AfricanHistory #YouthActivism`;

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
  photoId1: string,
  photoId2: string,
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const body = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
    'attached_media[0]': `{"media_fbid":"${photoId1}"}`,
    'attached_media[1]': `{"media_fbid":"${photoId2}"}`,
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

  console.log('Uploading image 1 (lead protest crowd)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (secondary protest crowd)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Publishing post with both images...');
  const postId = await publishWithPhotos(pageId, pageToken, photoId1, photoId2);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
