/**
 * @module utils/id
 */

let counter = 0;

/** Short unique id for turns, events, keys, etc. */
export function uid(prefix = 'id') {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}_${counter}`;
}
