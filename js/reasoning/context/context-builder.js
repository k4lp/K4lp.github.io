import {
  REASONING_CONTEXT_LIMITS,
  REASONING_CONTEXT_SECTIONS,
  REASONING_PROMPT_FRAGMENTS
} from '../../config/reasoning-config.js';
import { createDefaultContextProviders } from './providers/index.js';
import { ReasoningStateSnapshot } from './state-snapshot.js';

/**
 * ReasoningContextBuilder
 *
 * Orchestrates the transformation of raw storage state into a structured
 * context prompt using pluggable providers defined via configuration.
 */
export class ReasoningContextBuilder {
  constructor(options = {}) {
    this.sections = options.sections || REASONING_CONTEXT_SECTIONS;
    this.limits = { ...REASONING_CONTEXT_LIMITS, ...(options.limits || {}) };
    this.fragments = { ...REASONING_PROMPT_FRAGMENTS, ...(options.fragments || {}) };
    this.providers = options.providers || createDefaultContextProviders();
    this.snapshotFactory = options.snapshotFactory || (() => new ReasoningStateSnapshot({
      storage: options.storage,
      vaultManager: options.vaultManager
    }));
  }

  async buildPrompt({
    query = '',
    iteration = 1,
    maxIterations = 1,
    systemPrompt = '',
    instructions = ''
  } = {}) {
    const snapshot = this.snapshotFactory();
    snapshot.capture();

    const providerContextBase = {
      query,
      iteration,
      maxIterations,
      limits: this.limits,
      snapshot
    };

    const sectionBlocks = [];

    for (const sectionConfig of this.sections) {
      const provider = this.providers.get(sectionConfig.providerId);
      if (!provider) {
        continue;
      }

      const providerContext = {
        ...providerContextBase,
        section: sectionConfig
      };

      const collected = provider.collect
        ? provider.collect(providerContext)
        : undefined;

      const sectionPromise = Promise.resolve(collected)
        .then((resolved) => {
          const formattedResult = provider.format
            ? provider.format(resolved, providerContext)
            : resolved;

          return Promise.resolve(formattedResult);
        })
        .then((formatted) => {
          const includeWhenEmpty = sectionConfig.includeWhenEmpty !== false;
          const content = formatSectionContent(formatted, sectionConfig.fallback, includeWhenEmpty);

          if (!content) {
            return null;
          }

          const heading = sectionConfig.heading ? `${sectionConfig.heading}\n` : '';
          return `${heading}${content}`;
        });

      sectionBlocks.push(sectionPromise);
    }

    const blocks = await Promise.all(sectionBlocks);
    const filteredBlocks = blocks.filter(Boolean);
    const sectionsBody = filteredBlocks.join(this.fragments.sectionJoiner || '\n\n');

    const iterationLine = (this.fragments.iterationTemplate || '**Iteration:** {iteration}/{maxIterations}')
      .replace('{iteration}', iteration)
      .replace('{maxIterations}', maxIterations);

    const promptParts = [];
    if (systemPrompt) {
      promptParts.push(systemPrompt.trim());
    }

    if (this.fragments.heading) {
      promptParts.push(this.fragments.heading);
    }

    if (sectionsBody) {
      promptParts.push(sectionsBody);
    }

    promptParts.push(iterationLine);

    let prompt = promptParts.join('\n\n');

    if (instructions) {
      prompt += `${this.fragments.separator || '\n\n'}${instructions}`;
    }

    return prompt;
  }
}

function formatSectionContent(content, fallback, includeWhenEmpty) {
  const text = typeof content === 'string'
    ? content.trim()
    : Array.isArray(content)
      ? content.filter(Boolean).join('\n').trim()
      : content || '';

  if (text) {
    return text;
  }

  return includeWhenEmpty ? (fallback || '') : '';
}

export default ReasoningContextBuilder;
