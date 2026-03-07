/**
 * app.js
 *
 * The central controller for the Kalp | Developer Landing Page.
 * It waits for the DOM to be ready before instantiating and initializing
 * the isolated logic modules, adhering to strict modular architecture.
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Initialize the Staggered Entrance Animation
  // Targets all elements with the 'animate-target' class and staggers them by 200ms.
  if (window.EntranceAnimator) {
    const animator = new window.EntranceAnimator('.animate-target', 200);
    animator.init();
  } else {
    console.warn('EntranceAnimator module not found.');
  }

  // 2. Initialize the Interactive Magnetic Button Effect
  // Targets the main redirect CTA by its ID.
  if (window.MagneticButton) {
    const redirectBtnInteractive = new window.MagneticButton('#redirect-btn');
    redirectBtnInteractive.init();
  } else {
    console.warn('MagneticButton module not found.');
  }

});
