/**
 * interactive.js
 *
 * Handles granular, event-driven interactions for specific UI components,
 * such as the subtle magnetic hover effect on the primary CTA button.
 */

class MagneticButton {
  /**
   * @param {string} selector - The ID or class selector for the button.
   */
  constructor(selector) {
    this.button = document.querySelector(selector);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
  }

  /**
   * Binds the necessary mouse events if the element exists.
   */
  init() {
    if (!this.button) return;

    // Only apply complex hover effects on devices that support hover (desktops)
    // to preserve battery and performance on mobile.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.button.addEventListener('mousemove', this.boundOnMouseMove);
      this.button.addEventListener('mouseleave', this.boundOnMouseLeave);
    }
  }

  /**
   * Calculates mouse position relative to the button center and translates it.
   * @param {MouseEvent} e
   */
  onMouseMove(e) {
    const rect = this.button.getBoundingClientRect();

    // Calculate the distance of the mouse from the center of the button
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Apply a dampened translation to create a "magnetic" heavy feel
    // The divisor dictates how strong the pull is. Higher = weaker pull.
    const moveX = x / 6;
    const moveY = y / 6;

    // Override the CSS transition to follow the mouse immediately
    this.button.style.transition = 'transform 0.1s ease-out, background 0.4s ease';
    this.button.style.transform = `translate(${moveX}px, ${moveY}px)`;
  }

  /**
   * Snaps the button back to its origin when the mouse leaves.
   */
  onMouseLeave() {
    // Restore the smooth CSS transition and reset the transform
    this.button.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this.button.style.transform = 'translateY(0)';
  }
}

window.MagneticButton = MagneticButton;
