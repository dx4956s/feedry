import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
} from 'react-native-reanimated';

import { getFeedCategories, getUserFeedLinks, type FeedLink } from '../../lib/feed-link-storage';
import {
  getStoredNewsAiMessages,
  removeStoredNewsAiMessages,
  setStoredNewsAiMessages,
  type NewsAiMessage,
} from '../../lib/news-ai-chat-storage';
import { getStoredOpenAiKey } from '../../lib/openai-key-storage';
import { getNewsAssistantReply } from '../../lib/openai-news-chat';
import {
  getStoredReadArticleIds,
  pruneReadArticleIdsForCurrentFeeds,
  setStoredReadArticleIds,
} from '../../lib/read-status-storage';
import {
  fetchNewsArticles,
  type FeedLoadFailure,
  type NewsArticle,
} from '../../lib/rss-feed-service';
import { LoadingModal } from '../LoadingModal';
import { NewsAiOverlay } from './NewsAiOverlay';

type NewsScreenProps = {
  aiOpenSignal?: number;
  unreadOnly?: boolean;
  user: User;
};

type ReadStatusFilter = 'All' | 'Unread' | 'Read';

const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});
const publishedDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function getArticleDateKey(value: string | null) {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
}

function getDateLabel(dateKey: string) {
  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return dateLabelFormatter.format(parsedDate);
}

function getPublishedDateLabel(value: string | null) {
  if (!value) {
    return 'Publication date unavailable';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Publication date unavailable';
  }

  return publishedDateFormatter.format(parsedDate);
}

function createNewsAiMessage(role: 'assistant' | 'user', content: string): NewsAiMessage {
  return {
    content,
    createdAt: Date.now(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
  };
}

function getCategoryEnteringAnimation(direction: 'previous' | 'next') {
  return direction === 'next'
    ? FadeInRight.duration(180)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateX: 16 }] })
    : FadeInLeft.duration(180)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateX: -16 }] });
}

function getCategoryExitingAnimation(direction: 'previous' | 'next') {
  return direction === 'next'
    ? FadeOutLeft.duration(110)
        .easing(Easing.in(Easing.cubic))
        .withInitialValues({ opacity: 1, transform: [{ translateX: 0 }] })
    : FadeOutRight.duration(110)
        .easing(Easing.in(Easing.cubic))
        .withInitialValues({ opacity: 1, transform: [{ translateX: 0 }] });
}

function getArticleEnteringAnimation(direction: 'previous' | 'next') {
  return direction === 'next'
    ? FadeInUp.duration(240)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: 44 }] })
    : FadeInDown.duration(240)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: -44 }] });
}

function getArticleExitingAnimation(direction: 'previous' | 'next') {
  return direction === 'next'
    ? FadeOutUp.duration(110)
        .easing(Easing.in(Easing.cubic))
        .withInitialValues({ opacity: 1, transform: [{ translateY: 0 }] })
    : FadeOutDown.duration(110)
        .easing(Easing.in(Easing.cubic))
        .withInitialValues({ opacity: 1, transform: [{ translateY: 0 }] });
}

export function NewsScreen({ aiOpenSignal = 0, unreadOnly = false, user }: NewsScreenProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDateFilter, setActiveDateFilter] = useState('All Dates');
  const [activeReadFilter, setActiveReadFilter] = useState<ReadStatusFilter>(
    unreadOnly ? 'Unread' : 'All'
  );
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [feedLinks, setFeedLinks] = useState<FeedLink[]>([]);
  const [failures, setFailures] = useState<FeedLoadFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isReadMenuOpen, setIsReadMenuOpen] = useState(false);
  const [isReadStatusReady, setIsReadStatusReady] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<NewsAiMessage[]>([]);
  const [isAiConversationReady, setIsAiConversationReady] = useState(false);
  const [isAiKeyMissingNoticeOpen, setIsAiKeyMissingNoticeOpen] = useState(false);
  const [isAiOverlayOpen, setIsAiOverlayOpen] = useState(false);
  const [isAiSending, setIsAiSending] = useState(false);
  const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
  const articleScrollRef = useRef<ScrollView | null>(null);
  const articleScrollOffsetYRef = useRef(0);
  const articleScrollViewportHeightRef = useRef(0);
  const articleScrollContentHeightRef = useRef(0);
  const articleTransitionDirectionRef = useRef<'previous' | 'next'>('next');
  const categoryTransitionDirectionRef = useRef<'previous' | 'next'>('next');
  const contentTransitionKindRef = useRef<'article' | 'category'>('article');
  const lastAiOpenSignalRef = useRef(aiOpenSignal);
  const lastAiInitializedArticleIdRef = useRef<string | null>(null);
  const previousArticleIdRef = useRef<string | null>(null);

  const loadNews = useCallback(async () => {
    setIsLoading(true);

    try {
      const links = await getUserFeedLinks(user);
      setFeedLinks(links);

      if (links.length === 0) {
        setArticles([]);
        setFailures([]);
        setCurrentArticleIndex(0);
        return;
      }

      const result = await fetchNewsArticles(links);
      const activeFeedUrls = links.map((link) => link.url);
      const failedFeedUrlSet = new Set(result.failures.map((failure) => failure.url));
      const validArticleIdsByFeedUrl = new Map<string, Set<string>>();

      result.articles.forEach((article) => {
        if (failedFeedUrlSet.has(article.sourceUrl)) {
          return;
        }

        const articleIdsForFeed =
          validArticleIdsByFeedUrl.get(article.sourceUrl) ?? new Set<string>();
        articleIdsForFeed.add(article.id);
        validArticleIdsByFeedUrl.set(article.sourceUrl, articleIdsForFeed);
      });

      setReadArticleIds((currentIds) =>
        pruneReadArticleIdsForCurrentFeeds(
          currentIds.filter((articleId) =>
            activeFeedUrls.some((feedUrl) => articleId.startsWith(`${feedUrl}::`))
          ),
          validArticleIdsByFeedUrl
        )
      );
      setArticles(result.articles);
      setFailures(result.failures);
      setCurrentArticleIndex(0);
    } catch {
      setFeedLinks([]);
      setArticles([]);
      setFailures([
        {
          message: 'Unable to load your feed list.',
          title: 'Feed list',
          url: 'Saved RSS feeds',
        },
      ]);
      setCurrentArticleIndex(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  useEffect(() => {
    let isMounted = true;

    async function loadReadStatus() {
      setIsReadStatusReady(false);

      try {
        const storedArticleIds = await getStoredReadArticleIds(user.id);

        if (!isMounted) {
          return;
        }

        setReadArticleIds(storedArticleIds);
      } catch {
        if (!isMounted) {
          return;
        }

        setReadArticleIds([]);
      } finally {
        if (isMounted) {
          setIsReadStatusReady(true);
        }
      }
    }

    void loadReadStatus();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (!isReadStatusReady) {
      return;
    }

    void setStoredReadArticleIds(user.id, readArticleIds);
  }, [isReadStatusReady, readArticleIds, user.id]);

  useEffect(() => {
    setActiveReadFilter(unreadOnly ? 'Unread' : 'All');
  }, [unreadOnly]);

  const categoryOptions = useMemo(() => ['All', ...getFeedCategories(feedLinks)], [feedLinks]);
  const activeCategoryIndex = Math.max(categoryOptions.indexOf(activeCategory), 0);
  const readFilteredArticles = useMemo(() => {
    if (activeReadFilter === 'Unread') {
      return articles.filter((article) => !readArticleIds.includes(article.id));
    }

    if (activeReadFilter === 'Read') {
      return articles.filter((article) => readArticleIds.includes(article.id));
    }

    return articles;
  }, [activeReadFilter, articles, readArticleIds]);
  const categoryFilteredArticles =
    activeCategory === 'All'
      ? readFilteredArticles
      : readFilteredArticles.filter((article) => article.category === activeCategory);
  const dateOptions = useMemo(() => {
    const availableDateKeys = Array.from(
      new Set(
        categoryFilteredArticles
          .map((article) => getArticleDateKey(article.publishedAt))
          .filter(Boolean)
      )
    ).sort((left, right) => right.localeCompare(left));

    return ['All Dates', ...availableDateKeys.map(getDateLabel)];
  }, [categoryFilteredArticles]);
  const visibleArticles =
    activeDateFilter === 'All Dates'
      ? categoryFilteredArticles
      : categoryFilteredArticles.filter(
          (article) => getDateLabel(getArticleDateKey(article.publishedAt)) === activeDateFilter
        );
  const visibleFailures =
    activeCategory === 'All'
      ? failures
      : failures.filter((failure) =>
          feedLinks.some(
            (link) => link.url === failure.url && link.category.trim() === activeCategory
          )
        );
  const currentArticle = visibleArticles[currentArticleIndex] ?? null;
  const currentFailure = visibleFailures[0] ?? null;
  const isCurrentArticleRead = currentArticle ? readArticleIds.includes(currentArticle.id) : false;
  const remainingUnreadCount = visibleArticles.length;
  const firstUnreadIndex = useMemo(
    () => visibleArticles.findIndex((article) => !readArticleIds.includes(article.id)),
    [readArticleIds, visibleArticles]
  );
  const lastUnreadResetKeyRef = useRef('');

  useEffect(() => {
    if (!categoryOptions.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [activeCategory, categoryOptions]);

  useEffect(() => {
    if (!dateOptions.includes(activeDateFilter)) {
      setActiveDateFilter('All Dates');
    }
  }, [activeDateFilter, dateOptions]);

  useEffect(() => {
    setIsDateMenuOpen(false);
    setIsReadMenuOpen(false);
  }, [activeCategory, activeDateFilter, activeReadFilter]);

  useEffect(() => {
    const articleSetKey = `${activeCategory}:${visibleArticles.map((article) => article.id).join('|')}`;

    if (visibleArticles.length === 0) {
      lastUnreadResetKeyRef.current = articleSetKey;
      setCurrentArticleIndex(0);
      return;
    }

    if (unreadOnly && lastUnreadResetKeyRef.current !== articleSetKey) {
      lastUnreadResetKeyRef.current = articleSetKey;
      if (firstUnreadIndex >= 0) {
        setCurrentArticleIndex(firstUnreadIndex);
        return;
      }
    }

    setCurrentArticleIndex((currentIndex) =>
      currentIndex > visibleArticles.length - 1 ? visibleArticles.length - 1 : currentIndex
    );
  }, [activeCategory, firstUnreadIndex, unreadOnly, visibleArticles]);

  useEffect(() => {
    articleScrollRef.current?.scrollTo({ animated: false, y: 0 });
    articleScrollOffsetYRef.current = 0;
  }, [activeCategory, currentArticle?.id]);

  useEffect(() => {
    let isMounted = true;

    async function syncAiConversation() {
      const nextArticleId = currentArticle?.id ?? null;
      const previousArticleId = previousArticleIdRef.current;

      setAiError('');
      setAiInput('');
      setAiMessages([]);
      setIsAiOverlayOpen(false);
      setIsAiSending(false);
      setIsAiConversationReady(false);
      lastAiInitializedArticleIdRef.current = null;

      if (previousArticleId && previousArticleId !== nextArticleId) {
        await removeStoredNewsAiMessages(user.id, previousArticleId);
      }

      previousArticleIdRef.current = nextArticleId;

      if (!nextArticleId) {
        if (isMounted) {
          setIsAiConversationReady(true);
        }
        return;
      }

      try {
        const storedMessages = await getStoredNewsAiMessages(user.id, nextArticleId);

        if (!isMounted || previousArticleIdRef.current !== nextArticleId) {
          return;
        }

        setAiMessages(storedMessages);
        if (storedMessages.length > 0) {
          lastAiInitializedArticleIdRef.current = nextArticleId;
        }
      } catch {
        if (!isMounted || previousArticleIdRef.current !== nextArticleId) {
          return;
        }

        setAiMessages([]);
      } finally {
        if (isMounted && previousArticleIdRef.current === nextArticleId) {
          setIsAiConversationReady(true);
        }
      }
    }

    void syncAiConversation();

    return () => {
      isMounted = false;
    };
  }, [currentArticle?.id, user.id]);

  useEffect(() => {
    if (!isAiConversationReady || !currentArticle?.id) {
      return;
    }

    void setStoredNewsAiMessages(user.id, currentArticle.id, aiMessages);
  }, [aiMessages, currentArticle?.id, isAiConversationReady, user.id]);

  const requestNewsAssistantReply = useCallback(
    async (userMessage?: string) => {
      if (!currentArticle || isAiSending) {
        return;
      }

      const trimmedUserMessage = userMessage?.trim() ?? '';
      const requestArticleId = currentArticle.id;
      const priorMessages = aiMessages;
      const pendingUserMessage = trimmedUserMessage
        ? createNewsAiMessage('user', trimmedUserMessage)
        : null;

      setAiError('');
      setIsAiSending(true);

      if (pendingUserMessage) {
        setAiMessages((currentMessages) => [...currentMessages, pendingUserMessage]);
        setAiInput('');
      }

      try {
        const assistantReply = await getNewsAssistantReply({
          article: currentArticle,
          messages: priorMessages,
          userMessage: trimmedUserMessage || undefined,
        });

        if (previousArticleIdRef.current !== requestArticleId) {
          return;
        }

        setAiMessages((currentMessages) => [
          ...currentMessages,
          createNewsAiMessage('assistant', assistantReply),
        ]);
      } catch (error) {
        if (previousArticleIdRef.current !== requestArticleId) {
          return;
        }

        setAiError(
          error instanceof Error ? error.message : 'Unable to get an AI reply for this story.'
        );
      } finally {
        if (previousArticleIdRef.current === requestArticleId) {
          setIsAiSending(false);
        }
      }
    },
    [aiMessages, currentArticle, isAiSending]
  );

  const handleAiOpenRequest = useCallback(async () => {
    if (!currentArticle || !isAiConversationReady) {
      return;
    }

    const storedOpenAiKey = await getStoredOpenAiKey();

    if (!storedOpenAiKey?.trim()) {
      setIsAiKeyMissingNoticeOpen(true);
      return;
    }

    setIsAiOverlayOpen(true);

    if (
      aiMessages.length === 0 &&
      !isAiSending &&
      currentArticle.id !== lastAiInitializedArticleIdRef.current
    ) {
      lastAiInitializedArticleIdRef.current = currentArticle.id;
      void requestNewsAssistantReply();
    }
  }, [
    aiMessages.length,
    currentArticle,
    isAiConversationReady,
    isAiSending,
    requestNewsAssistantReply,
  ]);

  useEffect(() => {
    if (aiOpenSignal === lastAiOpenSignalRef.current) {
      return;
    }

    if (!currentArticle || !isAiConversationReady) {
      return;
    }

    lastAiOpenSignalRef.current = aiOpenSignal;
    void handleAiOpenRequest();
  }, [aiOpenSignal, currentArticle, handleAiOpenRequest, isAiConversationReady]);

  const markArticleAsRead = useCallback((articleId: string | null | undefined) => {
    if (!articleId) {
      return;
    }

    setReadArticleIds((currentIds) =>
      currentIds.includes(articleId) ? currentIds : [...currentIds, articleId]
    );
  }, []);

  const setAdjacentCategory = useCallback(
    (direction: 'previous' | 'next') => {
      if (categoryOptions.length <= 1) {
        return;
      }

      const nextIndex =
        direction === 'previous'
          ? Math.max(activeCategoryIndex - 1, 0)
          : Math.min(activeCategoryIndex + 1, categoryOptions.length - 1);

      categoryTransitionDirectionRef.current = direction;
      contentTransitionKindRef.current = 'category';
      setActiveCategory(categoryOptions[nextIndex] ?? 'All');
      setActiveDateFilter('All Dates');
      setIsDateMenuOpen(false);
      setCurrentArticleIndex(0);
    },
    [activeCategoryIndex, categoryOptions]
  );

  const setAdjacentArticle = useCallback(
    (direction: 'previous' | 'next') => {
      if (visibleArticles.length <= 1 || !currentArticle) {
        return;
      }

      const nextIndex =
        direction === 'previous'
          ? Math.max(currentArticleIndex - 1, 0)
          : Math.min(currentArticleIndex + 1, visibleArticles.length - 1);

      if (nextIndex === currentArticleIndex) {
        return;
      }

      articleTransitionDirectionRef.current = direction;
      contentTransitionKindRef.current = 'article';
      markArticleAsRead(currentArticle.id);
      setCurrentArticleIndex(nextIndex);
    },
    [currentArticle, currentArticleIndex, markArticleAsRead, visibleArticles.length]
  );

  function canSwitchArticleFromSwipe(verticalDelta: number) {
    const viewportHeight = articleScrollViewportHeightRef.current;
    const contentHeight = articleScrollContentHeightRef.current;
    const scrollOffsetY = articleScrollOffsetYRef.current;

    if (contentHeight <= viewportHeight + 8) {
      return true;
    }

    if (verticalDelta < 0) {
      return scrollOffsetY + viewportHeight >= contentHeight - 12;
    }

    return scrollOffsetY <= 12;
  }

  const screenSwipeResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);

      if (horizontalDistance > 12 && horizontalDistance > verticalDistance) {
        return true;
      }

      if (
        verticalDistance > 12 &&
        verticalDistance > horizontalDistance &&
        canSwitchArticleFromSwipe(gestureState.dy)
      ) {
        return true;
      }

      return false;
    },
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);

      if (horizontalDistance > 12 && horizontalDistance > verticalDistance) {
        return true;
      }

      if (
        verticalDistance > 12 &&
        verticalDistance > horizontalDistance &&
        canSwitchArticleFromSwipe(gestureState.dy)
      ) {
        return true;
      }

      return false;
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderRelease: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);

      if (horizontalDistance > verticalDistance) {
        if (gestureState.dx <= -24) {
          setAdjacentCategory('next');
        } else if (gestureState.dx >= 24) {
          setAdjacentCategory('previous');
        }
        return;
      }

      if (gestureState.dy <= -24) {
        setAdjacentArticle('next');
      } else if (gestureState.dy >= 24) {
        setAdjacentArticle('previous');
      }
    },
  });

  async function handleOpenInWebView() {
    const targetUrl = currentArticle?.link;

    if (!targetUrl) {
      return;
    }

    await Linking.openURL(targetUrl);
  }

  return (
    <>
      <LoadingModal visible={isLoading} />

      <View className="flex-1 rounded-3xl border border-[#2e241c] bg-[#f6efdf] p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.9}
            className="h-10 w-10 items-center justify-center rounded-xl border border-[#6b5a49] bg-[#efe4d0]"
            onPress={() => {
              void loadNews();
            }}>
            <Ionicons color="#2f251d" name="refresh" size={17} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            className={`h-10 w-10 items-center justify-center rounded-xl border ${
              currentArticle?.link
                ? 'border-[#241c16] bg-[#241c16]'
                : 'border-[#6b5a49] bg-[#efe4d0]'
            }`}
            disabled={!currentArticle?.link}
            onPress={() => {
              void handleOpenInWebView();
            }}>
            <Ionicons
              color={currentArticle?.link ? '#f2e6cf' : '#6c5c4d'}
              name="globe-outline"
              size={17}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-1" {...screenSwipeResponder.panHandlers}>
          {feedLinks.length > 0 ? (
            <View className="mb-2 items-center gap-1.5">
              <View className="flex-row items-center gap-2 self-center">
                <Animated.View
                  key={activeCategory}
                  entering={getCategoryEnteringAnimation(categoryTransitionDirectionRef.current)}
                  exiting={getCategoryExitingAnimation(categoryTransitionDirectionRef.current)}>
                  <View className="self-center rounded-full border border-[#d8c8af] bg-[#f4ebdc] px-4 py-1.5">
                    <View className="flex-row items-center justify-center gap-2">
                      <View className="h-px w-4 bg-[#d2c1a7]" />
                      <Text className="text-[9px] font-semibold uppercase tracking-[2px] text-[#927f6d]">
                        {activeCategory}
                      </Text>
                      <View className="h-px w-4 bg-[#d2c1a7]" />
                    </View>
                  </View>
                </Animated.View>

                {!unreadOnly && dateOptions.length > 1 ? (
                  <View className="relative">
                    <TouchableOpacity
                      activeOpacity={0.9}
                      className="flex-row items-center gap-2 rounded-full border border-[#d8c8af] bg-[#f6edde] px-3 py-1.5"
                      onPress={() => {
                        setIsDateMenuOpen((currentValue) => !currentValue);
                        setIsReadMenuOpen(false);
                      }}>
                      <Text className="text-[9px] font-semibold uppercase tracking-[1.8px] text-[#8f7e6f]">
                        {activeDateFilter}
                      </Text>
                      <Ionicons
                        color="#8f7e6f"
                        name={isDateMenuOpen ? 'chevron-up' : 'chevron-down'}
                        size={12}
                      />
                    </TouchableOpacity>

                    {isDateMenuOpen ? (
                      <View className="absolute right-0 top-10 z-10 min-w-36 rounded-2xl border border-[#d8c8af] bg-[#fbf4e8] p-1.5">
                        {dateOptions.map((dateOption) => (
                          <TouchableOpacity
                            key={dateOption}
                            activeOpacity={0.9}
                            className={`rounded-xl px-3 py-2 ${
                              activeDateFilter === dateOption ? 'bg-[#3a2f26]' : 'bg-transparent'
                            }`}
                            onPress={() => {
                              setActiveDateFilter(dateOption);
                              setCurrentArticleIndex(0);
                              setIsDateMenuOpen(false);
                            }}>
                            <Text
                              className={`text-[10px] font-semibold uppercase tracking-[1.6px] ${
                                activeDateFilter === dateOption
                                  ? 'text-[#f2e6cf]'
                                  : 'text-[#8f7e6f]'
                              }`}>
                              {dateOption}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {!unreadOnly ? (
                  <View className="relative">
                    <TouchableOpacity
                      activeOpacity={0.9}
                      className="flex-row items-center gap-2 rounded-full border border-[#d8c8af] bg-[#f6edde] px-3 py-1.5"
                      onPress={() => {
                        setIsReadMenuOpen((currentValue) => !currentValue);
                        setIsDateMenuOpen(false);
                      }}>
                      <Text className="text-[9px] font-semibold uppercase tracking-[1.8px] text-[#8f7e6f]">
                        {activeReadFilter}
                      </Text>
                      <Ionicons
                        color="#8f7e6f"
                        name={isReadMenuOpen ? 'chevron-up' : 'chevron-down'}
                        size={12}
                      />
                    </TouchableOpacity>

                    {isReadMenuOpen ? (
                      <View className="absolute right-0 top-10 z-10 min-w-28 rounded-2xl border border-[#d8c8af] bg-[#fbf4e8] p-1.5">
                        {(['All', 'Unread', 'Read'] as ReadStatusFilter[]).map((statusOption) => (
                          <TouchableOpacity
                            key={statusOption}
                            activeOpacity={0.9}
                            className={`rounded-xl px-3 py-2 ${
                              activeReadFilter === statusOption ? 'bg-[#3a2f26]' : 'bg-transparent'
                            }`}
                            onPress={() => {
                              setActiveReadFilter(statusOption);
                              setCurrentArticleIndex(0);
                              setIsReadMenuOpen(false);
                            }}>
                            <Text
                              className={`text-[10px] font-semibold uppercase tracking-[1.6px] ${
                                activeReadFilter === statusOption
                                  ? 'text-[#f2e6cf]'
                                  : 'text-[#8f7e6f]'
                              }`}>
                              {statusOption}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {feedLinks.length === 0 ? (
            <View className="flex-1 items-center justify-center px-4">
              <Text className="text-center text-2xl font-bold tracking-tight text-stone-950">
                No RSS feed link added
              </Text>
              <Text className="mt-3 text-center text-sm leading-6 text-stone-600">
                Add at least one feed in Feed List to load news here.
              </Text>
            </View>
          ) : currentArticle ? (
            <View className="relative flex-1 overflow-hidden">
              <Animated.View
                key={`${activeCategory}:${currentArticle.id}`}
                entering={
                  contentTransitionKindRef.current === 'category'
                    ? getCategoryEnteringAnimation(categoryTransitionDirectionRef.current)
                    : getArticleEnteringAnimation(articleTransitionDirectionRef.current)
                }
                exiting={
                  contentTransitionKindRef.current === 'category'
                    ? getCategoryExitingAnimation(categoryTransitionDirectionRef.current)
                    : getArticleExitingAnimation(articleTransitionDirectionRef.current)
                }
                className={`absolute inset-0 rounded-3xl border p-5 ${
                  !unreadOnly && isCurrentArticleRead
                    ? 'border-[#cbb89b] bg-[#efe4cf]'
                    : 'border-[#3a2d22] bg-[#fbf7ef]'
                }`}>
                <View className="mb-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-[10px] font-semibold uppercase tracking-[3px] text-[#7b6858]">
                      The Feedry Bulletin
                    </Text>
                    <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-[#8f7e6f]">
                      {unreadOnly
                        ? `${remainingUnreadCount} Remaining`
                        : `${currentArticleIndex + 1}/${visibleArticles.length}`}
                    </Text>
                  </View>
                  <View className="mt-[3px] h-[1px] bg-[#c7b79b]" />
                </View>

                <View className="flex-row items-center justify-between">
                  <Text
                    className="mr-3 flex-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#6f5d4f]"
                    ellipsizeMode="tail"
                    numberOfLines={1}>
                    {currentArticle.category} · {currentArticle.sourceTitle}
                  </Text>
                </View>

                <View className="flex-1">
                  {currentArticle.imageUrl ? (
                    <Image
                      source={{ uri: currentArticle.imageUrl }}
                      className="mb-3 mt-3 h-44 w-full rounded-2xl bg-stone-200"
                      resizeMode="cover"
                    />
                  ) : null}

                  <Text className="mt-1 text-[24px] font-bold leading-[30px] tracking-tight text-[#1f1712]">
                    {currentArticle.title}
                  </Text>

                  <ScrollView
                    ref={articleScrollRef}
                    bounces={false}
                    className="mt-3 flex-1"
                    nestedScrollEnabled
                    onContentSizeChange={(_, height) => {
                      articleScrollContentHeightRef.current = height;
                    }}
                    onLayout={(event) => {
                      articleScrollViewportHeightRef.current = event.nativeEvent.layout.height;
                    }}
                    onScroll={(event) => {
                      articleScrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
                      articleScrollViewportHeightRef.current =
                        event.nativeEvent.layoutMeasurement.height;
                      articleScrollContentHeightRef.current = event.nativeEvent.contentSize.height;
                    }}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}>
                    {currentArticle.summary ? (
                      <Text className="text-[14px] leading-6 text-[#43362b]">
                        {currentArticle.summary}
                      </Text>
                    ) : (
                      <Text className="text-[14px] leading-6 text-[#726458]">
                        No summary available for this article.
                      </Text>
                    )}
                  </ScrollView>
                </View>

                <View>
                  <View className="mb-3 h-[1px] bg-[#c7b79b]" />
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-xs uppercase tracking-[1.8px] text-[#6f5d4f]">
                      {getPublishedDateLabel(currentArticle.publishedAt)}
                    </Text>
                    {!unreadOnly && isCurrentArticleRead ? (
                      <Text className="ml-3 text-[11px] font-semibold uppercase tracking-[2px] text-[#8f7e6f]">
                        Read
                      </Text>
                    ) : null}
                  </View>

                  {visibleFailures.length > 0 ? (
                    <Text className="mt-4 text-sm leading-6 text-red-700" numberOfLines={2}>
                      Could not load: {visibleFailures[0]?.url}
                    </Text>
                  ) : null}
                </View>
              </Animated.View>
            </View>
          ) : currentFailure ? (
            <View className="flex-1 justify-center">
              <View className="rounded-3xl border border-red-200 bg-[#fff1ef] p-5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-red-600">
                  Feed Load Failed
                </Text>
                <Text className="mt-3 text-2xl font-bold tracking-tight text-stone-950">
                  {currentFailure.title}
                </Text>
                <Text className="mt-3 text-sm leading-6 text-stone-700">{currentFailure.url}</Text>
                <Text className="mt-3 text-sm leading-6 text-red-700">
                  {currentFailure.message === 'Failed to fetch'
                    ? 'This feed could not be loaded. The URL may be wrong or blocked.'
                    : currentFailure.message}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-1 justify-center">
              <View className="rounded-3xl border border-stone-200 bg-[#f8f3ea] p-5">
                <Text className="text-lg font-bold tracking-tight text-stone-950">
                  No news data available
                </Text>
                <Text className="mt-3 text-sm leading-6 text-stone-600">
                  {activeCategory === 'All'
                    ? 'This feed does not have any items to show right now.'
                    : `No items are available in ${activeCategory} right now.`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <NewsAiOverlay
        article={currentArticle}
        error={aiError}
        input={aiInput}
        isSending={isAiSending}
        messages={aiMessages}
        onChangeInput={setAiInput}
        onClose={() => setIsAiOverlayOpen(false)}
        onSend={() => {
          void requestNewsAssistantReply(aiInput);
        }}
        visible={isAiOverlayOpen}
      />

      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={isAiKeyMissingNoticeOpen}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-stone-200 bg-[#fbf8f2] px-5 py-5">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-stone-500">
              AI Unavailable
            </Text>
            <Text className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
              Add your OpenAI key in Settings
            </Text>
            <Text className="mt-3 text-sm leading-6 text-stone-700">
              AI chat works only after you add an OpenAI key in Settings.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-stone-600">
              Your OpenAI key is stored only locally on this device.
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              className="mt-5 h-12 items-center justify-center rounded-2xl bg-stone-900 px-4"
              onPress={() => setIsAiKeyMissingNoticeOpen(false)}>
              <Text className="text-sm font-semibold uppercase tracking-[1.6px] text-[#f5f1e8]">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
