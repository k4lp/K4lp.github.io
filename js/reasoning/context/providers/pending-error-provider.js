import { Storage } from '../../../storage/storage.js';
import { isNonEmptyString } from '../../../core/utils.js';

const INSTRUCTION_TEXT = `YOU TRIED TO USE THE BELOW MENTIONED CODE AND REFERENCES AND YOUR CODE IS THIS
{CODE_PLACEHOLDER}
AND IT THREW THE FOLLOWING ERRORS
{ERROR_PLACEHOLDER}
IF THE ERROR IS RELATED TO THE REFERENCES, PLEASE FETCH THE FRESH LIST OF ALL THE REFERENCES TO GET THE CORRECT REFERENCE, AND IF THE ERROR IS RELATED TO THE SYNTAX, CORRECT THE CODE. THE REASONING STEP THAT YOU GAVE HAS NOT BEEN RECORDED AND THE CURRENT PROGRESS OF THE STEPS ARE ALREADY ATTACHED AS IT IS. NOW, DO NOT DISCUSS THIS, JUST ONE SENTENCE ACKNOWLEDGEMENT IS ENOUGH THAT SHOULD ONLY SAY 'OKAY, THIS IS THE CORRECTED CODE' IN ORDER TO NOT POLLUTE THE CONTEXT. FOLLOW THE INSTRUCTIONS PROPERLY AND METICULOUSLY.`.trim();

export const pendingErrorProvider = {
  id: 'pendingExecutionError',
  collect() {
    return Storage.loadPendingExecutionError();
  },
  format(pending) {
    if (!pending) {
      return '';
    }

    const codeBlock = wrapBlock(pending.code || '(no code recorded)');
    const errorLines = [pending.errorMessage || 'Unknown error'];
    if (isNonEmptyString(pending.stack)) {
      errorLines.push(pending.stack);
    }
    const errorBlock = wrapBlock(errorLines.join('\n'));

    const references = Array.isArray(pending.references) && pending.references.length > 0
      ? pending.references.map((ref) => `- ${ref}`).join('\n')
      : '- (no vault references captured in this failure)';

    const payload = INSTRUCTION_TEXT
      .replace('{CODE_PLACEHOLDER}', `\n${codeBlock}\n`)
      .replace('{ERROR_PLACEHOLDER}', `\n${errorBlock}\n`);

    return [
      '!!! EXECUTION CORRECTION REQUIRED !!!',
      payload,
      '',
      'REFERENCES INVOLVED:',
      references,
      '',
      `Captured at: ${pending.timestamp} (iteration ${pending.iteration ?? 'n/a'})`
    ].join('\n');
  }
};

function wrapBlock(content) {
  const safeContent = isNonEmptyString(content) ? content : '(empty)';
  return `<pre data-context="pending-execution">\n${safeContent}\n</pre>`;
}

export default pendingErrorProvider;
