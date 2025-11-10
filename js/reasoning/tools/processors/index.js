import { vaultProcessor } from './vault-processor.js';
import { memoryProcessor } from './memory-processor.js';
import { tasksProcessor } from './tasks-processor.js';
import { goalsProcessor } from './goals-processor.js';
import { jsExecuteProcessor } from './js-execute-processor.js';
import { finalOutputProcessorV2 as finalOutputProcessor } from './final-output-processor-v2.js';
import { subagentProcessor } from './subagent-processor.js';

const processorList = [
  vaultProcessor,
  memoryProcessor,
  tasksProcessor,
  goalsProcessor,
  subagentProcessor,
  jsExecuteProcessor,
  finalOutputProcessor
];

function toMap(list) {
  return new Map(list.map((processor) => [processor.id, processor]));
}

export const defaultProcessorRegistry = toMap(processorList);

export function createDefaultProcessors() {
  return toMap(processorList);
}

export {
  vaultProcessor,
  memoryProcessor,
  tasksProcessor,
  goalsProcessor,
  subagentProcessor,
  jsExecuteProcessor,
  finalOutputProcessor
};

export default defaultProcessorRegistry;
