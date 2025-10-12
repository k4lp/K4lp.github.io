/**
 * Common storage utilities for API keys and application data
 * All data is stored permanently in localStorage
 */

class StorageManager {
    constructor() {
        this.prefix = 'k4lp_';
    }

    // API Keys Management
    setDigikeyApiKey(clientId, clientSecret) {
        localStorage.setItem(this.prefix + 'digikey_client_id', clientId);
        localStorage.setItem(this.prefix + 'digikey_client_secret', clientSecret);
    }

    getDigikeyApiKey() {
        return {
            clientId: localStorage.getItem(this.prefix + 'digikey_client_id'),
            clientSecret: localStorage.getItem(this.prefix + 'digikey_client_secret')
        };
    }

    setMouserApiKey(apiKey) {
        localStorage.setItem(this.prefix + 'mouser_api_key', apiKey);
    }

    getMouserApiKey() {
        return localStorage.getItem(this.prefix + 'mouser_api_key');
    }

    // API Status Management
    setApiStatus(provider, status) {
        localStorage.setItem(this.prefix + provider + '_status', status);
    }

    getApiStatus(provider) {
        return localStorage.getItem(this.prefix + provider + '_status') || 'Inactive';
    }

    // Generic storage methods
    set(key, value) {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
    }

    get(key) {
        const value = localStorage.getItem(this.prefix + key);
        return value ? JSON.parse(value) : null;
    }

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }

    clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
}

const storage = new StorageManager();
