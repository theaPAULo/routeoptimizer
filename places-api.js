/**
 * Google Places API Integration - Direct Implementation
 * 
 * This file directly integrates Google Places API autocomplete
 * for business, landmark, and address search capabilities.
 */

// Create a status indicator to show when the API is loaded
function createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'places-api-status';
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
    `;
    indicator.textContent = 'Places API: Loading...';
    document.body.appendChild(indicator);
    return indicator;
}

// Update status indicator
function updateStatus(message, isSuccess = true) {
    const indicator = document.getElementById('places-api-status');
    if (indicator) {
        indicator.textContent = `Places API: ${message}`;
        indicator.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da';
        indicator.style.color = isSuccess ? '#155724' : '#721c24';
    }
}

// Log messages to console with clear prefix
function logMessage(message, isError = false) {
    const method = isError ? console.error : console.log;
    method(`[Places API] ${message}`);
}

// Initialize Google Places Autocomplete on a specific input
function initAutocompleteOnInput(input) {
    if (!input || !input.id) return;
    
    // Skip if already initialized
    if (input.dataset.placesInitialized === 'true') {
        logMessage(`Autocomplete already initialized for ${input.id}`);
        return;
    }
    
    try {
        // Create autocomplete with options specifically for business search
        const autocomplete = new google.maps.places.Autocomplete(input, {
            // This combination enables both business and address search
            types: [], // Empty array allows ALL types (addresses, establishments, regions)
            fields: ['place_id', 'name', 'formatted_address', 'geometry']
        });
        
        // Mark this input as initialized
        input.dataset.placesInitialized = 'true';
        
        // Add places changed listener
        autocomplete.addListener('place_changed', function() {
            const place = autocomplete.getPlace();
            
            // Log the selected place for debugging
            logMessage(`Place selected: ${place.name || 'Unknown'}`);
            
            // If it's a business, format the display to show business name + address
            if (place.name && place.formatted_address && 
                !place.formatted_address.includes(place.name)) {
                input.value = `${place.name}, ${place.formatted_address}`;
            }
        });
        
        // Prevent form submission on Enter key
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && input === document.activeElement) {
                e.preventDefault();
            }
        });
        
        logMessage(`Autocomplete initialized for ${input.id}`);
    } catch (error) {
        logMessage(`Error initializing autocomplete for ${input.id}: ${error.message}`, true);
        input.dataset.placesInitialized = 'error';
    }
}

// Initialize autocomplete on all address inputs
function initAllAutocompletes() {
    // Static inputs (start and end locations)
    const startInput = document.getElementById('start-location');
    const endInput = document.getElementById('end-location');
    
    if (startInput) initAutocompleteOnInput(startInput);
    if (endInput) initAutocompleteOnInput(endInput);
    
    // Dynamic stop inputs
    const stopInputs = document.querySelectorAll('#stops-container input[type="text"]');
    stopInputs.forEach(input => initAutocompleteOnInput(input));
    
    // Setup observer for dynamically added stops
    setupDynamicInputsObserver();
}

// Watch for new inputs being added
function setupDynamicInputsObserver() {
    const stopsContainer = document.getElementById('stops-container');
    if (!stopsContainer) {
        logMessage('Stops container not found', true);
        return;
    }
    
    // Create an observer to watch for new inputs
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // If this is an input or contains inputs
                        const inputs = node.querySelectorAll ? 
                            node.querySelectorAll('input[type="text"]') : [];
                        
                        if (node.tagName === 'INPUT' && node.type === 'text') {
                            initAutocompleteOnInput(node);
                        }
                        
                        inputs.forEach(input => initAutocompleteOnInput(input));
                    }
                });
            }
        });
    });
    
    // Start observing
    observer.observe(stopsContainer, { 
        childList: true,
        subtree: true
    });
    
    logMessage('Dynamic inputs observer setup complete');
}

// Load Google Maps API script
function loadGoogleMapsAPI() {
    // Avoid loading twice
    if (window.googleMapsLoading || 
        (window.google && window.google.maps && window.google.maps.places)) {
        logMessage('Maps API already loading or loaded');
        return;
    }
    
    window.googleMapsLoading = true;
    
    // Create status indicator
    createStatusIndicator();
    
    // Set up the callback function
    window.initPlacesAPI = function() {
        logMessage('Google Maps Places API loaded');
        updateStatus('Ready');
        initAllAutocompletes();
    };
    
    // Create script element
    const script = document.createElement('script');
    // Replace YOUR_API_KEY with your actual API key
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCancy_vwbDbYZavxDjtpL7NW4lYl8Tkmk&libraries=places&callback=initPlacesAPI`;
    script.async = true;
    script.defer = true;
    
    // Handle errors
    script.onerror = function() {
        logMessage('Failed to load Maps API script', true);
        updateStatus('Failed to load', false);
        window.googleMapsLoading = false;
    };
    
    // Add to document
    document.head.appendChild(script);
    logMessage('Maps API script added to page');
}

// Initialize everything when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGoogleMapsAPI);
} else {
    loadGoogleMapsAPI();
}

// Add periodic check to ensure all inputs have autocomplete
setInterval(function() {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    
    const allInputs = document.querySelectorAll('input[id^="start-"], input[id^="end-"], input[id^="stop-"]');
    allInputs.forEach(input => {
        if (!input.dataset.placesInitialized) {
            logMessage(`Found uninitialized input: ${input.id}`);
            initAutocompleteOnInput(input);
        }
    });
}, 2000);
