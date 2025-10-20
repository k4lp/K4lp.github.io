import { mountLayout } from './layout.js';
import { initialiseSettingsPanel } from './settingsPanel.js';

const initialiseNavigation = () => {
  const links = document.querySelectorAll('.navbar__links a');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.location.pathname.endsWith('index.html')) return;
      if (!link.hash) return;
      const target = link.hash;
      window.location.href = `index.html${target}`;
    });
  });
};

export const bootstrapShell = () => {
  mountLayout();
  initialiseNavigation();
  initialiseSettingsPanel();
};
