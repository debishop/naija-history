/**
 * Publish script — THE DAY EASTERN NIGERIA CHOSE FIRE OVER SUBMISSION
 * (The Lens Facebook Page, Today in Nigeria History — Monday May 26, 2026)
 *
 * Three-image post. Images:
 *   1. Dim Chukwuemeka Odumegwu Ojukwu monument — CC BY-SA 4.0 (Wikimedia Commons)
 *   2. Ojukwu's wartime bunker at Oguta — CC BY 3.0 (Wikimedia Commons)
 *   3. Flag of Biafra — Public Domain (Wikimedia Commons)
 *
 * Draft sourced from THEAAA-688. Fact-checked and verified.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/6/6c/An_image_of_Dim_Chukwuemeka_Odumegwu_Ojukwu.jpg';
const IMAGE_1_CAPTION =
  'Monument of Dim Chukwuemeka Odumegwu Ojukwu, the military governor of Eastern Nigeria who received the mandate to declare independence on May 26, 1967. Credit: via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/f9/Ojukwu%27s_bunker.jpg';
const IMAGE_2_CAPTION =
  "Ojukwu's wartime bunker at Oguta, a reminder of the two and a half years of conflict that followed the declaration of the Republic of Biafra. Credit: via Wikimedia Commons (CC BY 3.0).";

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Flag_of_Biafra.svg/500px-Flag_of_Biafra.svg.png';
const IMAGE_3_CAPTION =
  'The flag of the Republic of Biafra, proclaimed on May 30, 1967, four days after the Eastern Nigeria Consultative Assembly voted to secede. Credit: via Wikimedia Commons (Public Domain).';

const POST_BODY = `THE DAY EASTERN NIGERIA CHOSE FIRE OVER SUBMISSION

May 26, 1967. Enugu. The air inside the hall was thick with the weight of history.

Approximately 300 delegates of the Eastern Nigeria Consultative Assembly had gathered, knowing that what they decided over the coming hours would shape not just their region but the entire future of a country barely seven years old. At the front of the room stood Lieutenant Colonel Chukwuemeka Odumegwu Ojukwu, a man who had watched thousands of Igbo people massacred across Northern Nigeria in 1966, who had seen the Aburi Accord collapse under the weight of bad faith, and who now stood before his people with three options. None of them were comfortable.

Option one was to accept Northern domination. Bow to General Yakubu Gowon's terms. Return to a federation that had already shown it would not protect Eastern lives.

Option two was to do nothing. Remain in political limbo. Continue the stalemate that was bleeding the region dry.

Option three was to walk away. Declare Eastern Nigeria a sovereign state and build something new.

The Assembly did not hesitate. They chose Option three, unanimously. By the evening of May 27, the joint session of the Consultative Assembly and the Advisory Committee of Chiefs and Elders had passed its formal resolution: Ojukwu had a mandate to declare independence "at the earliest practicable date." (Sources: Biafra article on Wikipedia; Vanguard; BlackPast)

WHAT FOLLOWED CHANGED EVERYTHING

Gowon moved swiftly. On May 27, even as the Assembly finalized its vote, he declared a state of emergency and announced the restructuring of Nigeria into 12 new states. It was a calculated move designed to fracture Eastern Nigeria's political and economic unity by carving out minority states around the Niger Delta and its petroleum wealth, states that would now look to Lagos rather than Enugu. (Source: Britannica)

But the mandate had already been given. Three days later, on May 30, 1967, Ojukwu stood before the world and proclaimed the Republic of Biafra.

On July 6, 1967, federal troops crossed into Biafra and the Nigerian Civil War began. What followed over the next two and a half years would become one of the defining tragedies of postcolonial Africa.

Between 1 and 3 million people died, the vast majority of them civilians. Starvation became the most devastating weapon of the war. Images of severely malnourished children from Biafra shocked the conscience of the world, galvanizing the modern international humanitarian movement and inspiring the founding of organizations like Médecins Sans Frontières. (Sources: Britannica; GlobalSecurity)

The war ended on January 15, 1970, when Biafran forces surrendered and Nigeria was formally reunified. But the wounds from those years ran very deep.

WHY THIS DAY STILL MATTERS

More than five decades later, the events set in motion on May 26, 1967 are not simply history. The IPOB movement, the annual Biafra Remembrance Day, and the ongoing conversations about restructuring, resource control, and the right to self determination in Nigeria all trace their roots to those two days in Enugu, when 300 delegates made a choice that echoed across generations. (Sources: HistoryVille; Nigerian Civil War article on Wikipedia)

The Eastern Nigeria Consultative Assembly did not start the crisis. The massacres of 1966, the failure of the Aburi Accord, and the calculated decisions of federal leadership all preceded that vote. But May 26 and 27 were the moment at which a people, faced with subjugation, chose to assert their dignity at a cost that would stagger the imagination.

Whether you see Ojukwu as a liberator or as the man who led his people into catastrophe, you cannot deny the weight of what was decided those days. It was a vote made in grief, in fury, and in the desperate hope that something better could be built from the ruins of what Nigeria had become.

Nigeria is still reckoning with the answer to that hope.

What do you think? If you could go back to that hall in Enugu on May 26, 1967, knowing everything we know now about the war that followed, what would you have voted? And does your answer change how you see the calls for self determination in Nigeria today?

Photos: (1) Monument of Dim Chukwuemeka Odumegwu Ojukwu. Credit: via Wikimedia Commons (CC BY-SA 4.0). (2) Ojukwu's wartime bunker at Oguta. Credit: via Wikimedia Commons (CC BY 3.0). (3) Flag of the Republic of Biafra. Credit: via Wikimedia Commons (Public Domain).

Video: The Nigerian Civil War — A Documentary: https://www.youtube.com/watch?v=HmgymjUO9Nc

#Biafra #NigerianCivilWar #TodayInNigeriaHistory #Ojukwu #NigerianHistory #EasternNigeria #BiafraWar #NeverForget #AfricanHistory #TheLens #RememberBiafra`;

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

  console.log('Uploading image 1 (Ojukwu monument)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Ojukwu bunker at Oguta)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Flag of Biafra)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
