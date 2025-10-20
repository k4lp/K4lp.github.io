import { bootstrapShell } from '../common/app.js';
import { renderToolCatalog, renderLifecycleHighlights } from './renderers.js';

const initialiseScannerSkeleton = () => {
  const viewport = document.querySelector('[data-scanner-viewport]');
  const controls = document.querySelector('[data-scanner-controls]');
  if (!viewport || !controls) return;

  const metrics = document.createElement('p');
  metrics.className = 'card__description';
  metrics.textContent = 'Awaiting camera selection…';
  controls.appendChild(metrics);

  controls.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener('input', () => {
      viewport.textContent = `Adjusting ${slider.name} → ${slider.value}`;
    });
  });
};

const initialiseTooling = () => {
  const toolCards = document.querySelector('[data-tool-cards]');
  renderToolCatalog(toolCards);

  const lifecycleNode = document.querySelector('[data-lifecycle-features]');
  renderLifecycleHighlights(lifecycleNode);
};

const onReady = () => {
  bootstrapShell();
  initialiseTooling();
  initialiseScannerSkeleton();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
