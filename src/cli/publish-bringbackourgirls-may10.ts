/**
 * Publish script — BringBackOurGirls Movement at its Peak (Today in Nigerian History, May 10, 2026).
 * Three-image post using Facebook multi-photo attach approach.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/15/BringBackOurGirls_truck.jpg';
const IMAGE_1_CAPTION =
  'A truck in Nigeria promotes the BringBackOurGirls hashtag during the April to May 2014 protests. Credit: Medina Dauda / Voice of America (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/f3/Michelle-obama-bringbackourgirls.jpg';
const IMAGE_2_CAPTION =
  'First Lady Michelle Obama holds a handwritten BringBackOurGirls sign at the White House, posted via the official FLOTUS Twitter account on May 7, 2014. Credit: Office of the First Lady / The White House (Public Domain).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/4/46/Parents_of_Chibok_kidnapping_victims.png';
const IMAGE_3_CAPTION =
  'Parents of some of the 276 kidnapped Chibok girls mourn their losses, April 28, 2014. Credit: Voice of America (Public Domain).';

const POST_BODY = `Today in Nigerian History: May 10, 2014

Twelve years ago today, something extraordinary was happening at Unity Fountain in Maitama, Abuja. A crowd of Nigerian women had been gathering there for eleven consecutive days, refusing to leave, refusing to be quiet, refusing to accept what their government had allowed to happen. They held signs. They wept. They chanted one demand above all others: bring back our girls. (CNN, May 10, 2014)

It had begun in the darkness of April 14 and into the early morning of April 15, 2014. Boko Haram militants stormed the Government Girls Secondary School in Chibok, Borno State, and abducted 276 schoolgirls at gunpoint, loading them onto trucks and disappearing into the Sambisa Forest. (Wikipedia: Chibok schoolgirls kidnapping) Many of those girls had returned to school that night specifically to write their final exams. Their courage, their determination to finish what they had started, made them targets.

For weeks after the abduction, the Nigerian government's response appeared slow and insufficient to the families and communities crying out for help. Then on April 23, 2014, a Nigerian lawyer named Ibrahim Abdullahi posted a message that would change the course of global attention. Inspired by the calls of activist Obiageli Ezekwesili, he wrote a phrase that would spread to every corner of the world: Bring Back Our Girls. (Wikipedia: Chibok schoolgirls kidnapping)

By April 30, 2014, Ezekwesili led what became known as the Million Women March, descending on Unity Fountain in Abuja. (Wikipedia: Chibok schoolgirls kidnapping) From that day forward, protesters gathered at the fountain every single day in a sustained act of public grief and resistance. Mothers, students, professionals, grandmothers, strangers bonded by a shared sense of outrage and loss.

On May 10, 2014, Day 11 of that daily protest, movement spokesperson Rotimi Olawale gave voice to what every person in the crowd was holding in their chest. He said: "We need to keep this up every day. We are saying that we want our girls alive." (CNN, May 10, 2014) Those words carried the full weight of a nation that had not yet received a satisfactory answer from anyone in power.

On that same day, from the White House in Washington D.C., First Lady Michelle Obama delivered her first solo White House weekly address, devoting every word of it to the Chibok girls. She said she was "outraged and heartbroken." She told the nation: "In these girls, Barack and I see our own daughters." She said of the abduction: "This unconscionable act was committed by a terrorist group determined to keep these girls from getting an education." (White House transcript, May 10, 2014) The world's most watched political household had stopped to bear witness.

By that point, American and British military and intelligence personnel had already arrived in Abuja to help coordinate the search. (CNN, May 10, 2014) Within days, the BringBackOurGirls hashtag had attracted 2.3 million tweets, placing it among the fastest growing humanitarian hashtags the world had ever seen. (Wikipedia: Chibok schoolgirls kidnapping) The movement spread from Abuja to Lagos, to London, to New York, to parliaments and plazas on every continent.

Yet the story does not end with that outpouring. As of 2024, Amnesty International confirmed that at least 82 of the Chibok girls remain missing, more than a decade after they were taken. (Amnesty International, 2024) Human Rights Watch noted in the same year that schoolchildren across northeastern Nigeria continue to face grave danger. (Human Rights Watch, 2024)

We have not brought back all our girls.

Twelve years after Unity Fountain became a symbol of the unbroken will of Nigerian mothers and activists, that fact sits heavy. The movement proved that ordinary people, through solidarity and persistence, can shift global attention. The work of ensuring that shift translates into lasting protection for children remains unfinished.

What does the BringBackOurGirls movement mean to you personally? Do you believe the remaining girls can still be rescued? Share your thoughts in the comments below.

Related videos:
BringBackOurGirls leaders vow to continue protest (May 2014): https://www.youtube.com/watch?v=cQu-MN10ZqM
Ten years after Bring Back Our Girls (Al Jazeera): https://www.youtube.com/watch?v=o-axqO9fv34
Michelle Obama support for BringBackOurGirls (May 2014): https://www.youtube.com/watch?v=043fimyKqtk

Sources: CNN | NPR | Wikipedia | Amnesty International | Human Rights Watch | White House transcript

#BringBackOurGirls #ChiobokGirls #NigeriaHistory #TodayInNigerianHistory #TheLens #Nigeria #AfricanHistory #Chibok #Borno #NigerianHistory`;

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
  photoId3: string,
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const body = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
    'attached_media[0]': `{"media_fbid":"${photoId1}"}`,
    'attached_media[1]': `{"media_fbid":"${photoId2}"}`,
    'attached_media[2]': `{"media_fbid":"${photoId3}"}`,
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

  console.log('Uploading image 1 (BringBackOurGirls protest truck)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Michelle Obama with BringBackOurGirls sign)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Parents of Chibok kidnapping victims)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with three images...');
  const postId = await publishWithPhotos(pageId, pageToken, photoId1, photoId2, photoId3);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
