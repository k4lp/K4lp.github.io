import { bootstrapShell } from '../common/app.js';

const enhanceOpsPromise = () => {
  const promiseCard = document.querySelector('[data-ops-promise]');
  if (!promiseCard) return;

  const stamp = document.createElement('p');
  stamp.className = 'card__meta';
  stamp.textContent = 'Local-first guarantee';
  promiseCard.insertBefore(stamp, promiseCard.firstChild);
};

const onReady = () => {
  bootstrapShell();
  enhanceOpsPromise();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
