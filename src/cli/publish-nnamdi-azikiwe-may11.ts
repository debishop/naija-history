/**
 * Publish script — Death of Nnamdi Azikiwe (Today in Nigerian History, May 11, 2026).
 * Two-image post using Facebook multi-photo attach approach.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/b/bb/Nnamdi_Azikiwe_PC_%28cropped%29.jpg';
const IMAGE_1_CAPTION =
  'Official portrait of Nnamdi Azikiwe as President of Nigeria, 1 October 1963. Source: Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/88/Dr._Nnamdi_Azikiwe.jpg';
const IMAGE_2_CAPTION =
  'Statue of Nnamdi Azikiwe at Hero Square, Owerri, Imo State, Nigeria. Photo: FaridhaSL, 2020. Source: Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `Today in Nigerian History | May 11, 1996

Thirty years ago today, Nigeria lost one of the greatest sons it ever produced. On May 11, 1996, Benjamin Nnamdi Azikiwe, the man the world called Zik of Africa, took his last breath at the University of Nigeria Teaching Hospital in Enugu. He was 91 years old. (Sources: Britannica; Wikipedia)

Nigeria was never the same again.

But who was Zik, really? To understand what we lost that day, you have to go back to the beginning.

Nnamdi Azikiwe was born on November 16, 1904, in Zungeru, in the Northern Nigeria Protectorate. His parents were Igbo, originally from Onitsha. From the very start, there was something about the young Zik that set him apart. He left Nigeria as a young man with a burning desire to prove that an African mind could stand equal to any in the world. He studied at Lincoln University in Pennsylvania, the University of Pennsylvania, Howard University, and Columbia University. Not one degree. Four institutions. A hunger that could not be satisfied. (Source: Britannica)

When Zik returned to West Africa, he came back armed not just with education but with purpose. In 1937, he founded the West African Pilot newspaper. It was more than a newspaper. It was a weapon of ideas, a platform that dared to speak about freedom, dignity, and the right of African people to govern themselves. (Source: BlackPast)

His political career followed the rise of his voice. In 1944, he cofounded the National Council of Nigeria and the Cameroons, working alongside Herbert Macaulay, another towering figure of that era. The two men understood that liberation required organization. (Source: Wikipedia)

Zik rose steadily through the political ranks. From 1954 to 1959, he served as Premier of the Eastern Region. Then, at the most consequential moment in Nigerian history, when the British finally lowered their flag on October 1, 1960, Azikiwe became the first indigenous Governor General of an independent Nigeria. He held that office from 1960 to 1963. And when Nigeria became a republic on October 1, 1963, he became the nation's first President. A boy born in Zungeru was now the head of state of Africa's most populous nation. (Sources: Britannica; Wikipedia)

It did not last. On January 15, 1966, a military coup staged by a group of army officers ended civilian rule in Nigeria. The coup was planned and led by a cadre of majors, principally Major Chukwuma Kaduna Nzeogwu, who commanded operations in Kaduna. Zik was abroad when the coup happened. The plotters failed to consolidate power, and the following day General Ironsi, Commander of the Nigerian Army, assumed control of the government as Head of State. Zik returned to a country that had been seized from civilian hands. The republic he had helped build was now under military command. (Source: Wikipedia)

But Azikiwe did not disappear. He remained a voice. He ran for the presidency again in 1978 and in 1983 under the Nigerian People Party, each time losing, but never surrendering the belief that democratic leadership was the right path for Nigeria. (Source: BlackPast)

Beyond politics, Zik built institutions that outlived every office he held. He founded the University of Nigeria Nsukka in 1960, the first university in the country to be built and owned by Nigerians. He also founded African Continental Bank, a symbol of Black economic ambition at a time when such ambition was revolutionary. (Sources: Historical Nigeria; Wikipedia)

In 1989, Zik said something that stayed with many people who heard it: "I am not in a hurry to leave this world, because it is the only planet I know." Seven years later, on May 11, 1996, he finally left it, at 91 years old. He was buried in Onitsha on November 16, 1996, which would have been his 92nd birthday. (Sources: Wikipedia; Britannica)

Today, Nnamdi Azikiwe University in Awka, Nnamdi Azikiwe International Airport in Abuja, and his mausoleum in Onitsha, declared a National Monument in 2019, all carry his name forward. (Source: Historical Nigeria)

He is remembered as the Father of Nigerian Nationalism. A man who did not wait for freedom. He went and earned it, page by page, speech by speech, institution by institution.

Related video:
Nnamdi Azikiwe: How Do We Remember Nigeria's First President? https://www.youtube.com/watch?v=Nbmvx1FvxZw

Sources: Britannica | Wikipedia | BlackPast | Historical Nigeria

#NnamdiAzikiwe #ZikOfAfrica #NigeriaHistory #TodayInNigerianHistory #TheLens #Nigeria #AfricanHistory #NigerianHistory #FatherOfNationalism

Thirty years after his passing, his question remains relevant for every Nigerian: What kind of Nigeria are we building for those who will come after us?`;

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

  console.log('Uploading image 1 (Azikiwe presidential portrait)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Azikiwe memorial statue)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Publishing post with two images...');
  const postId = await publishWithPhotos(pageId, pageToken, photoId1, photoId2);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
