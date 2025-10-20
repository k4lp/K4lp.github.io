import { toolCatalog } from './tools.js';

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
  link.textContent = tool.linkLabel ?? 'Open';

  article.appendChild(title);
  article.appendChild(description);
  article.appendChild(tags);
  article.appendChild(link);

  return article;
};

export const renderToolCatalog = (node) => {
  if (!node) return;
  node.innerHTML = '';
  toolCatalog.forEach((tool) => {
    node.appendChild(createToolCard(tool));
  });
};
