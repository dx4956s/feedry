import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_STATUS_STORAGE_PREFIX = 'feedry.read_article_ids';

function getReadStatusStorageKey(userId: string) {
  return `${READ_STATUS_STORAGE_PREFIX}.${userId}`;
}

export async function getStoredReadArticleIds(userId: string): Promise<string[]> {
  const storedValue = await AsyncStorage.getItem(getReadStatusStorageKey(userId));

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function setStoredReadArticleIds(userId: string, articleIds: string[]) {
  if (articleIds.length === 0) {
    await AsyncStorage.removeItem(getReadStatusStorageKey(userId));
    return;
  }

  await AsyncStorage.setItem(getReadStatusStorageKey(userId), JSON.stringify(articleIds));
}

function getSourceUrlFromArticleId(articleId: string) {
  const separatorIndex = articleId.indexOf('::');
  return separatorIndex >= 0 ? articleId.slice(0, separatorIndex) : '';
}

export function filterReadArticleIdsForDeletedFeedUrls(articleIds: string[], feedUrls: string[]) {
  if (feedUrls.length === 0) {
    return articleIds;
  }

  const deletedFeedUrlSet = new Set(feedUrls);
  return articleIds.filter(
    (articleId) => !deletedFeedUrlSet.has(getSourceUrlFromArticleId(articleId))
  );
}

export function pruneReadArticleIdsForCurrentFeeds(
  articleIds: string[],
  validArticleIdsByFeedUrl: Map<string, Set<string>>
) {
  if (validArticleIdsByFeedUrl.size === 0) {
    return articleIds;
  }

  return articleIds.filter((articleId) => {
    const sourceUrl = getSourceUrlFromArticleId(articleId);
    const validArticleIds = validArticleIdsByFeedUrl.get(sourceUrl);

    if (!validArticleIds) {
      return true;
    }

    return validArticleIds.has(articleId);
  });
}
