/**
 * Example: Custom Validator Implementation
 *
 * This demonstrates how to add a new feature to GDRS using the Registry pattern.
 * No need to modify core code - just implement the interface and register!
 */

import { Registry, ExtensionPoints } from '../core/extension-points.js';
import { validateImplementation, Interfaces } from '../core/interfaces.js';

/**
 * API Key Validator
 * Validates Google Gemini API keys (39 characters, alphanumeric + underscore/dash)
 */
class GeminiAPIKeyValidator {
  constructor() {
    this.errors = [];
  }

  /**
   * Validate an API key
   * @param {string} value - API key to validate
   * @returns {boolean} True if valid
   */
  validate(value) {
    this.errors = [];

    if (!value || typeof value !== 'string') {
      this.errors.push('API key is required');
      return false;
    }

    // Gemini API keys are 39 characters
    if (value.length !== 39) {
      this.errors.push(`API key must be exactly 39 characters (got ${value.length})`);
      return false;
    }

    // Only alphanumeric, underscore, and dash
    const validPattern = /^[A-Za-z0-9_-]+$/;
    if (!validPattern.test(value)) {
      this.errors.push('API key contains invalid characters (only A-Z, a-z, 0-9, _, - allowed)');
      return false;
    }

    return true;
  }

  /**
   * Get validation error messages
   * @returns {string[]} Array of error messages
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get validation schema
   * @returns {Object} Schema object
   */
  getSchema() {
    return {
      type: 'string',
      length: 39,
      pattern: '^[A-Za-z0-9_-]+$',
      description: 'Google Gemini API Key'
    };
  }
}

/**
 * Content Length Validator
 * Validates that content is within acceptable size limits
 */
class ContentLengthValidator {
  constructor(options = {}) {
    this.minLength = options.minLength || 0;
    this.maxLength = options.maxLength || 1000000;
    this.errors = [];
  }

  validate(value) {
    this.errors = [];

    if (value === null || value === undefined) {
      if (this.minLength > 0) {
        this.errors.push('Content is required');
        return false;
      }
      return true;
    }

    const length = String(value).length;

    if (length < this.minLength) {
      this.errors.push(`Content too short (minimum ${this.minLength} characters, got ${length})`);
      return false;
    }

    if (length > this.maxLength) {
      this.errors.push(`Content too long (maximum ${this.maxLength} characters, got ${length})`);
      return false;
    }

    return true;
  }

  getErrors() {
    return [...this.errors];
  }

  getSchema() {
    return {
      type: 'string',
      minLength: this.minLength,
      maxLength: this.maxLength,
      description: 'Content with length constraints'
    };
  }
}

/**
 * Email Validator
 * Simple email format validation
 */
class EmailValidator {
  constructor() {
    this.errors = [];
  }

  validate(value) {
    this.errors = [];

    if (!value || typeof value !== 'string') {
      this.errors.push('Email is required');
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      this.errors.push('Invalid email format');
      return false;
    }

    return true;
  }

  getErrors() {
    return [...this.errors];
  }

  getSchema() {
    return {
      type: 'string',
      format: 'email',
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      description: 'Email address'
    };
  }
}

/**
 * Register all validators with the Registry
 */
export function registerValidators() {
  console.log('%c[Example] Registering custom validators...', 'color: #00aaff; font-weight: bold;');

  // Register API key validator
  Registry.register(
    ExtensionPoints.VALIDATORS,
    'gemini-api-key',
    GeminiAPIKeyValidator
  );

  // Register content length validator
  Registry.register(
    ExtensionPoints.VALIDATORS,
    'content-length',
    ContentLengthValidator
  );

  // Register email validator
  Registry.register(
    ExtensionPoints.VALIDATORS,
    'email',
    EmailValidator
  );

  console.log('%c✅ [Example] 3 validators registered!', 'color: #00ff00;');
  console.log('%c   - gemini-api-key: Validate Gemini API keys', 'color: #666;');
  console.log('%c   - content-length: Validate content length', 'color: #666;');
  console.log('%c   - email: Validate email format', 'color: #666;');
}

/**
 * Example usage of registered validators
 */
export function demonstrateValidators() {
  console.group('%c[Example] Testing Validators', 'color: #ff6600; font-weight: bold;');

  // Test API Key Validator
  const APIKeyValidator = Registry.get(ExtensionPoints.VALIDATORS, 'gemini-api-key');
  if (APIKeyValidator) {
    const validator = new APIKeyValidator();

    console.log('\n🔑 Testing API Key Validator:');

    // Valid key (39 chars)
    const validKey = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
    console.log(`  Valid key (${validKey.length} chars):`, validator.validate(validKey));

    // Invalid key (too short)
    console.log('  Invalid key (too short):', validator.validate('ABC123'));
    console.log('  Errors:', validator.getErrors());

    // Invalid key (bad characters)
    console.log('  Invalid key (has @):', validator.validate('AIzaSy@BCDEFGHIJKLMNOPQRSTUVWXYZabcd'));
    console.log('  Errors:', validator.getErrors());
  }

  // Test Content Length Validator
  const ContentValidator = Registry.get(ExtensionPoints.VALIDATORS, 'content-length');
  if (ContentValidator) {
    const validator = new ContentValidator({ minLength: 10, maxLength: 100 });

    console.log('\n📏 Testing Content Length Validator:');

    // Valid content
    console.log('  Valid content (50 chars):', validator.validate('x'.repeat(50)));

    // Too short
    console.log('  Too short (5 chars):', validator.validate('hello'));
    console.log('  Errors:', validator.getErrors());

    // Too long
    console.log('  Too long (150 chars):', validator.validate('x'.repeat(150)));
    console.log('  Errors:', validator.getErrors());
  }

  // Test Email Validator
  const EmailValidatorClass = Registry.get(ExtensionPoints.VALIDATORS, 'email');
  if (EmailValidatorClass) {
    const validator = new EmailValidatorClass();

    console.log('\n📧 Testing Email Validator:');

    // Valid email
    console.log('  Valid email:', validator.validate('user@example.com'));

    // Invalid emails
    console.log('  Invalid (no @):', validator.validate('userexample.com'));
    console.log('  Errors:', validator.getErrors());

    console.log('  Invalid (no domain):', validator.validate('user@'));
    console.log('  Errors:', validator.getErrors());
  }

  console.groupEnd();
}

// Auto-register when this module is imported
registerValidators();

// Export validators for direct use if needed
export {
  GeminiAPIKeyValidator,
  ContentLengthValidator,
  EmailValidator
};
