import { createElement, mount } from './dom.js';

export function renderNavbar(root) {
  const header = createElement('header', { classes: ['navbar'] });
  const inner = createElement('div', { classes: ['inner', 'container'] });

  const brand = createElement('a', { classes: ['nav-brand'], attrs: { href: 'index.html' }, text: 'EE Tools' });
  const actions = createElement('div', { classes: ['nav-actions'] });

  const settingsBtn = createElement('button', { classes: ['icon-btn'], attrs: { 'data-action': 'open-settings', type: 'button', title: 'Settings' } });
  settingsBtn.innerHTML = '⚙️';

  actions.append(settingsBtn);
  inner.append(brand, actions);
  header.append(inner);
  mount(root, header);

  return { header, settingsBtn };
}
