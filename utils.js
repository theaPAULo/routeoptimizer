/**
 * DriveLess Utility Functions
 * Contains shared utility functions used throughout the application
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} input - User provided input
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (!input) return '';
    return String(input).replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Extracts a business name from an address string
 * @param {string} address - The address string
 * @returns {string} - The extracted business name or empty string
 */
function extractBusinessName(address) {
    if (!address || !address.includes(',')) {
        return '';
    }
    
    // Get the part before the first comma
    const firstPart = address.split(',')[0].trim();
    
    // Check if it looks like a business name (not just a street address)
    // Street addresses usually start with numbers
    const isLikelyBusiness = !/^\d+\s/.test(firstPart);
    
    return isLikelyBusiness ? firstPart : '';
}

/**
 * Formats a distance in meters to a readable string in miles
 * @param {number} meters - Distance in meters
 * @returns {string} - Formatted distance string
 */
function formatDistance(meters) {
    const miles = (meters / 1609.34).toFixed(1);
    return `${miles} miles`;
}

/**
 * Formats a duration in seconds to a readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);
    
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} hr ${mins} min`;
    } else {
        return `${minutes} min`;
    }
}

/**
 * Tests if the browser has localStorage available
 * @returns {boolean} - Whether localStorage is available
 */
function isLocalStorageAvailable() {
    try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Safely stores a value in localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {boolean} - Whether the operation succeeded
 */
function safeLocalStorageSet(key, value) {
    if (!isLocalStorageAvailable()) return false;
    
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (e) {
        console.error('Error storing data in localStorage:', e);
        return false;
    }
}

/**
 * Safely retrieves a value from localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key not found or error
 * @returns {any} - Retrieved value (JSON parsed) or defaultValue
 */
function safeLocalStorageGet(key, defaultValue = null) {
    if (!isLocalStorageAvailable()) return defaultValue;
    
    try {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return JSON.parse(value);
    } catch (e) {
        console.error('Error retrieving data from localStorage:', e);
        return defaultValue;
    }
}

// Export the utilities if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitizeInput,
        extractBusinessName,
        formatDistance,
        formatDuration,
        isLocalStorageAvailable,
        safeLocalStorageSet,
        safeLocalStorageGet
    };
}