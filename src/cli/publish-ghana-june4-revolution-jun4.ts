/**
 * Publish script — 47 Years Ago Today, A Nation Said: Enough Is Enough
 * (The Lens Facebook Page, Wednesday June 4, 2026 — Independence and Nation Building)
 *
 * Single-image post. Image:
 *   Jerry John Rawlings (headshot) — CC0, no attribution required
 *   URL: https://upload.wikimedia.org/wikipedia/commons/b/ba/Jerry_Rawlings_%28headshot%29.jpg
 *
 * Draft sourced from THEAAA-728. Research from THEAAA-724. Parent: THEAAA-716.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/b/ba/Jerry_Rawlings_%28headshot%29.jpg';
const IMAGE_CAPTION = 'Jerry John Rawlings, Chairman of the Armed Forces Revolutionary Council, who led Ghana\'s June 4th Revolution in 1979. Image: Wikimedia Commons (CC0 / public domain).';

const POST_BODY = `47 Years Ago Today, A Nation Said: Enough Is Enough

Forty seven years ago today, Ghana was pushed to its limits.

Inflation had spiraled out of control. Soldiers went unpaid. Black market traders profiteered while ordinary Ghanaians starved. Senior military officers filled their pockets as the country crumbled around them. The Supreme Military Council II, led by Lieutenant General Fred Akuffo, had lost all moral authority to govern a proud and struggling nation.

Then everything changed in a single night.

On the night of June 3 to June 4, 1979, junior military officers broke a condemned prisoner out of detention and marched him to Ghana National Radio. That prisoner was Flight Lieutenant Jerry John Rawlings, and the message he broadcast to the people of Ghana that morning would reshape the country's history. Just weeks earlier, Rawlings had attempted a coup, been arrested by the very government he sought to overthrow, and been sentenced to death. But at his military tribunal, he turned the proceeding against the government, accusing Ghana's senior officers of massive corruption in the plain, direct language of the common people. His words made him a symbol of everything the powerless had been waiting to say.

By dawn on June 4, the revolution was complete.

The Armed Forces Revolutionary Council, known as the AFRC, took power with Rawlings as chairman. What followed were 112 days that Ghana would never forget. Three former heads of state, General Fred Akuffo, General Ignatius Kutu Acheampong, and General Akwasi Afrifa, were arrested, tried, and executed for corruption. Black marketeers and corrupt officials were pursued and prosecuted across the country. The AFRC moved with a speed and severity that stunned observers at home and abroad.

Their stated mission was the restoration of dignity and what Ghanaians came to call probity and accountability. That phrase entered the national vocabulary and is still invoked today whenever citizens demand something better from those who govern them.

Then, in September 1979, the AFRC kept its word. On September 24, 1979, power was peacefully handed to elected civilian president Dr. Hilla Limann of the People's National Party. The soldiers stepped back.

In Rawlings' own words, as recorded in his 34th Anniversary Address: "June 4th was about restoring the dignity of the ordinary man and woman and punishing those who openly paraded corruption."

But the full story demands honesty. In December 1981, Rawlings staged a second coup, ousting the very civilian government he had helped bring to power. He would go on to rule Ghana until 2001. Scholars remain divided on whether June 4 represented genuine democratic idealism or calculated populism, and that debate has never truly been settled.

That complexity is precisely what makes this history matter so deeply. Accountability is not a single dramatic moment. It is a commitment that must be renewed by every generation, tested by every leader, and demanded by every citizen who refuses to accept less than what their nation deserves.

The JJ Rawlings Foundation, as reported by the Ghana News Agency in 2025, continues to mark June 4 annually, calling on Ghanaians to uphold the values of probity, accountability, justice, and people power. Across West Africa and beyond, the questions the 1979 revolution raised are still alive: Who does a government truly serve? What does it cost to hold power to account?

The June 4th Revolution was not only Ghana's story. It was a mirror held up to an entire continent, reflecting the fierce hopes and frustrations of millions who believed their nations could be better.

Forty seven years later, that belief endures.

What do you think? Does the spirit of June 4 still have a place in African politics in 2026? Tell us in the comments and share this with someone who needs to know this history.

#GhanaJune4 #June4thRevolution #JerryRawlings #AfricanHistory #Accountability #PeoplesPower #GhanaHistory #TodayInHistory #Probity #AfricanPolitics #WestAfrica #NationBuilding #HistoryLesson`;

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
    [`attached_media[0]`]: `{"media_fbid":"${photoId}"}`,
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

  console.log('Uploading image (Jerry Rawlings headshot)...');
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
