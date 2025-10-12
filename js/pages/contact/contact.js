/**
 * Contact page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeContactPage();
});

function initializeContactPage() {
    setupContactForm();
    loadProjectInfo();
}

function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', handleContactSubmit);
}

function handleContactSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const message = formData.get('message');

    if (!Utils.validateEmail(email)) {
        Utils.showNotification('Please enter a valid email address', 'error');
        return;
    }

    if (!message.trim()) {
        Utils.showNotification('Please enter a message', 'error');
        return;
    }

    // For now, just show a success message
    Utils.showNotification('Thank you for your message! This is a demo form.', 'success');
    event.target.reset();
}

function loadProjectInfo() {
    const currentYear = new Date().getFullYear();
    const yearElement = document.getElementById('current-year');
    
    if (yearElement) {
        yearElement.textContent = currentYear;
    }
}
