console.log('app.js script started');
const keyring = new KeyRing();
console.log('KeyRing instantiated:', keyring);
const memory = new MemoryStore();
console.log('MemoryStore instantiated:', memory);

// Wrap everything in DOMContentLoaded to ensure DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');

  // Get all DOM element references
  const els = {
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    cancelSettings: document.getElementById('cancel-settings'),
    saveSettings: document.getElementById('save-settings'),
    apiKeyInput: document.getElementById('api-key'),
    modelSelect: document.getElementById('model'),
    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    clearButton: document.getElementById('clear-chat'),
    newChatButton: document.getElementById('new-chat')
  };

  // Verify all elements exist
  console.log('Element references:', Object.keys(els).map(key => ({
    key,
    exists: els[key] !== null
  })));

  // Check if any critical elements are missing
  const missingElements = Object.keys(els).filter(key => els[key] === null);
  if (missingElements.length > 0) {
    console.error('Missing elements:', missingElements);
    alert('Critical UI elements are missing. Please check the HTML structure.');
    return;
  }

  // Settings Modal Handlers
  if (els.openSettings) {
    els.openSettings.addEventListener('click', function(e) {
      console.log('--- OPEN SETTINGS CLICKED ---');
      e.preventDefault();

      // Load saved API key and model
      try {
        console.log('Accessing keyring in openSettings:', keyring);
        const savedKey = keyring.get('gemini-api-key');
        const savedModel = localStorage.getItem('gemini-model') || 'gemini-2.0-flash';

        if (savedKey) {
          els.apiKeyInput.value = savedKey;
        }
        els.modelSelect.value = savedModel;
      } catch (error) {
        console.error('Error loading settings:', error);
      }

      // Open modal
      els.settings.classList.add('open');
      console.log('Settings modal opened.');
    });
  }

  if (els.cancelSettings) {
    els.cancelSettings.addEventListener('click', function(e) {
      console.log('--- CANCEL SETTINGS CLICKED ---');
      e.preventDefault();
      els.settings.classList.remove('open');
      console.log('Settings modal closed.');
    });
  }

  if (els.saveSettings) {
    els.saveSettings.addEventListener('click', function(e) {
      console.log('--- SAVE SETTINGS CLICKED ---');
      e.preventDefault();

      const apiKey = els.apiKeyInput.value.trim();
      const model = els.modelSelect.value;

      if (!apiKey) {
        alert('Please enter an API key');
        return;
      }

      try {
        // Save API key and model
        keyring.set('gemini-api-key', apiKey);
        localStorage.setItem('gemini-model', model);

        // Close modal
        els.settings.classList.remove('open');

        console.log('Settings saved:', { model });
        alert('Settings saved successfully!');
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings: ' + error.message);
      }
    });
  }

  // Send Message Handler
  if (els.sendButton) {
    els.sendButton.addEventListener('click', function(e) {
      console.log('--- SEND BUTTON CLICKED ---');
      e.preventDefault();
      sendMessage();
    });
  }

  // Enter key handler for input
  if (els.userInput) {
    els.userInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Clear Chat Handler
  if (els.clearButton) {
    els.clearButton.addEventListener('click', function(e) {
      console.log('--- CLEAR CHAT CLICKED ---');
      e.preventDefault();

      if (confirm('Are you sure you want to clear the chat history?')) {
        els.chatMessages.innerHTML = '';
        // Clear any chat history from memory/storage if applicable
        if (typeof memory !== 'undefined' && memory.clear) {
          memory.clear();
        }
        console.log('Chat cleared.');
      }
    });
  }

  // New Chat Handler
  if (els.newChatButton) {
    els.newChatButton.addEventListener('click', function(e) {
      console.log('--- NEW CHAT CLICKED ---');
      e.preventDefault();

      if (confirm('Start a new chat? Current conversation will be cleared.')) {
        els.chatMessages.innerHTML = '';
        els.userInput.value = '';
        // Reset conversation state if applicable
        if (typeof memory !== 'undefined' && memory.reset) {
          memory.reset();
        }
        console.log('New chat started.');
      }
    });
  }

  // Function to send message
  async function sendMessage() {
    const message = els.userInput.value.trim();

    if (!message) {
      console.log('Empty message, not sending');
      return;
    }

    console.log('Sending message:', message);

    // Check if API key is set
    const apiKey = typeof keyring !== 'undefined' ? keyring.get('gemini-api-key') : null;
    if (!apiKey) {
      alert('Please set your API key in settings first');
      els.openSettings.click();
      return;
    }

    // Add user message to chat
    addMessageToChat('user', message);

    // Clear input
    els.userInput.value = '';

    // Disable send button while processing
    els.sendButton.disabled = true;

    try {
      // Get selected model
      const model = localStorage.getItem('gemini-model') || 'gemini-2.0-flash';

      // Send to Gemini API (assuming gemini.js provides this functionality)
      if (typeof sendToGemini === 'function') {
        const response = await sendToGemini(message, model, apiKey);
        addMessageToChat('assistant', response);
      } else {
        console.error('sendToGemini function not found');
        addMessageToChat('assistant', 'Error: Chat functionality not properly initialized');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessageToChat('assistant', 'Error: ' + error.message);
    } finally {
      // Re-enable send button
      els.sendButton.disabled = false;
    }
  }

  // Function to add message to chat UI
  function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    els.chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  // Initialize the app
  console.log('App initialized successfully');

  // Load any saved state
  try {
    const savedModel = localStorage.getItem('gemini-model');
    if (savedModel) {
      console.log('Loaded saved model:', savedModel);
    }
  } catch (error) {
    console.error('Error loading saved state:', error);
  }
});


// Test script to verify Gemini model names
// Run this in your browser console or as a separate test file

const GEMINI_MODELS = {
  // Gemini 2.0 series (Latest)
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    description: 'Latest fast model with multimodal capabilities',
    recommended: true
  },
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Experimental version with latest features'
  },

  // Gemini 1.5 series
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    description: 'Fast and efficient model'
  },
  'gemini-1.5-flash-8b': {
    name: 'Gemini 1.5 Flash 8B',
    description: 'Smaller, faster variant'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    description: 'More capable model with larger context'
  },

  // Legacy aliases (may still work)
  'gemini-flash-latest': {
    name: 'Gemini Flash Latest',
    description: 'Alias for latest flash model',
    alias: true
  },
  'gemini-pro-latest': {
    name: 'Gemini Pro Latest',
    description: 'Alias for latest pro model',
    alias: true
  }
};

// Function to test a model name with the API
async function testModelName(modelName, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, respond with just "OK" to confirm you are working.'
          }]
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✓ ${modelName}: WORKS`);
      return { success: true, modelName, data };
    } else {
      const error = await response.text();
      console.log(`✗ ${modelName}: FAILED - ${response.status}`);
      return { success: false, modelName, error, status: response.status };
    }
  } catch (error) {
    console.log(`✗ ${modelName}: ERROR - ${error.message}`);
    return { success: false, modelName, error: error.message };
  }
}

// Function to list available models
async function listAvailableModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log('\n=== Available Models ===');
      data.models.forEach(model => {
        console.log(`- ${model.name}`);
        if (model.displayName) console.log(`  Display: ${model.displayName}`);
        if (model.description) console.log(`  Description: ${model.description}`);
      });
      return data.models;
    } else {
      console.error('Failed to list models:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error listing models:', error);
    return null;
  }
}

// Main test function
async function testAllModels(apiKey) {
  if (!apiKey) {
    console.error('Please provide an API key');
    return;
  }

  console.log('Testing Gemini model names...\n');

  // First, list all available models
  await listAvailableModels(apiKey);

  console.log('\n=== Testing Model Names ===');

  // Test each model
  const results = [];
  for (const [modelId, modelInfo] of Object.entries(GEMINI_MODELS)) {
    const result = await testModelName(modelId, apiKey);
    results.push({ ...result, info: modelInfo });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n=== Summary ===');
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Working models: ${working.length}`);
  working.forEach(r => console.log(`  ✓ ${r.modelName}`));

  console.log(`\nFailed models: ${failed.length}`);
  failed.forEach(r => console.log(`  ✗ ${r.modelName}`));

  // Recommended model
  const recommended = working.find(r => r.info.recommended);
  if (recommended) {
    console.log(`\nRecommended: ${recommended.modelName}`);
  }

  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testGeminiModels = testAllModels;
  window.listGeminiModels = listAvailableModels;
  window.GEMINI_MODELS = GEMINI_MODELS;

  console.log('Gemini Model Tester loaded!');
  console.log('Usage:');
  console.log('  testGeminiModels("YOUR_API_KEY") - Test all models');
  console.log('  listGeminiModels("YOUR_API_KEY") - List available models');
}

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAllModels,
    listAvailableModels,
    GEMINI_MODELS
  };
}