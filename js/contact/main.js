import { bootstrapShell } from '../common/app.js';

const injectTimeline = () => {
  const canvasSection = document.querySelector('.grid');
  if (!canvasSection) return;

  const sessionCard = document.createElement('article');
  sessionCard.className = 'card card--surface';
  sessionCard.innerHTML = `
    <h3 class="card__title">Session Blueprint</h3>
    <p class="card__description">
      Modular sprint schedule for onboarding manufacturing teams and enabling rapid prototype runs.
    </p>
    <div class="feature-list feature-list--column">
      <div class="feature-item">
        <span class="feature-item__title">Week 1</span>
        <span class="feature-item__description">Credential setup, sandbox BOM import, DigiKey API handshake.</span>
      </div>
      <div class="feature-item">
        <span class="feature-item__title">Week 2</span>
        <span class="feature-item__description">Excel column mapping rehearsal with production data subsets.</span>
      </div>
      <div class="feature-item">
        <span class="feature-item__title">Week 3</span>
        <span class="feature-item__description">Scanner calibration, barcode palette configuration, QA overlay trials.</span>
      </div>
    </div>
  `;

  canvasSection.appendChild(sessionCard);
};

const onReady = () => {
  bootstrapShell();
  injectTimeline();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
