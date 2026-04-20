import { supabase } from './supabase';

export type AuthorCuratedFeed = {
  category: string;
  id: string;
  title: string;
  url: string;
};

type AuthorCuratedFeedRow = {
  category: string;
  id: string;
  title: string;
  url: string;
};

const AUTHOR_CURATED_FEEDS_TABLE = 'authors_curated_feeds';

function mapAuthorCuratedFeedError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return new Error('Unable to load author curated feeds.');
  }

  const maybeCode = 'code' in error ? error.code : undefined;
  const maybeMessage =
    'message' in error && typeof error.message === 'string' ? error.message : undefined;

  if (maybeCode === '42P01') {
    return new Error(
      `The ${AUTHOR_CURATED_FEEDS_TABLE} table is missing in Supabase. Create it first.`
    );
  }

  if (maybeCode === '42501') {
    return new Error(
      `Supabase denied access to ${AUTHOR_CURATED_FEEDS_TABLE}. Check the row-level security policies.`
    );
  }

  if (maybeMessage) {
    return new Error(maybeMessage);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Unable to load author curated feeds.');
}

export async function getAuthorCuratedFeeds() {
  const { data, error } = await supabase
    .from(AUTHOR_CURATED_FEEDS_TABLE)
    .select('id, title, url, category')
    .order('created_at', { ascending: false });

  if (error) {
    throw mapAuthorCuratedFeedError(error);
  }

  return (data ?? []).map((item) => ({
    category: item.category,
    id: item.id,
    title: item.title,
    url: item.url,
  })) as AuthorCuratedFeedRow[];
}
