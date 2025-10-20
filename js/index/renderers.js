import { toolCatalog, lifecycleHighlights } from './tools.js';

const createTag = (label) => {
  const span = document.createElement('span');
  span.className = 'tag';
  span.textContent = label;
  return span;
};

const createToolCard = (tool) => {
  const article = document.createElement('article');
  article.className = 'card';

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = tool.title;

  const description = document.createElement('p');
  description.className = 'card__description';
  description.textContent = tool.description;

  const tags = document.createElement('div');
  tags.className = 'tags';
  tool.tags.forEach((tag) => tags.appendChild(createTag(tag)));

  const link = document.createElement('a');
  link.className = 'card__link';
  link.href = tool.link;
  link.textContent = 'Open';

  article.appendChild(title);
  article.appendChild(description);
  article.appendChild(tags);
  article.appendChild(link);

  return article;
};

const createLifecycleFeature = (feature) => {
  const container = document.createElement('div');
  container.className = 'feature-item';

  const title = document.createElement('span');
  title.className = 'feature-item__title';
  title.textContent = feature.title;

  const description = document.createElement('span');
  description.className = 'feature-item__description';
  description.textContent = feature.description;

  container.appendChild(title);
  container.appendChild(description);

  return container;
};

export const renderToolCatalog = (node) => {
  if (!node) return;
  node.innerHTML = '';
  toolCatalog.forEach((tool) => {
    node.appendChild(createToolCard(tool));
  });
};

export const renderLifecycleHighlights = (node) => {
  if (!node) return;
  node.innerHTML = '';
  lifecycleHighlights.forEach((feature) => {
    node.appendChild(createLifecycleFeature(feature));
  });
};
