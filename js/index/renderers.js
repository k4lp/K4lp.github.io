import { toolCatalog } from './tools.js';

const META_BLUEPRINT = [
  { key: 'status', label: 'Status' },
  { key: 'cadence', label: 'Signal cadence' },
  { key: 'stack', label: 'Stack' },
];

const createTag = (label) => {
  const span = document.createElement('span');
  span.className = 'tag';
  span.textContent = label;
  return span;
};

const createMetaList = (tool) => {
  const activeMeta = META_BLUEPRINT.filter(({ key }) => Boolean(tool[key]));
  if (!activeMeta.length) return null;

  const container = document.createElement('dl');
  container.className = 'card__meta';

  activeMeta.forEach(({ key, label }) => {
    const term = document.createElement('dt');
    term.textContent = label;

    const description = document.createElement('dd');
    description.textContent = tool[key];

    container.appendChild(term);
    container.appendChild(description);
  });

  return container;
};

const createToolCard = (tool) => {
  const article = document.createElement('article');
  article.className = 'card card--tool';
  article.dataset.toolId = tool.id;

  if (tool.category) {
    const eyebrow = document.createElement('span');
    eyebrow.className = 'card__eyebrow';
    eyebrow.textContent = tool.category;
    article.appendChild(eyebrow);
  }

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = tool.title;
  article.appendChild(title);

  if (tool.summary) {
    const summary = document.createElement('p');
    summary.className = 'card__description';
    summary.textContent = tool.summary;
    article.appendChild(summary);
  }

  const meta = createMetaList(tool);
  if (meta) {
    article.appendChild(meta);
  }

  if (Array.isArray(tool.tags) && tool.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'tags';
    tool.tags.forEach((tag) => tags.appendChild(createTag(tag)));
    article.appendChild(tags);
  }

  if (tool.link) {
    const link = document.createElement('a');
    link.className = 'card__link';
    link.href = tool.link;
    link.textContent = tool.cta ?? 'Open';
    link.target = tool.link.startsWith('http') ? '_blank' : '_self';
    link.rel = tool.link.startsWith('http') ? 'noopener noreferrer' : '';
    article.appendChild(link);
  }

  return article;
};

export const renderToolCatalog = (node) => {
  if (!node) return;
  node.innerHTML = '';
  toolCatalog.forEach((tool) => {
    node.appendChild(createToolCard(tool));
  });
};
