/**
 * Google Maps API Configuration
 * 
 * This file contains the configuration for the Google Maps API.
 * Keep this file separate for security and maintainability.
 * 
 * WARNING: In a production environment, API keys should be managed server-side
 * and not exposed in client-side code.
 */

// Your Google Maps API key with Places API enabled
const GOOGLE_MAPS_API_KEY = 'AIzaSyCancy_vwbDbYZavxDjtpL7NW4lYl8Tkmk';

// Export for use in other scripts
if (typeof module !== 'undefined') {
    module.exports = { GOOGLE_MAPS_API_KEY };
}