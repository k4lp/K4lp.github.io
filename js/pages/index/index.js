import { bootstrapCommonChrome } from '../../common/init.js';
import { createElement, mount } from '../../common/dom.js';
import { tools } from './tools-data.js';

function renderToolCard(tool) {
  const card = createElement('article', { classes: ['card'] });
  const body = createElement('div', { classes: ['card-body'] });
  const title = createElement('h3', { text: tool.name });
  const desc = createElement('p', { text: tool.description });
  const tags = createElement('div', { classes: ['tags'] });
  for (const tag of tool.tags) {
    tags.append(createElement('span', { classes: ['tag'], text: tag }));
  }
  body.append(title, desc, tags);

  const footer = createElement('div', { classes: ['card-footer'] });
  const link = createElement('a', { attrs: { href: tool.href }, text: 'Open' });
  footer.append(createElement('span', { classes: ['muted'], text: tool.id }), link);

  card.append(body, footer);
  return card;
}

function renderIndexMain() {
  const main = document.createElement('main');
  main.className = 'site-main';
  const container = createElement('div', { classes: ['container', 'stack-8'] });

  const hero = createElement('section', { classes: ['hero'] });
  hero.append(createElement('h1', { text: 'Electronic Engineering Tools' }));
  hero.append(createElement('p', { text: 'Swiss, minimalist, monochrome toolkit for PCB assembly and BOM processing. All client-side, no servers.' }));

  const grid = createElement('section', { classes: ['tools-grid'] });
  for (const tool of tools) grid.append(renderToolCard(tool));

  container.append(hero, grid);
  main.append(container);
  return main;
}

function main() {
  bootstrapCommonChrome();
  mount(document.body, renderIndexMain());
}

window.addEventListener('DOMContentLoaded', main);
