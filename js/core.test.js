// js/core.test.js

// A simple testing framework
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  const results = [];
  for (const t of tests) {
    try {
      t.fn();
      results.push({ name: t.name, passed: true });
    } catch (e) {
      results.push({ name: t.name, passed: false, error: e.stack });
    }
  }
  return results;
}

// --- KeyRing Tests ---
test('KeyRing should save and load keys', () => {
  const keyring = new KeyRing('test_keys');
  keyring.setKey(0, 'key1');
  keyring.setKey(1, 'key2');
  const newKeyring = new KeyRing('test_keys');
  console.assert(newKeyring.state.keys[0] === 'key1', 'Key 1 was not saved');
  console.assert(newKeyring.state.keys[1] === 'key2', 'Key 2 was not saved');
  localStorage.removeItem('test_keys');
});

test('KeyRing should rotate keys', () => {
  const keyring = new KeyRing('test_keys');
  keyring.setKey(0, 'key1');
  keyring.setKey(1, 'key2');
  keyring.setKey(2, 'key3');
  console.assert(keyring.getActive() === 'key1', 'Initial key is not key1');
  keyring.rotate();
  console.assert(keyring.getActive() === 'key2', 'Rotated key is not key2');
  keyring.rotate();
  console.assert(keyring.getActive() === 'key3', 'Rotated key is not key3');
  keyring.rotate();
  console.assert(keyring.getActive() === 'key1', 'Rotated key is not key1');
  localStorage.removeItem('test_keys');
});


// --- MemoryStore Tests ---
test('MemoryStore should save and load memories', () => {
    const memory = new MemoryStore('test_memory');
    memory.add('summary1', 'details1');
    memory.add('summary2', 'details2');
    const newMemory = new MemoryStore('test_memory');
    const items = newMemory.list();
    console.assert(items.length === 2, 'Incorrect number of memories');
    console.assert(items[0].summary === 'summary1', 'Memory 1 summary is incorrect');
    console.assert(items[1].details === 'details2', 'Memory 2 details is incorrect');
    localStorage.removeItem('test_memory');
});

test('MemoryStore should delete memories', () => {
    const memory = new MemoryStore('test_memory');
    memory.add('summary1', 'details1');
    memory.add('summary2', 'details2');
    memory.del(0);
    const items = memory.list();
    console.assert(items.length === 1, 'Incorrect number of memories after deletion');
    console.assert(items[0].summary === 'summary2', 'Incorrect memory after deletion');
    localStorage.removeItem('test_memory');
});

test('MemoryStore should save and load goals', () => {
    const memory = new MemoryStore('test_memory');
    memory.setGoals('My goal is to test this thing.');
    const newMemory = new MemoryStore('test_memory');
    console.assert(newMemory.getGoals() === 'My goal is to test this thing.', 'Goals were not saved');
    localStorage.removeItem('test_memory');
});

// --- ExternalTools Tests ---
test('ExternalTools should dispatch memory.fetch', async () => {
    const memory = new MemoryStore('test_memory');
    memory.add('summary1', 'details1');
    const tools = new ExternalTools({ memory });
    const result = await tools.dispatch({ name: 'memory.fetch', args: { index: 0 } });
    console.assert(result.ok, 'Dispatch was not ok');
    console.assert(result.data.summary === 'summary1', 'Fetched memory is incorrect');
    localStorage.removeItem('test_memory');
});

test('ExternalTools should dispatch code.run_js', async () => {
    const tools = new ExternalTools({});
    const result = await tools.dispatch({ name: 'code.run_js', args: { code: 'return 1+1' } });
    console.assert(result.ok, 'Dispatch was not ok');
    console.assert(result.lastValue === 2, 'JS execution result is incorrect');
});