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

    const sectionJobs = this.sections.map((sectionConfig) => {
      const includeWhenEmpty = sectionConfig.includeWhenEmpty !== false;
      const provider = this.providers.get(sectionConfig.providerId);

      if (!provider) {
        console.warn(
          `[ReasoningContextBuilder] Provider "${sectionConfig.providerId}" missing for section "${sectionConfig.id}".`
        );
        const fallbackContent = formatSectionContent(undefined, sectionConfig.fallback, includeWhenEmpty);
        return Promise.resolve({
          id: sectionConfig.id,
          content: composeSectionBlock(sectionConfig, fallbackContent)
        });
      }

      const providerContext = {
        ...providerContextBase,
        section: sectionConfig
      };

      const collected = provider.collect
        ? provider.collect(providerContext)
        : provider.build
          ? provider.build(providerContext)
          : undefined;

      const sectionPromise = Promise.resolve(collected)
        .then((resolved) => (provider.format ? provider.format(resolved, providerContext) : resolved))
        .then((formatted) => {
          const content = formatSectionContent(formatted, sectionConfig.fallback, includeWhenEmpty);
          return {
            id: sectionConfig.id,
            content: composeSectionBlock(sectionConfig, content)
          };
        })
        .catch((error) => {
          console.error(
            `[ReasoningContextBuilder] Provider "${sectionConfig.providerId}" failed for section "${sectionConfig.id}":`,
            error
          );
          const fallbackContent = formatSectionContent(null, sectionConfig.fallback, includeWhenEmpty);
          return {
            id: sectionConfig.id,
            content: composeSectionBlock(sectionConfig, fallbackContent)
          };
        });

      return sectionPromise;
    });

    const sectionResults = await Promise.all(sectionJobs);
    const filteredBlocks = sectionResults.map((result) => result.content).filter(Boolean);

    const includedSections = sectionResults.filter((result) => Boolean(result.content)).map((result) => result.id);
    const omittedSections = sectionResults.filter((result) => !result.content).map((result) => result.id);

    if (includedSections.length) {
      console.debug(`[ReasoningContextBuilder] Sections included: ${includedSections.join(', ')}`);
    } else {
      console.warn('[ReasoningContextBuilder] No reasoning context sections produced content.');
    }

    if (omittedSections.length) {
      console.debug(`[ReasoningContextBuilder] Sections omitted or empty: ${omittedSections.join(', ')}`);
    }
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

function composeSectionBlock(sectionConfig, content) {
  if (!content) {
    return null;
  }
  const heading = sectionConfig.heading ? `${sectionConfig.heading}\n` : '';
  return `${heading}${content}`;
}

export default ReasoningContextBuilder;
