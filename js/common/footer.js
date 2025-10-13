import { createElement, mount } from './dom.js';

export function renderFooter(root) {
  const currentYear = new Date().getFullYear();
  const footer = createElement('footer', { classes: ['site-footer'] });
  const inner = createElement('div', { classes: ['inner', 'container'] });

  const left = createElement('div', { text: `© Kalp Pariya ${currentYear}` });
  const right = createElement('div', { classes: ['muted'] });
  right.textContent = 'Electronic Engineering Tools';

  inner.append(left, right);
  footer.append(inner);
  mount(root, footer);
  return footer;
}
