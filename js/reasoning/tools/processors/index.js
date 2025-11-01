import { vaultProcessor } from './vault-processor.js';
import { memoryProcessor } from './memory-processor.js';
import { tasksProcessor } from './tasks-processor.js';
import { goalsProcessor } from './goals-processor.js';
import { jsExecuteProcessor } from './js-execute-processor.js';
import { finalOutputProcessor } from './final-output-processor.js';

const processorList = [
  vaultProcessor,
  memoryProcessor,
  tasksProcessor,
  goalsProcessor,
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
  jsExecuteProcessor,
  finalOutputProcessor
};

export default defaultProcessorRegistry;
