/**
 * Publish script — The Election Nigeria Will Never Forget
 * (The Lens Facebook Page, Thursday June 5, 2026 — Modern Nigeria: June 12, 1993 Election)
 *
 * Single-image post. Image:
 *   1. MKO Abiola portrait — CC BY-SA 3.0 (Wikimedia Commons)
 *      Source: https://commons.wikimedia.org/wiki/File:MoshoodAbiola.jpg
 *      URL: https://upload.wikimedia.org/wikipedia/commons/1/1e/MoshoodAbiola.jpg
 *
 * Additional visual assets (available for carousel/repurposing):
 *   2. 1993 Nigerian Presidential Election Results Map — CC BY-SA 4.0
 *      By FelipeRev, Wikimedia Commons
 *      URL: https://upload.wikimedia.org/wikipedia/commons/c/c5/Map_of_the_1993_Nigerian_presidential_election.svg
 *   3. MKO Abiola Memorial Statue, Ojota, Lagos — CC BY-SA 4.0
 *      By Omoeko Media, Wikimedia Commons
 *      URL: https://upload.wikimedia.org/wikipedia/commons/7/79/MKO_abiola_statue.jpg
 *
 * Archive video (included in post body):
 *   "Throwback: MKO Abiola Rejects Annulment Of June 12, 1993 Election"
 *   Channels TV (posted June 12, 2017)
 *   YouTube: https://www.youtube.com/watch?v=rjSNoLSnvvg
 *
 * Additional YouTube resources (for future repurposing):
 *   - Nigeria: Untold Story of MKO Abiola Documentary: https://www.youtube.com/watch?v=2bT-2xUw-FE
 *   - Watch How IBB Annulled June 12 Election Results: https://www.youtube.com/watch?v=qW38rfBiPv8
 *   - IBB Finally Admits Moshood Abiola Won (Feb 2025): https://www.youtube.com/watch?v=JkK69mHpqfE
 *   - How The June 12, 1993 Election Was Annulled — Prof. Humphrey Nwosu: https://www.youtube.com/watch?v=keSD3BCqsUo
 *   - Echoes Of June 12, 1993: The Struggle For Democracy: https://www.youtube.com/watch?v=zBdIz4IaLlg
 *   - The Supreme Price (2014) — trailer: https://www.youtube.com/watch?v=QRsmWeXJx4U
 *
 * Draft sourced from THEAAA-791 (v3, fact-checked). Research brief from THEAAA-790.
 * Fact-check: THEAAA-792 (23/23 claims VERIFIED). Visual assets: THEAAA-793.
 * Word count: 648 words (within 600-700 requirement).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/1e/MoshoodAbiola.jpg';
const IMAGE_CAPTION =
  'Portrait of Moshood Kashimawo Olawale Abiola, winner of the June 12, 1993 Nigerian presidential election. Credit: Wikimedia Commons (CC BY-SA 3.0).';

const POST_BODY = `The Election Nigeria Will Never Forget

On June 12, 1993, something remarkable happened in this country. For one brief, shining morning, Nigeria voted as one.

Moshood Kashimawo Olawale Abiola was not what most people expected from a presidential candidate. Born on August 24, 1937, in Abeokuta, Ogun State, he rose from poverty to become one of Africa's most powerful businessmen, a telecoms and publishing magnate who carried a genuine dream for Nigeria. By 1993, after years of military rule, Nigerians were desperate for change. Abiola gave them hope. (Source: Wikipedia, Moshood Abiola)

He ran on the platform of the Social Democratic Party, facing Bashir Tofa of the National Republican Convention, under General Ibrahim Babangida's transition to democracy programme. What happened on election day broke every rule Nigeria had written about itself. (Source: Wikipedia, 1993 Nigerian Presidential Election)

Abiola won 19 of 30 states. He won the North. He won Kano, which was Tofa's own home state. A Yoruba man from the Southwest swept regions where no southern candidate had ever been expected to win. International observers agreed: this was the freest and fairest election Nigeria had ever conducted. For one day, tribe and religion did not choose the future. The people did. (Source: Wikipedia, 1993 Nigerian Presidential Election; The Conversation, "June 12 is now Democracy Day in Nigeria")

Then came June 23, 1993. Just eleven days after the vote, General Babangida annulled the results, citing irregularities and national security concerns. Lagos erupted. Pro democracy groups rose across the country. Workers went on strike. The Campaign for Democracy organised mass civil disobedience. Nigeria's most beloved election had been stolen. (Source: Human Rights Watch, Nigeria Report, August 1993)

When MKO declared himself president in June 1994 and was arrested, his wife Kudirat Abiola became the fiercest voice for justice in the land. She travelled across Nigeria and internationally, speaking to governments, rallying students, and demanding her husband's release and the restoration of democracy. International figures including Pope John Paul II and Archbishop Desmond Tutu publicly called for MKO's freedom. (Source: Wikipedia, Moshood Abiola)

On June 4, 1996, thirty years ago yesterday, Kudirat was shot dead in broad daylight on the streets of Lagos. She was 44 years old. Her assassination was widely attributed to agents of General Sani Abacha's regime. Nigeria lost one of its bravest daughters. (Source: Wikipedia, Moshood Abiola)

MKO himself never walked free. He died on July 7, 1998, reportedly from a heart attack while meeting with a United States State Department delegation, less than a month after General Abacha himself had died. He was 60 years old. He never sat in the office he had been elected to hold. (Source: Wikipedia, Moshood Abiola)

In 1999, Nigeria transitioned to civilian rule with the inauguration of Olusegun Obasanjo on May 29. In 2018, President Muhammadu Buhari made it official: June 12 became Nigeria's National Democracy Day. Abiola was posthumously awarded the GCFR, Nigeria's highest national honour. In February 2025, even Babangida himself publicly expressed regret over the annulment. (Source: Wikipedia, Democracy Day Nigeria; Historical Nigeria, "The 1993 Election and Abiola's Silent Victory")

One week from today, Nigeria will observe Democracy Day. As we do, remember that democracy was not handed to this country. It was purchased at a terrible price. Purchased by a man who won an election and spent the rest of his life in a prison cell. Purchased by a woman who stood in the gap and paid with her life.

We are here because of June 12. And June 12 happened because Nigerians refused to accept that their votes could be taken from them.

That courage is our inheritance. Honour it.

What does June 12 mean to you? If you were alive in 1993, share where you were when you heard about the annulment. And for those who came after: what does this day demand of us today?

Watch: MKO Abiola responds to the annulment of his election victory (Channels TV archive): https://www.youtube.com/watch?v=rjSNoLSnvvg

#June12 #DemocracyDay #MKOAbiola #NigerianHistory #NigeriaRemembers #KudiratAbiola #ModernNigeria #TheLensNigeria #NigerianDemocracy #HistoryMadeHere #June12NeverForget #NigeriaVotes #OurDemocracy`;

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

async function publishPhotoWithCaption(
  pageId: string,
  pageToken: string,
  imageUrl: string,
  message: string,
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/photos`;
  const body = new URLSearchParams({
    url: imageUrl,
    message,
    published: 'true',
    access_token: pageToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await response.json()) as { id?: string; post_id?: string; error?: GraphApiError };
  if (!response.ok || json.error || !json.id) {
    throw new Error(`Publish failed: ${json.error?.message ?? `HTTP ${response.status}`}`);
  }
  return json.post_id ?? json.id;
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

  const caption = `${POST_BODY}\n\n${IMAGE_CAPTION}`;

  console.log('Publishing photo post (MKO Abiola portrait + caption)...');
  const postId = await publishPhotoWithCaption(pageId, pageToken, IMAGE_URL, caption);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
