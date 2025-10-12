/**
 * Common API utilities for Digikey and Mouser services
 */

class ApiManager {
    constructor() {
        this.digikeyBaseUrl = 'https://api.digikey.com';
        this.mouserBaseUrl = 'https://api.mouser.com';
        this.storage = new StorageManager();
    }

    async testDigikeyConnection() {
        try {
            this.storage.setApiStatus('digikey', 'Connecting');
            const credentials = this.storage.getDigikeyApiKey();
            
            if (!credentials.clientId || !credentials.clientSecret) {
                this.storage.setApiStatus('digikey', 'Error');
                return false;
            }

            // Test connection logic will be implemented
            this.storage.setApiStatus('digikey', 'Active');
            return true;
        } catch (error) {
            this.storage.setApiStatus('digikey', 'Error');
            return false;
        }
    }

    async testMouserConnection() {
        try {
            this.storage.setApiStatus('mouser', 'Connecting');
            const apiKey = this.storage.getMouserApiKey();
            
            if (!apiKey) {
                this.storage.setApiStatus('mouser', 'Error');
                return false;
            }

            // Test connection logic will be implemented
            this.storage.setApiStatus('mouser', 'Active');
            return true;
        } catch (error) {
            this.storage.setApiStatus('mouser', 'Error');
            return false;
        }
    }

    getApiStatuses() {
        return {
            digikey: this.storage.getApiStatus('digikey'),
            mouser: this.storage.getApiStatus('mouser')
        };
    }
}

const apiManager = new ApiManager();
