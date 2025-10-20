import { bootstrapShell } from '../common/app.js';
import { renderToolCatalog } from './renderers.js';

const initialiseTooling = () => {
  const toolCards = document.querySelector('[data-tool-cards]');
  renderToolCatalog(toolCards);
};

const onReady = () => {
  bootstrapShell();
  initialiseTooling();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
