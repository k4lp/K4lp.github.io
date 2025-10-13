// DOM utilities for element creation and mounting
export function createElement(tagName, options = {}) {
  const { classes = [], attrs = {}, text = null } = options;
  const element = document.createElement(tagName);
  if (Array.isArray(classes)) {
    for (const className of classes) {
      if (className) element.classList.add(className);
    }
  }
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      element.setAttribute(name, String(value));
    }
  }
  if (text !== null && text !== undefined) {
    element.textContent = String(text);
  }
  return element;
}

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(parent, child) {
  parent.appendChild(child);
  return child;
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function createFragment(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content;
}
