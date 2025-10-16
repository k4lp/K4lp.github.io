/*!
 * API Manager
 *
 * Handles all interactions with external supplier APIs (Digikey, Mouser, etc.).
 * Manages API credentials, state, and data fetching.
 */
class ApiManager {
    constructor(storage) {
        if (!storage) {
            throw new Error("ApiManager requires a StorageManager instance.");
        }
        this.storage = storage;

        // Load credentials from storage on initialization
        this.credentials = {
            digikey: this.storage.get('api_credentials_digikey') || {},
            mouser: this.storage.get('api_credentials_mouser') || {}
        };

        // Initialize API statuses
        this.statuses = {
            digikey: 'inactive', // inactive, active, error, connecting
            mouser: 'inactive'
        };
    }

    /**
     * Updates the credentials for a specific API and saves them to storage.
     * @param {string} apiKey - The key for the API (e.g., 'digikey').
     * @param {object} credentials - The credentials object to save.
     */
    updateCredentials(apiKey, credentials) {
        console.log(`Updating credentials for ${apiKey}...`);
        this.credentials[apiKey] = credentials;
        this.storage.set(`api_credentials_${apiKey}`, credentials);
        this.validateCredentials(apiKey);
    }

    /**
     * Validates credentials for a specific API.
     * (Placeholder for future implementation)
     * @param {string} apiKey - The key for the API to validate.
     */
    validateCredentials(apiKey) {
        console.log(`[Placeholder] Validating credentials for ${apiKey}...`);
        // In the future, this will make a test API call.
        // For now, we'll just log the current credentials.
        if (this.credentials[apiKey] && Object.keys(this.credentials[apiKey]).length > 0) {
            console.log(`Credentials for ${apiKey} are present.`);
            this.statuses[apiKey] = 'active'; // Placeholder status
        } else {
            console.log(`No credentials found for ${apiKey}.`);
            this.statuses[apiKey] = 'inactive';
        }
    }

    /**
     * Fetches part data from the appropriate supplier.
     * (Placeholder for future implementation)
     * @param {string} partNumber - The manufacturer part number to search for.
     * @param {string} supplier - The supplier to query ('digikey', 'mouser').
     */
    getPartData(partNumber, supplier) {
        console.log(`[Placeholder] Fetching data for part "${partNumber}" from ${supplier}...`);
        switch (supplier) {
            case 'digikey':
                return this.queryDigikey(partNumber);
            case 'mouser':
                return this.queryMouser(partNumber);
            default:
                console.error(`Unknown supplier: ${supplier}`);
                return null;
        }
    }

    /**
     * Placeholder for Digikey-specific API calls.
     */
    queryDigikey(partNumber) {
        console.log(`[Placeholder] Querying Digikey API for "${partNumber}". Not yet implemented.`);
        return { supplier: 'Digikey', partNumber, stock: 0, price: 0 };
    }

    /**
     * Placeholder for Mouser-specific API calls.
     */
    queryMouser(partNumber) {
        console.log(`[Placeholder] Querying Mouser API for "${partNumber}". Not yet implemented.`);
        return { supplier: 'Mouser', partNumber, stock: 0, price: 0 };
    }
}

// Create a single, global instance for the application to use.
// It depends on the global 'storage' instance.
document.addEventListener('DOMContentLoaded', () => {
    if (window.storage) {
        const apiManager = new ApiManager(window.storage);
        window.apiManager = apiManager;
    } else {
        console.error("StorageManager not found. ApiManager could not be initialized.");
    }
});