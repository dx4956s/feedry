import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import useSWR from 'swr';

import {
  getAuthorCuratedFeeds,
  type AuthorCuratedFeed,
} from '../../lib/author-curated-feed-storage';
import {
  type FeedLink,
  createUserFeedLink,
  deleteUserFeedCategory,
  deleteUserFeedLink,
  getFeedCategories,
  getUserFeedLinks,
  updateUserFeedLink,
} from '../../lib/feed-link-storage';
import {
  filterReadArticleIdsForDeletedFeedUrls,
  getStoredReadArticleIds,
  setStoredReadArticleIds,
} from '../../lib/read-status-storage';
import { LoadingModal } from '../LoadingModal';

function normalizeUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export type FeedListPage = 'rss-links' | 'categories' | 'curated';

type FeedListScreenProps = {
  addFeedSignal?: number;
  onPageChange?: (page: FeedListPage) => void;
  user: User;
};

export function FeedListScreen({ addFeedSignal = 0, onPageChange, user }: FeedListScreenProps) {
  const [categoryInput, setCategoryInput] = useState('');
  const [feedTitle, setFeedTitle] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePage, setActivePage] = useState<FeedListPage>('rss-links');
  const lastAddFeedSignalRef = useRef(addFeedSignal);
  const {
    data: feedLinks = [],
    error: feedLinksError,
    isLoading: isFeedLinksLoading,
    mutate: mutateFeedLinks,
  } = useSWR<FeedLink[]>(['user-feed-links', user.id], () => getUserFeedLinks(user), {
    revalidateOnFocus: false,
  });
  const {
    data: authorCuratedFeeds = [],
    error: authorCuratedError,
    isLoading: isAuthorCuratedLoading,
  } = useSWR<AuthorCuratedFeed[]>(['author-curated-feeds'], getAuthorCuratedFeeds, {
    revalidateOnFocus: false,
  });

  function openAddModal() {
    setCategoryInput('');
    setFeedTitle('');
    setFeedUrl('');
    setEditingLinkId(null);
    setIsCategoryMenuOpen(false);
    setIsModalOpen(true);
  }

  function openEditModal(link: FeedLink) {
    setCategoryInput(link.category);
    setFeedTitle(link.title);
    setFeedUrl(link.url);
    setEditingLinkId(link.id);
    setIsCategoryMenuOpen(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setCategoryInput('');
    setFeedTitle('');
    setIsModalOpen(false);
    setIsCategoryMenuOpen(false);
    setFeedUrl('');
    setEditingLinkId(null);
  }

  function handleCategoryInputChange(value: string) {
    setCategoryInput(value);
    setIsCategoryMenuOpen(true);
  }

  const feedCategories = useMemo(() => getFeedCategories(feedLinks), [feedLinks]);
  const filteredCategories = feedCategories.filter((category) =>
    category.toLowerCase().includes(categoryInput.trim().toLowerCase())
  );

  useEffect(() => {
    onPageChange?.(activePage);
  }, [activePage, onPageChange]);

  useEffect(() => {
    if (addFeedSignal === lastAddFeedSignalRef.current) {
      return;
    }

    lastAddFeedSignalRef.current = addFeedSignal;

    if (activePage === 'rss-links') {
      openAddModal();
    }
  }, [activePage, addFeedSignal]);

  async function handleSaveFeed() {
    const normalizedCategory = categoryInput.trim();
    const normalizedTitle = feedTitle.trim();
    const normalizedUrl = normalizeUrl(feedUrl);

    if (!normalizedTitle) {
      Alert.alert('Invalid title', 'Enter a feed title.');
      return;
    }

    if (!normalizedUrl) {
      Alert.alert('Invalid link', 'Enter an RSS feed link.');
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      Alert.alert('Invalid link', 'Enter a valid RSS feed link.');
      return;
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      Alert.alert('Invalid link', 'Feed links must use HTTP or HTTPS.');
      return;
    }

    if (!normalizedCategory) {
      Alert.alert('Invalid category', 'Select or enter a category.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingLinkId === null) {
        const createdLink = await createUserFeedLink(user, {
          category: normalizedCategory,
          title: normalizedTitle,
          url: normalizedUrl,
        });

        await mutateFeedLinks((currentLinks = []) => [createdLink, ...currentLinks], {
          revalidate: false,
        });
      } else {
        const updatedLink = await updateUserFeedLink(user, {
          category: normalizedCategory,
          id: editingLinkId,
          title: normalizedTitle,
          url: normalizedUrl,
        });

        await mutateFeedLinks(
          (currentLinks = []) =>
            currentLinks.map((link) => (link.id === editingLinkId ? updatedLink : link)),
          {
            revalidate: false,
          }
        );
      }

      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save feed link.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteFeed(linkId: string) {
    try {
      const linkToDelete = feedLinks.find((link) => link.id === linkId);

      await deleteUserFeedLink(user, linkId);
      if (linkToDelete) {
        const currentReadArticleIds = await getStoredReadArticleIds(user.id);
        const nextReadArticleIds = filterReadArticleIdsForDeletedFeedUrls(currentReadArticleIds, [
          linkToDelete.url,
        ]);
        await setStoredReadArticleIds(user.id, nextReadArticleIds);
      }
      await mutateFeedLinks(
        (currentLinks = []) => currentLinks.filter((link) => link.id !== linkId),
        {
          revalidate: false,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete feed link.';
      Alert.alert('Delete failed', message);
    }
  }

  async function handleDeleteCategory(categoryToDelete: string) {
    try {
      const deletedFeedUrls = feedLinks
        .filter((link) => link.category === categoryToDelete)
        .map((link) => link.url);

      await deleteUserFeedCategory(user, categoryToDelete);
      if (deletedFeedUrls.length > 0) {
        const currentReadArticleIds = await getStoredReadArticleIds(user.id);
        const nextReadArticleIds = filterReadArticleIdsForDeletedFeedUrls(
          currentReadArticleIds,
          deletedFeedUrls
        );
        await setStoredReadArticleIds(user.id, nextReadArticleIds);
      }
      await mutateFeedLinks(
        (currentLinks = []) => currentLinks.filter((link) => link.category !== categoryToDelete),
        {
          revalidate: false,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete category.';
      Alert.alert('Delete failed', message);
    }
  }

  async function handleAddAuthorCuratedFeed(feed: AuthorCuratedFeed) {
    setIsSaving(true);

    try {
      const createdLink = await createUserFeedLink(user, {
        category: feed.category,
        title: feed.title,
        url: feed.url,
      });

      await mutateFeedLinks((currentLinks = []) => [createdLink, ...currentLinks], {
        revalidate: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to add this curated feed to your list.';
      Alert.alert('Add failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  const savedFeedUrlSet = useMemo(() => new Set(feedLinks.map((link) => link.url)), [feedLinks]);
  const authorCuratedErrorMessage = authorCuratedError
    ? authorCuratedError instanceof Error
      ? authorCuratedError.message
      : 'Unable to load author curated feeds.'
    : '';
  const feedLinksErrorMessage = feedLinksError
    ? feedLinksError instanceof Error
      ? feedLinksError.message
      : 'Unable to load feed links.'
    : '';

  return (
    <>
      <View className="flex-1 rounded-3xl border border-stone-300 bg-[#fbf8f2] p-4">
        <View className="mb-4">
          <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Feed List
          </Text>
        </View>

        <View className="mb-4 rounded-2xl border border-stone-300 bg-[#f1eadf] p-1.5">
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.9}
              className={`flex-1 rounded-xl px-3 py-3 ${
                activePage === 'rss-links' ? 'bg-stone-900' : 'bg-transparent'
              }`}
              onPress={() => setActivePage('rss-links')}>
              <Text
                className={`text-center text-xs font-semibold uppercase tracking-wider ${
                  activePage === 'rss-links' ? 'text-[#f5f1e8]' : 'text-stone-700'
                }`}>
                RSS Links
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              className={`flex-1 rounded-xl px-3 py-3 ${
                activePage === 'categories' ? 'bg-stone-900' : 'bg-transparent'
              }`}
              onPress={() => setActivePage('categories')}>
              <Text
                className={`text-center text-xs font-semibold uppercase tracking-wider ${
                  activePage === 'categories' ? 'text-[#f5f1e8]' : 'text-stone-700'
                }`}>
                Categories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              className={`flex-1 rounded-xl px-3 py-3 ${
                activePage === 'curated' ? 'bg-stone-900' : 'bg-transparent'
              }`}
              onPress={() => setActivePage('curated')}>
              <Text
                className={`text-center text-xs font-semibold uppercase tracking-wider ${
                  activePage === 'curated' ? 'text-[#f5f1e8]' : 'text-stone-700'
                }`}>
                Curated
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activePage === 'rss-links' ? (
          isFeedLinksLoading ? null : feedLinks.length === 0 ? (
            <View className="flex-1 items-center justify-center px-2">
              <View className="items-center">
                <Text className="mt-3 text-center text-2xl font-bold tracking-tight text-stone-950">
                  No RSS feed link added
                </Text>
              </View>
              {feedLinksErrorMessage ? (
                <Text className="mt-3 text-center text-sm leading-6 text-red-700">
                  {feedLinksErrorMessage}
                </Text>
              ) : null}
              <Text className="mt-4 text-center text-sm leading-6 text-stone-600">
                Use the `+` action in the bottom bar to add a feed.
              </Text>
            </View>
          ) : (
            <ScrollView bounces={false} contentContainerClassName="gap-3 pb-6">
              {feedLinks.map((link) => (
                <View
                  key={link.id}
                  className="rounded-2xl border border-stone-200 bg-[#f8f3ea] p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <View>
                        <Text className="text-lg font-bold tracking-tight text-stone-950">
                          {link.title}
                        </Text>
                        <Text className="mt-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                          {link.category}
                        </Text>
                        <Text
                          className="mt-3 text-sm leading-6 text-stone-800"
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {link.url}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3 pt-1">
                      <TouchableOpacity
                        activeOpacity={0.9}
                        className="h-11 w-11 items-center justify-center rounded-xl border border-stone-300 bg-[#fbf8f2]"
                        onPress={() => openEditModal(link)}>
                        <Ionicons color="#57534e" name="create-outline" size={18} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.9}
                        className="h-11 w-11 items-center justify-center rounded-xl border border-stone-900 bg-stone-900"
                        onPress={() => handleDeleteFeed(link.id)}>
                        <Ionicons color="#f5f1e8" name="trash-outline" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )
        ) : activePage === 'curated' ? (
          isAuthorCuratedLoading ? null : authorCuratedFeeds.length === 0 ? (
            <View className="flex-1 items-center justify-center px-2">
              <Text className="text-center text-2xl font-bold tracking-tight text-stone-950">
                No curated feeds added
              </Text>
              <Text className="mt-3 text-center text-sm leading-6 text-stone-600">
                Add rows in the `authors_curated_feeds` Supabase table and they will appear here.
              </Text>
              {authorCuratedErrorMessage ? (
                <Text className="mt-3 text-center text-sm leading-6 text-red-700">
                  {authorCuratedErrorMessage}
                </Text>
              ) : null}
            </View>
          ) : (
            <ScrollView bounces={false} contentContainerClassName="gap-3 pb-6">
              {authorCuratedErrorMessage ? (
                <Text className="text-sm leading-6 text-red-700">{authorCuratedErrorMessage}</Text>
              ) : null}

              {authorCuratedFeeds.map((feed) => {
                const isAdded = savedFeedUrlSet.has(feed.url);

                return (
                  <View
                    key={feed.id}
                    className="rounded-2xl border border-stone-200 bg-[#f8f3ea] p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold tracking-tight text-stone-950">
                          {feed.title}
                        </Text>
                        <Text className="mt-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                          {feed.category}
                        </Text>
                        <Text
                          className="mt-3 text-sm leading-6 text-stone-800"
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {feed.url}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-3 pt-1">
                        <TouchableOpacity
                          activeOpacity={0.9}
                          className={`h-11 w-11 items-center justify-center rounded-xl border ${
                            isAdded
                              ? 'border-stone-300 bg-stone-200'
                              : 'border-stone-900 bg-stone-900'
                          }`}
                          disabled={isAdded || isSaving}
                          onPress={() => {
                            void handleAddAuthorCuratedFeed(feed);
                          }}>
                          <Ionicons
                            color={isAdded ? '#78716c' : '#f5f1e8'}
                            name={isAdded ? 'checkmark' : 'add'}
                            size={18}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )
        ) : feedCategories.length === 0 ? (
          <View className="flex-1 items-center justify-center px-2">
            <Text className="text-center text-2xl font-bold tracking-tight text-stone-950">
              No categories added
            </Text>
          </View>
        ) : (
          <ScrollView bounces={false} contentContainerClassName="gap-3 pb-6">
            {feedCategories.map((category) => (
              <View
                key={category}
                className="flex-row items-center justify-between rounded-2xl border border-stone-200 bg-[#f8f3ea] p-4">
                <Text className="flex-1 text-base font-semibold text-stone-900">{category}</Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  className="ml-4 h-11 w-11 items-center justify-center rounded-xl border border-stone-900 bg-stone-900"
                  onPress={() =>
                    Alert.alert(
                      'Delete category',
                      `Delete "${category}" and all RSS links in it?`,
                      [
                        { style: 'cancel', text: 'Cancel' },
                        {
                          style: 'destructive',
                          text: 'Delete',
                          onPress: () => {
                            void handleDeleteCategory(category);
                          },
                        },
                      ]
                    )
                  }>
                  <Ionicons color="#f5f1e8" name="trash-outline" size={18} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal animationType="slide" transparent visible={isModalOpen} onRequestClose={closeModal}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0" onPress={closeModal} />

          <View className="rounded-t-3xl bg-[#fbf8f2] px-5 pb-8 pt-5">
            <Pressable>
              <View className="items-center">
                <View className="h-1.5 w-12 rounded-full bg-stone-300" />
              </View>

              <Text className="mt-5 text-center text-xs font-semibold uppercase tracking-widest text-stone-500">
                {editingLinkId ? 'Edit Feed' : 'Add Feed'}
              </Text>

              <KeyboardAwareScrollView
                bounces={false}
                className="mt-5"
                contentContainerClassName="gap-3 pb-2"
                enableAutomaticScroll
                enableOnAndroid
                extraHeight={120}
                extraScrollHeight={120}
                keyboardOpeningTime={0}
                keyboardShouldPersistTaps="handled">
                <TextInput
                  className="h-14 rounded-2xl border border-stone-300 bg-[#f6f0e5] px-4 text-base text-stone-950"
                  onChangeText={setFeedTitle}
                  placeholder="Feed title"
                  placeholderTextColor="#78716c"
                  value={feedTitle}
                />

                <View className="h-14 flex-row items-center rounded-2xl border border-stone-300 bg-[#f6f0e5] px-4">
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit
                    className="flex-1 text-base text-stone-950"
                    keyboardType="url"
                    multiline={false}
                    numberOfLines={1}
                    onChangeText={setFeedUrl}
                    placeholder="https://example.com/rss.xml"
                    placeholderTextColor="#78716c"
                    returnKeyType="done"
                    scrollEnabled
                    textAlignVertical="center"
                    value={feedUrl}
                  />
                </View>

                <View className="gap-2">
                  <View className="h-14 flex-row items-center rounded-2xl border border-stone-300 bg-[#f6f0e5] px-4">
                    <TextInput
                      className="flex-1 py-4 text-base text-stone-950"
                      onChangeText={handleCategoryInputChange}
                      onFocus={() => setIsCategoryMenuOpen(true)}
                      placeholder="Select or type category"
                      placeholderTextColor="#78716c"
                      value={categoryInput}
                    />
                    <TouchableOpacity
                      activeOpacity={0.9}
                      className="ml-3 h-8 w-8 items-center justify-center rounded-full"
                      onPress={() => setIsCategoryMenuOpen((currentValue) => !currentValue)}>
                      <Ionicons
                        color="#57534e"
                        name={isCategoryMenuOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>

                  {isCategoryMenuOpen && filteredCategories.length > 0 ? (
                    <View className="rounded-2xl border border-stone-300 bg-[#f6f0e5] p-1.5">
                      <ScrollView
                        bounces={false}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={{ height: 5 * 30 }}>
                        {filteredCategories.map((category) => (
                          <TouchableOpacity
                            key={category}
                            activeOpacity={0.9}
                            className="justify-center rounded-xl px-3"
                            style={{ height: 30 }}
                            onPress={() => {
                              setCategoryInput(category);
                              setIsCategoryMenuOpen(false);
                            }}>
                            <Text className="text-sm font-medium text-stone-800">{category}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="h-14 flex-1 items-center justify-center rounded-2xl border border-stone-300 bg-[#f6f0e5] px-5"
                    disabled={isSaving}
                    onPress={closeModal}>
                    <Ionicons color="#6f5d4f" name="close-outline" size={20} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    className={`h-14 flex-1 items-center justify-center rounded-2xl px-5 ${
                      isSaving ? 'bg-stone-500' : 'bg-stone-900'
                    }`}
                    disabled={isSaving}
                    onPress={handleSaveFeed}>
                    <Ionicons color="#f5f1e8" name="save-outline" size={20} />
                  </TouchableOpacity>
                </View>
              </KeyboardAwareScrollView>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={isFeedLinksLoading || isAuthorCuratedLoading || isSaving} />
    </>
  );
}
