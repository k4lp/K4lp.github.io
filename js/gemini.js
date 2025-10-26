// gemini.js – LLM integration and reasoning loop
// This is a thin orchestrator that the runtime calls.
// It demonstrates structure and returns echoed state updates.

export async function orchestrateResearch(query, snapshot){
  // Example: decompose into two tasks and make a trivial log
  const now = Date.now();
  const tasks = [
    { identifier:`t_${now}_1`, createdAt:now, heading:'Decompose Query', content:'Split into atomic subtasks', status:'finished', notes:'done' },
    { identifier:`t_${now}_2`, createdAt:now, heading:'Search Sources', content:'Gather references and notes', status:'ongoing', notes:'in-progress' },
  ];
  const memories = snapshot.memories||[];
  const goals = snapshot.goals?.length ? snapshot.goals : [
    { identifier:`g_${now}`, createdAt:now, heading:'Deliver structured output', content:'Produce validated final answer', notes:'' }
  ];
  const vault = snapshot.vault||{};
  const iterationLog = (snapshot.iterationLog||[]).concat([
    { iter:(snapshot.iterationCount||0)+1, ts:now, summary:'Boot iteration', details:`Received query: ${query}` }
  ]);
  const iterationCount = (snapshot.iterationCount||0)+1;

  // Naive final output + status
  const finalOutput = `Summary for: ${query}\n\n- Tasks: ${tasks.length}\n- Goals: ${goals.length}\n\nOK`;
  const finalStatus = 'verified';

  // Simulate API key usage bump on active key
  const apiKeys = (snapshot.apiKeys||[]).map((k,i)=> i===snapshot.activeKeyIndex ? {...k, usage:(k.usage||0)+1, valid:k.valid||!!(k.value)} : k);

  return { tasks, memories, goals, vault, iterationLog, iterationCount, finalOutput, finalStatus, apiKeys, activeKeyIndex: snapshot.activeKeyIndex, modelId: snapshot.modelId };
}
