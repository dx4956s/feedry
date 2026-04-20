import { getStoredOpenAiKey } from './openai-key-storage';
import type { NewsArticle } from './rss-feed-service';
import type { NewsAiMessage } from './news-ai-chat-storage';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_NEWS_CHAT_MODEL = 'gpt-5-mini';
const MAX_CONTEXT_MESSAGES = 6;
const MAX_ARTICLE_SUMMARY_LENGTH = 1800;
const MAX_MESSAGE_CONTENT_LENGTH = 500;

const NEWS_CHAT_INSTRUCTIONS = [
  'You are Feedry AI, an assistant that can discuss only the current news article provided by the app.',
  'Stay tightly grounded in the article context the app supplies.',
  'You may explain, summarize, clarify, and answer follow-up questions about this same article, its meaning, implications, and background that can be reasonably inferred from the provided text.',
  'Do not switch topics, do not answer unrelated requests, and do not help with non-news or unrelated conversation.',
  'If the user asks something outside the current article, briefly refuse and redirect them back to this article.',
  'If a detail is missing from the provided article context, say that it is not available rather than inventing it.',
  'Keep answers concise but useful, with clear structure when it helps.',
].join(' ');

function clipText(value: string | null | undefined, maxLength: number) {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '';
  }

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getArticleContext(article: NewsArticle) {
  return [
    'Current article context:',
    `Title: ${article.title}`,
    `Source: ${article.sourceTitle}`,
    `Category: ${article.category || 'Unknown'}`,
    `Published: ${article.publishedAt ?? 'Unknown'}`,
    `Summary: ${clipText(article.summary || 'No summary available.', MAX_ARTICLE_SUMMARY_LENGTH)}`,
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
  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  if (recentMessages.length === 0) {
    return 'No prior conversation yet.';
  }

  return recentMessages
    .map(
      (message) =>
        `${message.role.toUpperCase()}: ${clipText(message.content, MAX_MESSAGE_CONTENT_LENGTH)}`
    )
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

function parseSseEventChunk(eventChunk: string) {
  const trimmedChunk = eventChunk.trim();

  if (!trimmedChunk) {
    return null;
  }

  const dataLines = trimmedChunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());

  if (dataLines.length === 0) {
    return null;
  }

  const eventData = dataLines.join('\n');

  if (!eventData || eventData === '[DONE]') {
    return null;
  }

  return eventData;
}

export async function getNewsAssistantReply({
  article,
  messages,
  onDelta,
  signal,
  userMessage,
}: {
  article: NewsArticle;
  messages: NewsAiMessage[];
  onDelta?: (content: string) => void;
  signal?: AbortSignal;
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
    signal,
    body: JSON.stringify({
      model: OPENAI_NEWS_CHAT_MODEL,
      store: false,
      stream: true,
      instructions: NEWS_CHAT_INSTRUCTIONS,
      input: promptSections.join('\n\n'),
    }),
  });

  if (!response.ok) {
    const responsePayload = (await response.json()) as
      | {
          error?: { message?: string };
        }
      | Record<string, unknown>;
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

  if (!response.body) {
    const responsePayload = (await response.json()) as Record<string, unknown>;
    const assistantText = extractOutputText(responsePayload);

    if (!assistantText) {
      throw new Error('OpenAI returned an empty response.');
    }

    onDelta?.(assistantText);
    return assistantText;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bufferedText = '';
  let assistantText = '';

  while (true) {
    const { done, value } = await reader.read();

    bufferedText += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const eventChunks = bufferedText.split('\n\n');
    bufferedText = eventChunks.pop() ?? '';

    for (const eventChunk of eventChunks) {
      const parsedEvent = parseSseEventChunk(eventChunk);

      if (!parsedEvent) {
        continue;
      }

      let parsedPayload: unknown;

      try {
        parsedPayload = JSON.parse(parsedEvent);
      } catch {
        continue;
      }

      if (
        parsedPayload &&
        typeof parsedPayload === 'object' &&
        'type' in parsedPayload &&
        parsedPayload.type === 'response.output_text.delta' &&
        'delta' in parsedPayload &&
        typeof parsedPayload.delta === 'string'
      ) {
        assistantText += parsedPayload.delta;
        onDelta?.(assistantText);
        continue;
      }

      if (
        parsedPayload &&
        typeof parsedPayload === 'object' &&
        'type' in parsedPayload &&
        parsedPayload.type === 'error' &&
        'error' in parsedPayload &&
        parsedPayload.error &&
        typeof parsedPayload.error === 'object' &&
        'message' in parsedPayload.error &&
        typeof parsedPayload.error.message === 'string'
      ) {
        throw new Error(parsedPayload.error.message);
      }
    }

    if (done) {
      break;
    }
  }

  if (!assistantText) {
    throw new Error('OpenAI returned an empty response.');
  }

  return assistantText;
}
