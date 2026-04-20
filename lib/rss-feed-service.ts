import { XMLParser } from 'fast-xml-parser';

import type { FeedLink } from './feed-link-storage';

export type NewsArticle = {
  category: string;
  id: string;
  imageUrl: string | null;
  link: string;
  publishedAt: string | null;
  sourceTitle: string;
  sourceUrl: string;
  summary: string;
  title: string;
};

export type FeedLoadFailure = {
  message: string;
  title: string;
  url: string;
};

export type FeedLoadResult = {
  articles: NewsArticle[];
  failures: FeedLoadFailure[];
};

type ParsedXmlNode = Record<string, unknown>;

const FEED_REQUEST_TIMEOUT_MS = 10000;

const feedXmlParser = new XMLParser({
  attributeNamePrefix: '',
  cdataPropName: '__cdata',
  htmlEntities: true,
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: true,
  removeNSPrefix: true,
  trimValues: true,
});

function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlTags(value: string) {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createArticleId(sourceUrl: string, articleLink: string, title: string) {
  return `${sourceUrl}::${articleLink || title}`;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getTextValue(value: unknown): string {
  if (typeof value === 'string') {
    return decodeXmlEntities(value).trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as ParsedXmlNode;
  const directText =
    getTextValue(record['#text']) ||
    getTextValue(record.__cdata) ||
    getTextValue(record.text) ||
    getTextValue(record.href) ||
    getTextValue(record.url) ||
    getTextValue(record.src);

  if (directText) {
    return directText;
  }

  return (
    Object.values(record)
      .map((item) => getTextValue(item))
      .find(Boolean) ?? ''
  );
}

function getSummaryValue(value: unknown) {
  if (typeof value === 'string') {
    return stripHtmlTags(value);
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  return stripHtmlTags(
    Object.values(value as ParsedXmlNode)
      .map((item) => getTextValue(item))
      .join(' ')
  );
}

function getFirstNonEmptyValue(...values: unknown[]) {
  return values.map((value) => getTextValue(value)).find(Boolean) ?? '';
}

function getImageUrlFromNode(node: ParsedXmlNode) {
  const enclosureNodes = [
    ...asArray(node.enclosure),
    ...asArray(node.content),
    ...asArray(node.thumbnail),
  ];

  for (const enclosureNode of enclosureNodes) {
    if (!enclosureNode || typeof enclosureNode !== 'object') {
      continue;
    }

    const attributes = enclosureNode as ParsedXmlNode;
    const url = getFirstNonEmptyValue(attributes.url, attributes.href, attributes.src);
    const type = getTextValue(attributes.type).toLowerCase();

    if (url && (!type || type.startsWith('image/'))) {
      return url;
    }
  }

  const htmlSources = [
    getTextValue(node.description),
    getTextValue(node.summary),
    getTextValue(node['content:encoded']),
    getTextValue(node.encoded),
    getTextValue(node.content),
  ].filter(Boolean);

  for (const source of htmlSources) {
    const imageMatch = source.match(/<img[^>]+src=["']([^"']+)["']/i);

    if (imageMatch?.[1]) {
      return decodeXmlEntities(imageMatch[1].trim());
    }
  }

  return '';
}

function getAtomLink(entry: ParsedXmlNode) {
  const linkNodes = asArray(entry.link);
  let fallbackHref = '';

  for (const linkNode of linkNodes) {
    if (typeof linkNode === 'string') {
      if (!fallbackHref) {
        fallbackHref = decodeXmlEntities(linkNode.trim());
      }
      continue;
    }

    if (!linkNode || typeof linkNode !== 'object') {
      continue;
    }

    const attributes = linkNode as ParsedXmlNode;
    const href = getTextValue(attributes.href);
    const rel = getTextValue(attributes.rel).toLowerCase();

    if (href && (!rel || rel === 'alternate')) {
      return href;
    }

    if (!fallbackHref && href) {
      fallbackHref = href;
    }
  }

  return fallbackHref;
}

function parseRssItems(source: FeedLink, channel: ParsedXmlNode) {
  const sourceTitle = getFirstNonEmptyValue(channel.title, source.title) || source.title;
  const items = asArray(channel.item);

  return items
    .map((item) => {
      const itemNode = item as ParsedXmlNode;
      const title = getFirstNonEmptyValue(itemNode.title, 'Untitled article') || 'Untitled article';
      const link = getFirstNonEmptyValue(itemNode.link, itemNode.guid);
      const imageUrl = getImageUrlFromNode(itemNode) || null;
      const summary =
        getFirstNonEmptyValue(
          getSummaryValue(itemNode.description),
          getSummaryValue(itemNode.encoded),
          getSummaryValue(itemNode.content)
        ) || '';
      const publishedAt =
        getFirstNonEmptyValue(itemNode.pubDate, itemNode.date, itemNode.published) || null;

      return {
        category: source.category,
        id: createArticleId(source.url, link, title),
        imageUrl,
        link,
        publishedAt,
        sourceTitle,
        sourceUrl: source.url,
        summary,
        title,
      } satisfies NewsArticle;
    })
    .filter((item) => item.link || item.title);
}

function parseAtomEntries(source: FeedLink, feed: ParsedXmlNode) {
  const sourceTitle = getFirstNonEmptyValue(feed.title, source.title) || source.title;
  const entries = asArray(feed.entry);

  return entries
    .map((entry) => {
      const entryNode = entry as ParsedXmlNode;
      const title =
        getFirstNonEmptyValue(entryNode.title, 'Untitled article') || 'Untitled article';
      const link = getAtomLink(entryNode);
      const imageUrl = getImageUrlFromNode(entryNode) || null;
      const summary =
        getFirstNonEmptyValue(
          getSummaryValue(entryNode.summary),
          getSummaryValue(entryNode.content)
        ) || '';
      const publishedAt =
        getFirstNonEmptyValue(entryNode.published, entryNode.updated, entryNode.date) || null;

      return {
        category: source.category,
        id: createArticleId(source.url, link, title),
        imageUrl,
        link,
        publishedAt,
        sourceTitle,
        sourceUrl: source.url,
        summary,
        title,
      } satisfies NewsArticle;
    })
    .filter((item) => item.link || item.title);
}

function getSortableTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function parseFeedXml(source: FeedLink, xml: string) {
  const parsedXml = feedXmlParser.parse(xml) as ParsedXmlNode;

  if (parsedXml.feed && typeof parsedXml.feed === 'object') {
    return parseAtomEntries(source, parsedXml.feed as ParsedXmlNode);
  }

  if (parsedXml.rss && typeof parsedXml.rss === 'object') {
    const rssNode = parsedXml.rss as ParsedXmlNode;
    const channelNode =
      rssNode.channel && typeof rssNode.channel === 'object'
        ? (rssNode.channel as ParsedXmlNode)
        : rssNode;

    return parseRssItems(source, channelNode);
  }

  if (parsedXml.channel && typeof parsedXml.channel === 'object') {
    return parseRssItems(source, parsedXml.channel as ParsedXmlNode);
  }

  throw new Error('Feed format is not supported.');
}

async function fetchFeed(source: FeedLink) {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timeoutId = setTimeout(() => {
    controller?.abort();
  }, FEED_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      source.url,
      controller ? { signal: controller.signal } : undefined
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    return parseFeedXml(source, xml);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchNewsArticles(feedLinks: FeedLink[]): Promise<FeedLoadResult> {
  const settledResults = await Promise.allSettled(
    feedLinks.map(async (link) => ({
      articles: await fetchFeed(link),
      source: link,
    }))
  );

  const articles: NewsArticle[] = [];
  const failures: FeedLoadFailure[] = [];

  for (const [index, result] of settledResults.entries()) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value.articles);
      continue;
    }

    const reason = result.reason;
    const failedSource = feedLinks[index];
    const message =
      reason instanceof Error && reason.message ? reason.message : 'Unable to load this feed.';

    failures.push({
      message,
      title: failedSource.title,
      url: failedSource.url,
    });
  }

  return {
    articles: articles.sort(
      (left, right) => getSortableTime(right.publishedAt) - getSortableTime(left.publishedAt)
    ),
    failures,
  };
}
