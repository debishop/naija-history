/**
 * Direct publish for Today in Nigerian History — May 8, 1945: Nigeria's WWII Veterans and
 * the Seed of Independence. Three images, no database dependency.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGES = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Royal_West_African_Frontier_Force_Nigerian_Regiment.jpg',
    caption:
      'Nigeria Regiment of the Royal West African Frontier Force. Source: National Archives UK via Wikimedia Commons. Public Domain.',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/32/The_West_African_Frontier_Force_in_East_Africa%2C_1941_E2003.jpg',
    caption:
      'Soldiers of the West African Frontier Force removing Italian boundary markers, East Africa 1941. Source: Imperial War Museums. Public Domain.',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Nigerian_Bandsmen_Entertain_British_Sailors_at_African_Port._6_December_1942%2C_Freetown%2C_Sierra_Leone._A13900.jpg',
    caption:
      'Nigerian bandsmen of the RWAFF performing for British Royal Navy sailors, Freetown, December 1942. Source: Imperial War Museums. Public Domain.',
  },
];

const POST_BODY = `May 8, 1945. Europe celebrated. But for Nigeria, the war had only just begun.

The guns had gone silent across Europe. Church bells rang from London to Paris. Crowds flooded the streets. Victory in Europe had arrived at last.

But the Nigerian men who had fought under the British flag were watching from a very different vantage point.

These soldiers of the Nigeria Regiment, part of the Royal West African Frontier Force (RWAFF), had battled Italian forces across the scorching plains of Ethiopia and Italian Somaliland in East Africa. They had endured the brutal monsoons of Burma, pushing Japanese forces back through the Arakan hills in some of the most grueling jungle combat of the entire war. Approximately 45,000 Nigerian soldiers served in the British Armed Forces in Africa and Southeast Asia. Many never came home. (Source: Wikipedia, Military History of Nigeria During World War II)

And yet when peace was declared on May 8, 1945, they were still colonial subjects. Still governed by a foreign power. Still denied the right to hold commissioned officer ranks in the very army they had bled for. That restriction would not be lifted until 1949. (Source: National Army Museum, RWAFF in Burma 1944)

But something had shifted inside these men. Something no colonial ordinance could suppress.

Marshall Kebby, a Nigerian veteran, put it plainly: "As a colonial soldier I had very rough treatment. After the war, we were not going to be treated that way anymore."

They had fought fascism abroad. They had seen British soldiers bleed, panic, retreat and die alongside them. They had saved British lives. The myth of white invincibility had been shattered across the jungles and mountain passes where Nigerian soldiers proved themselves equal to any fighting force on earth.

When they came home to a Nigeria still under colonial rule, the contrast was unbearable. The disillusionment was fierce. And it became political.

Within weeks of VE Day, that energy became action. In June 1945, Nigerian workers launched the first mass anticolonial strike in Nigerian history. Labour leader Michael Imoudu channelled the fury of a nation that had sacrificed its sons and been given nothing in return. (Source: Cambridge University Press, Nigeria and World War II, Korieh)

The following year, on February 16, 1946, the Zikist Movement was founded, inspired by nationalist leader Nnamdi Azikiwe and built on the foundation laid by Herbert Macaulay, the Father of Nigerian Nationalism. Young Nigerians began to organise openly, boldly and without apology.

Fifteen years after the VE Day celebrations in London, on October 1, 1960, Nigeria achieved independence. The road was not short or smooth. But the seeds had been planted in the blood and disillusionment of every Nigerian soldier who came home knowing the truth: that no empire lasts forever when the people it oppresses refuse to accept its terms.

They fought for Britain's freedom. Then they came home and fought for their own.

Today we honour them not only as soldiers, but as the first sparks of a free and sovereign Nigeria.

Watch: WWII's Forgotten Army: West Africa's Soldiers in Burma (Guardian Features): https://www.youtube.com/watch?v=DWIHOIZVZtE

What do you think the return of these veterans meant for Nigeria's journey to independence? Share your thoughts in the comments.

Sources: Wikipedia (en.wikipedia.org/wiki/Military_history_of_Nigeria_during_World_War_II) | Cambridge University Press, Nigeria and World War II (Korieh) | National Army Museum (nam.ac.uk) | Tandfonline, Reluctant Nationalists (2024)

#NigerianHistory #WWIINigeria #RoyalWestAfricanFrontierForce #RWAFF #VEDay #NigerianSoldiers #AfricanSoldiersWWII #TodayInHistory #Nigeria #AfricanHistory #TheLens #NigerianHeritage #Independence #NigerianNationalism`;

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
  // Use published=false + no_story=true to stage the photo without creating a post
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    published: 'false',
    no_story: 'true',
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
    params.set(`attached_media[${i}]`, `{"media_fbid":"${id}"}`);
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

  console.log('Uploading 3 photos...');
  const photoIds: string[] = [];
  for (let i = 0; i < IMAGES.length; i++) {
    const img = IMAGES[i];
    if (!img) continue;
    console.log(`  Uploading image ${i + 1}/${IMAGES.length}...`);
    const id = await uploadPhoto(pageId, pageToken, img.url, img.caption);
    console.log(`  Image ${i + 1} uploaded: ${id}`);
    photoIds.push(id);
  }

  console.log('Publishing post with all photos...');
  const postId = await publishWithPhotos(pageId, pageToken, photoIds);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
