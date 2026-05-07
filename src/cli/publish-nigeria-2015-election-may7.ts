/**
 * Direct publish for Nigeria 2015 Election Post — The Day Democracy Won (Modern Nigeria, May 7).
 * No database dependency — uses Facebook API directly via env vars.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/c/c2/Incoming_and_Outgoing_Nigerian_Presidents_Wave_to_Crowd_Amid_Peaceful_Inaugural_in_Abuja.jpg';
const IMAGE_CAPTION =
  'Former President Goodluck Jonathan and newly sworn-in President Muhammadu Buhari waving to the crowd at Eagle Square, Abuja, May 29, 2015. Credit: US Department of State (Public Domain) via Wikimedia Commons.';

const POST_BODY = `On March 28, 2015, Nigerians did something no generation had managed in 55 years of independence: they voted a sitting president out, peacefully.

The date had felt impossible not long before. Nigeria had seen coups, military handovers, and disputed elections since 1960. But the 2015 presidential election was different. It was the moment democratic promise finally collided with democratic practice, and the result shocked the world.

President Goodluck Jonathan of the Peoples Democratic Party faced Muhammadu Buhari of the All Progressives Congress, an opposition coalition that had been formed in 2013 from a merger of four parties. The stakes were enormous. Nigeria had never once, in 55 years of independence, transferred power from one elected government to another through the ballot box.

The Independent National Electoral Commission declared the results on March 31. Buhari had received 15,424,921 votes, representing 53.96 percent of the total. Jonathan received 12,853,162 votes, amounting to 44.96 percent. It was not even close. Buhari had won across 21 states, pulling together an extraordinary coalition of northern voters, southwest support, and reform oriented voters across the country.

What happened next stopped the continent in its tracks.

Before the final results had been formally announced across all states, President Jonathan picked up the phone. He called Buhari directly and conceded defeat. In a brief statement, Jonathan said the words that would become the most quoted sentence in modern Nigerian political history: "Nobody's ambition is worth the blood of any Nigerian."

The International Foundation for Electoral Systems called the 2015 election a critical vote for democracy in Africa, noting that the peaceful transfer of power was a watershed moment not just for Nigeria but for the entire continent. Brookings Institution analysts described the outcome as a demonstration that Nigerian democratic institutions could absorb an opposition victory without collapsing into violence.

This mattered because the fear of violence had been real and present. The election had already been postponed once, from February to March, amid security concerns. Observers from dozens of countries were watching. Every credible signal before the vote pointed to the possibility of postelection unrest regardless of who won. Instead, Nigerians got a phone call, a concession, and quiet.

Al Jazeera reported that Buhari's victory was historic on multiple levels: he had previously attempted the presidency in 2003, 2007, and 2011 before finally succeeding in 2015. It was a story of democratic persistence meeting democratic maturity at exactly the right moment.

The Council on Foreign Relations noted at the time that while the election itself was historic, the real challenge lay ahead: managing an economy under pressure from falling oil prices, addressing the Boko Haram insurgency in the northeast, and fulfilling the reform promises that had brought millions of Nigerians out to vote.

On May 29, 2015, Muhammadu Buhari was inaugurated as President of Nigeria at Eagle Square in Abuja. More than 23 heads of state attended the ceremony. Goodluck Jonathan stood on that same stage, the man who had just handed over power he could have refused to leave. France 24 described the scene as a celebration of democratic renewal watched closely across Africa.

The image captured that day tells the whole story: the incoming and outgoing presidents waving to the crowd together, side by side, in a country that had never seen that before.

Eleven years later, that day still carries weight. Not because everything that followed was perfect, but because on March 28, 2015, ordinary Nigerians stood in long queues under the sun and changed the course of their nation with a ballot, not a bullet.

That is the power of one day.

What does the 2015 election mean to you? Do you remember where you were when Jonathan conceded? Tell us in the comments below.

Sources: Wikipedia | IFES | Brookings Institution | Al Jazeera | Council on Foreign Relations | France 24

#NigerianHistory #Nigeria2015Election #Democracy #PeacefulTransfer #GoodluckJonathan #MuhammaduBuhari #ModernNigeria #TheLens #NigerianPolitics #AfricanDemocracy #TodayInHistory #NigeriaVotes`;

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
