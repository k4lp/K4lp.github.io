import { TOOL_OPERATION_PIPELINE } from '../../config/tool-usage-config.js';
import { ToolOperationContext } from './tool-operation-context.js';
import { createDefaultProcessors } from './processors/index.js';
import { nowISO } from '../../core/utils.js';

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
    const pipelineStartTime = nowISO();
    console.log(`[${pipelineStartTime}] 🔧 ToolOperationPipeline.run() starting - ${this.pipeline.length} stage(s)`);

    const context = this.contextFactory();
    const summary = context.getSummary();
    const startedAt = Date.now();

    let entitiesCommitted = false;

    for (let i = 0; i < this.pipeline.length; i++) {
      const stage = this.pipeline[i];
      const stageStartTime = nowISO();

      const processor = this.processors.get(stage.processorId);
      if (!processor) {
        console.warn(`[${nowISO()}] ⚠️  Stage ${i + 1}/${this.pipeline.length}: No processor found for '${stage.processorId}'`);
        continue;
      }

      const stageOperations = Array.isArray(stage.operationsKey)
        ? stage.operationsKey.flatMap((key) => operations[key] || [])
        : operations[stage.operationsKey] || [];

      console.log(`[${stageStartTime}] ⚙️  Stage ${i + 1}/${this.pipeline.length}: Processing '${stage.processorId}' - ${stageOperations.length} operation(s)`);

      if (!stage.persistEntities && !entitiesCommitted && hasDirtyEntities(summary)) {
        const commitTime = nowISO();
        console.log(`[${commitTime}] 💾 Committing dirty entities before stage ${i + 1}...`);
        context.commitDirtyEntities();
        entitiesCommitted = true;
        console.log(`[${nowISO()}] ✅ Entities committed`);
      }

      const processStartTime = nowISO();
      await processor.process(context, stageOperations, stage);
      const processEndTime = nowISO();
      console.log(`[${processEndTime}] ✅ Stage ${i + 1}/${this.pipeline.length} completed`);
    }

    if (!entitiesCommitted && hasDirtyEntities(summary)) {
      const finalCommitTime = nowISO();
      console.log(`[${finalCommitTime}] 💾 Final commit of dirty entities...`);
      context.commitDirtyEntities();
      console.log(`[${nowISO()}] ✅ Final entities committed`);
    }

    context.finaliseDuration(startedAt);
    console.log(`[${nowISO()}] ⏱️  Pipeline duration: ${summary.duration}ms`);

    if (options.render !== false) {
      const refreshTime = nowISO();
      console.log(`[${refreshTime}] 🔄 Emitting UI refresh...`);
      context.emitUiRefresh();
      console.log(`[${nowISO()}] ✅ UI refresh emitted`);
    }

    console.log(`[${nowISO()}] ✅ ToolOperationPipeline.run() completed`);
    return summary;
  }
}

export default ToolOperationPipeline;
