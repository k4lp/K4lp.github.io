/**
 * animations.js
 *
 * Responsible for handling complex, staggered visual orchestrations on the page.
 * Keeps animation logic decoupled from the core application state.
 */

class EntranceAnimator {
  /**
   * Initializes the animator.
   * @param {string} selector - The CSS selector for elements to animate.
   * @param {number} staggerMs - The delay increment in milliseconds between each element.
   */
  constructor(selector, staggerMs = 150) {
    this.targets = document.querySelectorAll(selector);
    this.staggerMs = staggerMs;
  }

  /**
   * Triggers the animation sequence by applying computed delays and state classes.
   * Uses requestAnimationFrame to ensure the browser has painted the initial state
   * before applying the visible class, guaranteeing the transition fires.
   */
  init() {
    if (this.targets.length === 0) return;

    // Set transition delays based on index to create a staggered waterfall effect
    this.targets.forEach((el, index) => {
      // Calculate delay, adding a small base delay for a premium feel
      const delay = 100 + (index * this.staggerMs);
      el.style.transitionDelay = `${delay}ms`;
    });

    // Wait for the next frame to apply the class that triggers the CSS transition
    requestAnimationFrame(() => {
      // We wrap the class addition in a slight timeout to ensure CSS parsing is done
      setTimeout(() => {
        this.targets.forEach(el => el.classList.add('is-visible'));
      }, 50);
    });
  }
}

// Export the class to be used by the main application controller
window.EntranceAnimator = EntranceAnimator;
