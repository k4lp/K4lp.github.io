import { TOOL_OPERATION_PIPELINE } from '../../config/tool-usage-config.js';
import { ToolOperationContext } from './tool-operation-context.js';
import { createDefaultProcessors } from './processors/index.js';

function hasDirtyEntities(summary) {
  const dirty = summary._dirty || {};
  return dirty.vault || dirty.memory || dirty.tasks || dirty.goals;
}

export class ToolOperationPipeline {
  constructor({
    pipeline = TOOL_OPERATION_PIPELINE,
    processors = createDefaultProcessors(),
    contextFactory
  } = {}) {
    this.pipeline = pipeline;
    this.processors = processors;
    this.contextFactory = contextFactory || (() => new ToolOperationContext());
  }

  async run(operations = {}, options = {}) {
    const context = this.contextFactory();
    const summary = context.getSummary();
    const startedAt = Date.now();

    let entitiesCommitted = false;

    for (const stage of this.pipeline) {
      const processor = this.processors.get(stage.processorId);
      if (!processor) continue;

      const stageOperations = Array.isArray(stage.operationsKey)
        ? stage.operationsKey.flatMap((key) => operations[key] || [])
        : operations[stage.operationsKey] || [];

      if (!stage.persistEntities && !entitiesCommitted && hasDirtyEntities(summary)) {
        context.commitDirtyEntities();
        entitiesCommitted = true;
      }

      await processor.process(context, stageOperations, stage);
    }

    if (!entitiesCommitted && hasDirtyEntities(summary)) {
      context.commitDirtyEntities();
    }

    context.finaliseDuration(startedAt);

    if (options.render !== false) {
      context.emitUiRefresh();
    }

    return summary;
  }
}

export default ToolOperationPipeline;
