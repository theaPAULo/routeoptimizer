/**
 * Environment Configuration
 * 
 * This script handles environment variables for the Route Optimizer.
 * It ensures that API keys are properly loaded from Netlify's environment.
 */

(function() {
    // This function will run when the document loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Loading environment configuration...');
        
        // Check if we're running on Netlify
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                        document.referrer.includes('netlify.app');
        
        // Replace the API key placeholder in the page
        replaceApiKeyPlaceholder();
        
        // Log environment status (for debugging)
        console.log(`Environment: ${isNetlify ? 'Netlify' : 'Local/Other'}`);
    });
    
    /**
     * Replace the GOOGLE_MAPS_API_KEY placeholder with the actual API key
     */
    function replaceApiKeyPlaceholder() {
        // Look for all script tags in the document
        const scripts = document.getElementsByTagName('script');
        
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            
            // Skip if this isn't the script containing our API key
            if (!script.textContent || !script.textContent.includes('googleMapsApiKey')) {
                continue;
            }
            
            // Get the environment variable value from Netlify
            // We do this check in multiple ways to maximize compatibility
            let apiKey = '';
            
            // Try window.ENV approach (used by Netlify)
            if (typeof window.ENV !== 'undefined' && window.ENV.GOOGLE_MAPS_API_KEY) {
                apiKey = window.ENV.GOOGLE_MAPS_API_KEY;
            }
            // Try window.process.env approach
            else if (typeof window.process !== 'undefined' && 
                    window.process.env && 
                    window.process.env.GOOGLE_MAPS_API_KEY) {
                apiKey = window.process.env.GOOGLE_MAPS_API_KEY;
            }
            // Try direct YOUR_API_KEY variable that might be set elsewhere
            else if (typeof YOUR_API_KEY !== 'undefined') {
                apiKey = YOUR_API_KEY;
            }
            // Try data-key attributes
            else {
                const keyElements = document.querySelectorAll('[data-api-key]');
                if (keyElements.length > 0) {
                    apiKey = keyElements[0].getAttribute('data-api-key');
                }
            }
            
            // If we found an API key, replace the placeholder
            if (apiKey && apiKey !== 'GOOGLE_MAPS_API_KEY' && apiKey !== 'YOUR_API_KEY') {
                script.textContent = script.textContent.replace(
                    /const\s+googleMapsApiKey\s*=\s*['"]GOOGLE_MAPS_API_KEY['"];?/,
                    `const googleMapsApiKey = '${apiKey}';`
                );
                
                console.log('API key placeholder replaced successfully');
                return true;
            } else {
                console.warn('Could not find valid API key in environment variables');
            }
        }
        
        // Create a fallback for development environments
        // This allows you to put your key directly in the page for testing
        // DO NOT use this in production - only for development!
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Check if there's a data attribute in the body with the key
            const body = document.body;
            if (!body.hasAttribute('data-api-key')) {
                console.warn('API key not found for local development. Setting a data attribute to help with debugging.');
                body.setAttribute('data-api-key', 'YOUR_API_KEY_HERE');
            }
        }
        
        return false;
    }
})();