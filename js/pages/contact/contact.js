import { bootstrapCommonChrome } from '../../common/init.js';
import { createElement, mount } from '../../common/dom.js';

function renderContactMain() {
  const main = document.createElement('main');
  main.className = 'site-main';
  const container = createElement('div', { classes: ['container'] });

  const section = createElement('section', { classes: ['contact'] });
  section.append(createElement('h1', { text: 'Contact' }));
  section.append(createElement('p', { classes: ['lead'], text: 'This project is a client-side toolkit for electronic engineers focusing on PCB assembly workflows, BOM processing, and distributor integrations (Digi-Key, Mouser). No servers, your data stays in your browser.' }));

  const form = createElement('div', { classes: ['card'] });
  const body = createElement('div', { classes: ['card-body', 'stack-6'] });

  const emailField = createElement('div', { classes: ['field'] });
  emailField.append(createElement('label', { classes: ['label'], attrs: { for: 'email' }, text: 'Email (placeholder)' }));
  emailField.append(createElement('input', { attrs: { id: 'email', class: 'input', placeholder: 'name@example.com', type: 'email' } }));

  const msgField = createElement('div', { classes: ['field'] });
  msgField.append(createElement('label', { classes: ['label'], attrs: { for: 'message' }, text: 'Message (placeholder)' }));
  msgField.append(createElement('textarea', { attrs: { id: 'message', rows: '5', placeholder: 'Your message...' } }));

  const hint = createElement('p', { classes: ['muted'], text: 'Note: This is a static site. The fields above are placeholders for future client-side export or integration.' });

  body.append(emailField, msgField, hint);
  form.append(body);

  section.append(form);
  container.append(section);
  main.append(container);
  return main;
}

function main() {
  bootstrapCommonChrome();
  mount(document.body, renderContactMain());
}

window.addEventListener('DOMContentLoaded', main);
