import GroqClient from '../../api/groq-client.js';
import { nowISO } from '../../core/utils.js';

const SYSTEM_PROMPT = `You are a live-intelligence researcher with access to high-frequency web reports.
- Produce concise, evidence-backed summaries that focus strictly on the user's query.
- Present the response in markdown with short paragraphs, then add a "Sources" section that lists 8–12 bullet links to reputable websites.
- Never mention Groq or internal tooling; act as if you browsed the public web yourself.
- Highlight concrete dates, actors, metrics, and disagreements when applicable.
- If information cannot be verified, state that explicitly.`;

export async function groqCompoundSearch(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('groqCompoundSearch requires a non-empty query');
  }

  const prompt = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `Primary query: "${query.trim()}"`,
        '',
        'Requirements:',
        '1. Use the most recent information you can find. Output the current date and time and timezone.',
        '2. Cite concrete facts (dates, figures, names) whenever possible. Or deny of the online presence of information. Use the websearch tool religiously.',
        '3. Provide a "Sources" section with bullet links and short labels. Output the whole links.',
        '4. Do not discuss internal tools or Groq; present findings as if gathered manually. Use Extremely short yet extremely information rich responses. If more information is Available, include that in the output too and ask if they want to know more about it.'
      ].join('\n')
    }
  ];

  const content = await GroqClient.chat(prompt);

  return {
    id: 'groqCompound',
    name: 'Groq Compound Search',
    items: [
      {
        title: `Groq Compound Summary for "${query.trim()}"`,
        summary: content,
        source: 'Groq Compound Search',
        retrievedAt: nowISO()
      }
    ]
  };
}

export default groqCompoundSearch;
