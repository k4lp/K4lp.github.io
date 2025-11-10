import { nowISO } from '../../../core/utils.js';

const API_ENDPOINT = 'https://api.duckduckgo.com/';

export async function duckDuckGoInstant(query) {
  if (!query) return [];

  const url = new URL(API_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_redirect', '1');
  url.searchParams.set('no_html', '1');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`DuckDuckGo Instant Answer failed (${response.status})`);
  }

  const data = await response.json();
  const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
  const flattened = related
    .map((topic) => {
      if (topic.Topics) {
        return topic.Topics;
      }
      return topic;
    })
    .flat()
    .filter(Boolean);

  const answers = flattened.slice(0, 5).map((topic) => ({
    title: topic.Text || topic.Result || 'Related topic',
    summary: sanitizeText(topic.Text || topic.Result || ''),
    url: topic.FirstURL || topic.Icon?.URL || '',
    source: 'DuckDuckGo Instant Answer',
    retrievedAt: nowISO()
  }));

  if (data.Answer || data.AbstractText) {
    answers.unshift({
      title: data.Answer || data.Heading || query,
      url: data.AbstractURL || '',
      summary: data.AbstractText || data.Answer || '',
      source: 'DuckDuckGo Instant Answer',
      retrievedAt: nowISO()
    });
  }

  return answers;
}

function sanitizeText(text = '') {
  if (!text) {
    return '';
  }
  return text
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
