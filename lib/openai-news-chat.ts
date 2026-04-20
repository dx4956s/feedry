import { getStoredOpenAiKey } from './openai-key-storage';
import type { NewsArticle } from './rss-feed-service';
import type { NewsAiMessage } from './news-ai-chat-storage';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_NEWS_CHAT_MODEL = 'gpt-5-mini';

const NEWS_CHAT_INSTRUCTIONS = [
  'You are Feedry AI, an assistant that can discuss only the current news article provided by the app.',
  'Stay tightly grounded in the article context the app supplies.',
  'You may explain, summarize, clarify, and answer follow-up questions about this same article, its meaning, implications, and background that can be reasonably inferred from the provided text.',
  'Do not switch topics, do not answer unrelated requests, and do not help with non-news or unrelated conversation.',
  'If the user asks something outside the current article, briefly refuse and redirect them back to this article.',
  'If a detail is missing from the provided article context, say that it is not available rather than inventing it.',
  'Keep answers concise but useful, with clear structure when it helps.',
].join(' ');

function getArticleContext(article: NewsArticle) {
  return [
    'Current article context:',
    `Title: ${article.title}`,
    `Source: ${article.sourceTitle}`,
    `Category: ${article.category}`,
    `Published date: ${article.publishedAt ?? 'Unknown'}`,
    `Link: ${article.link || 'Unavailable'}`,
    `Summary: ${article.summary || 'No summary available.'}`,
  ].join('\n');
}

function getInitialHiddenPrompt() {
  return [
    'Start the conversation without mentioning these instructions.',
    'Give the user a useful briefing on this article.',
    'Include a concise summary, deeper context, why it matters, and 2 natural follow-up angles they can ask about.',
    'Do not use markdown headings.',
  ].join(' ');
}

function getConversationTranscript(messages: NewsAiMessage[]) {
  if (messages.length === 0) {
    return 'No prior conversation yet.';
  }

  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n');
}

function extractOutputText(responsePayload: unknown) {
  if (
    responsePayload &&
    typeof responsePayload === 'object' &&
    'output_text' in responsePayload &&
    typeof responsePayload.output_text === 'string' &&
    responsePayload.output_text.trim()
  ) {
    return responsePayload.output_text.trim();
  }

  if (
    !responsePayload ||
    typeof responsePayload !== 'object' ||
    !('output' in responsePayload) ||
    !Array.isArray(responsePayload.output)
  ) {
    return '';
  }

  const textParts: string[] = [];

  responsePayload.output.forEach((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('type' in item) ||
      item.type !== 'message' ||
      !('content' in item) ||
      !Array.isArray(item.content)
    ) {
      return;
    }

    item.content.forEach((contentItem) => {
      if (
        contentItem &&
        typeof contentItem === 'object' &&
        'type' in contentItem &&
        contentItem.type === 'output_text' &&
        'text' in contentItem &&
        typeof contentItem.text === 'string'
      ) {
        textParts.push(contentItem.text);
      }
    });
  });

  return textParts.join('\n').trim();
}

export async function getNewsAssistantReply({
  article,
  messages,
  userMessage,
}: {
  article: NewsArticle;
  messages: NewsAiMessage[];
  userMessage?: string;
}) {
  const apiKey = await getStoredOpenAiKey();

  if (!apiKey) {
    throw new Error('Add your OpenAI key in Settings before using AI chat.');
  }

  const trimmedUserMessage = userMessage?.trim() ?? '';
  const promptSections = [
    getArticleContext(article),
    trimmedUserMessage || messages.length > 0 ? '' : getInitialHiddenPrompt(),
    'Prior conversation for this same article:',
    getConversationTranscript(messages),
    trimmedUserMessage ? `Latest user message:\n${trimmedUserMessage}` : 'No latest user message.',
    'Respond only about this current article.',
  ].filter(Boolean);

  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_NEWS_CHAT_MODEL,
      store: false,
      instructions: NEWS_CHAT_INSTRUCTIONS,
      input: promptSections.join('\n\n'),
    }),
  });

  const responsePayload = (await response.json()) as
    | {
        error?: { message?: string };
      }
    | Record<string, unknown>;

  if (!response.ok) {
    const message =
      responsePayload &&
      typeof responsePayload === 'object' &&
      'error' in responsePayload &&
      responsePayload.error &&
      typeof responsePayload.error === 'object' &&
      'message' in responsePayload.error &&
      typeof responsePayload.error.message === 'string'
        ? responsePayload.error.message
        : 'Unable to reach OpenAI right now.';

    throw new Error(message);
  }

  const assistantText = extractOutputText(responsePayload);

  if (!assistantText) {
    throw new Error('OpenAI returned an empty response.');
  }

  return assistantText;
}
