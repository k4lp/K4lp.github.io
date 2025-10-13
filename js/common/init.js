import { renderNavbar } from './navbar.js';
import { renderFooter } from './footer.js';
import { openSettings, ensureSettingsOverlay } from './settings.js';

export function bootstrapCommonChrome() {
  const { settingsBtn } = renderNavbar(document.body);
  renderFooter(document.body);
  ensureSettingsOverlay(document.body);

  settingsBtn.addEventListener('click', () => openSettings());
}
