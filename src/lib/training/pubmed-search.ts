// ── PubMed E-utilities search for evidence-based training protocols ──

export interface PubMedResult {
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  pmid: string;
  url: string;
}

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export async function searchTrainingEvidence(
  sport: string,
  goal: string,
): Promise<PubMedResult[]> {
  try {
    const query = encodeURIComponent(
      `"${sport}" AND ("training program" OR "periodization" OR "exercise prescription") AND "${goal}"`,
    );

    // Step 1: E-search — get PMIDs
    const searchUrl = `${BASE_URL}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&term=${query}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'PulseApp/1.0 (contact@pulse.app)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) return [];

    const searchData = (await searchRes.json()) as {
      esearchresult?: { idlist?: string[] };
    };
    const pmids = searchData?.esearchresult?.idlist ?? [];

    if (pmids.length === 0) return [];

    // Step 2: E-summary — get article details
    const summaryUrl = `${BASE_URL}/esummary.fcgi?db=pubmed&retmode=json&id=${pmids.join(',')}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'PulseApp/1.0 (contact@pulse.app)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!summaryRes.ok) return [];

    const summaryData = (await summaryRes.json()) as {
      result?: Record<
        string,
        {
          uid?: string;
          title?: string;
          authors?: { name: string }[];
          fulljournalname?: string;
          source?: string;
          pubdate?: string;
          sortpubdate?: string;
        }
      >;
    };

    const result = summaryData?.result;
    if (!result) return [];

    // Step 3: E-fetch abstracts in bulk
    const fetchUrl = `${BASE_URL}/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${pmids.join(',')}`;
    let abstractMap: Record<string, string> = {};
    try {
      const fetchRes = await fetch(fetchUrl, {
        headers: { 'User-Agent': 'PulseApp/1.0 (contact@pulse.app)' },
        signal: AbortSignal.timeout(10000),
      });
      if (fetchRes.ok) {
        const xml = await fetchRes.text();
        abstractMap = parseAbstractsFromXml(xml, pmids);
      }
    } catch {
      // Abstracts are optional — continue without them
    }

    const articles: PubMedResult[] = pmids
      .filter((id) => result[id])
      .map((id) => {
        const article = result[id];
        const authors =
          article.authors
            ?.slice(0, 3)
            .map((a) => a.name)
            .join(', ') ?? '';
        const year = (article.sortpubdate ?? article.pubdate ?? '').slice(0, 4);
        const journal = article.fulljournalname ?? article.source ?? '';
        const abstract = abstractMap[id] ?? '';

        return {
          title: article.title ?? '',
          authors,
          journal,
          year,
          abstract: abstract.slice(0, 400) + (abstract.length > 400 ? '...' : ''),
          pmid: id,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        };
      })
      .filter((a) => a.title);

    return articles;
  } catch {
    return [];
  }
}

// Parse <AbstractText> from PubMed XML response
function parseAbstractsFromXml(
  xml: string,
  pmids: string[],
): Record<string, string> {
  const map: Record<string, string> = {};

  // Split by PubmedArticle to associate each abstract with its PMID
  const articleBlocks = xml.split('<PubmedArticle>').slice(1);

  for (const block of articleBlocks) {
    // Extract PMID
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const pmid = pmidMatch?.[1];
    if (!pmid || !pmids.includes(pmid)) continue;

    // Extract abstract text (may have multiple sections)
    const abstractParts: string[] = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let match;
    while ((match = abstractRegex.exec(block)) !== null) {
      abstractParts.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    if (abstractParts.length > 0) {
      map[pmid] = abstractParts.join(' ');
    }
  }

  return map;
}
