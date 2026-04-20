import type { User } from '@supabase/supabase-js';

import { supabase } from './supabase';

export type FeedLink = {
  category: string;
  id: string;
  title: string;
  url: string;
};

type FeedRow = {
  category: string;
  id: string;
  title: string;
  url: string;
};

export function getFeedCategories(links: FeedLink[]) {
  return Array.from(new Set(links.map((link) => link.category.trim()).filter(Boolean)));
}

function mapFeedMutationError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return new Error('Unable to save feed link.');
  }

  const maybeCode = 'code' in error ? error.code : undefined;
  const maybeMessage =
    'message' in error && typeof error.message === 'string' ? error.message : undefined;

  if (maybeCode === '23505') {
    return new Error('This RSS feed URL is already added.');
  }

  if (maybeCode === '42P01') {
    return new Error('The rss_feeds table is missing in Supabase. Run the migration first.');
  }

  if (maybeCode === '42501') {
    return new Error('Supabase denied this feed change. Check the row-level security policies.');
  }

  if (maybeMessage) {
    return new Error(maybeMessage);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Unable to save feed link.');
}

export async function getUserFeedLinks(user: User) {
  const { data, error } = await supabase
    .from('rss_feeds')
    .select('id, title, url, category')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw mapFeedMutationError(error);
  }

  return (data ?? []).map((item) => ({
    category: item.category,
    id: item.id,
    title: item.title,
    url: item.url,
  })) as FeedLink[];
}

export async function createUserFeedLink(user: User, link: Omit<FeedLink, 'id'>) {
  const { data, error } = await supabase
    .from('rss_feeds')
    .insert({
      category: link.category,
      title: link.title,
      url: link.url,
      user_id: user.id,
    })
    .select('id, title, url, category')
    .single<FeedRow>();

  if (error) {
    throw mapFeedMutationError(error);
  }

  return data;
}

export async function updateUserFeedLink(user: User, link: FeedLink) {
  const { data, error } = await supabase
    .from('rss_feeds')
    .update({
      category: link.category,
      title: link.title,
      url: link.url,
    })
    .eq('id', link.id)
    .eq('user_id', user.id)
    .select('id, title, url, category')
    .single<FeedRow>();

  if (error) {
    throw mapFeedMutationError(error);
  }

  return data;
}

export async function deleteUserFeedLink(user: User, linkId: string) {
  const { error } = await supabase
    .from('rss_feeds')
    .delete()
    .eq('id', linkId)
    .eq('user_id', user.id);

  if (error) {
    throw mapFeedMutationError(error);
  }
}

export async function deleteUserFeedCategory(user: User, category: string) {
  const { error } = await supabase
    .from('rss_feeds')
    .delete()
    .eq('user_id', user.id)
    .eq('category', category);

  if (error) {
    throw mapFeedMutationError(error);
  }
}
