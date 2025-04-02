/**
 * Google Maps Places Autocomplete Integration
 * 
 * This script adds Google Maps Places Autocomplete functionality to input fields
 * to support searching for addresses, businesses, and landmarks.
 */

// Store autocomplete instances to prevent duplication
const autocompleteInstances = {};

/**
 * Initialize Google Maps Places API when the API is loaded
 * This function will be called as the callback when the Google Maps API loads
 */
function initGoogleMapsPlaces() {
    console.log('Google Maps Places API initialized');
    
    // Configure autocomplete for all address input fields
    setupAutocompleteForInput('start-location');
    setupAutocompleteForInput('end-location');
    
    // Set up autocomplete for any existing stop inputs
    const existingStopInputs = document.querySelectorAll('#stops-container input[type="text"]');
    existingStopInputs.forEach(input => {
        if (input.id && !autocompleteInstances[input.id]) {
            setupAutocompleteForInput(input.id);
        }
    });
    
    // Set up observer to handle dynamically added stop inputs
    observeStopAdditions();
}

/**
 * Set up a MutationObserver to watch for new stop inputs being added
 * and initialize autocomplete on them
 */
function observeStopAdditions() {
    const stopsContainer = document.getElementById('stops-container');
    
    // Create a new observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check for new input fields
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const input = node.querySelector('input[type="text"]');
                        if (input && input.id && !autocompleteInstances[input.id]) {
                            setupAutocompleteForInput(input.id);
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the container for changes
    observer.observe(stopsContainer, { childList: true });
}

/**
 * Set up Google Places Autocomplete for a specific input field
 * @param {string} inputId - The ID of the input field to enhance with autocomplete
 */
function setupAutocompleteForInput(inputId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement || autocompleteInstances[inputId]) {
        console.log(`Skipping autocomplete setup for ${inputId}`);
        return;
    }
    
    console.log(`Setting up autocomplete for ${inputId}`);
    
    // CRITICAL: This configuration allows both addresses AND establishments
    const autocompleteOptions = {
        // Include both addresses and establishments in search results
        types: ['establishment', 'geocode'],
        // Request full details about the places
        fields: ['place_id', 'formatted_address', 'geometry', 'name', 'types']
    };
    
    try {
        // Check if Google Maps API is loaded
        if (!google || !google.maps || !google.maps.places || !google.maps.places.Autocomplete) {
            console.error('Google Maps Places API not loaded properly');
            return;
        }
        
        // Initialize the autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(inputElement, autocompleteOptions);
        
        // Store the instance to prevent duplication
        autocompleteInstances[inputId] = autocomplete;
        console.log(`Autocomplete created for ${inputId}`);
        
        // Add a listener to handle selection
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            console.log('Selected place:', place);
            
            // Use the full name of the place if it's a business/POI
            if (place && place.name && place.formatted_address) {
                // For businesses, format as "Business Name, Address"
                // Only do this if the name isn't already part of the address
                if (!place.formatted_address.includes(place.name)) {
                    const formattedPlace = `${place.name}, ${place.formatted_address}`;
                    inputElement.value = formattedPlace;
                }
            }
        });
        
        // Prevent form submission when selecting an autocomplete item
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement === inputElement) {
                e.preventDefault();
            }
        });
    } catch (error) {
        console.error(`Error setting up autocomplete for ${inputId}:`, error);
    }
}

/**
 * Manually check if each input field has autocomplete
 * Useful for debugging issues with autocomplete setup
 */
function debugAutocomplete() {
    // Check every 2 seconds if autocomplete is attached to inputs
    setInterval(() => {
        const allInputs = document.querySelectorAll('input[type="text"]');
        allInputs.forEach(input => {
            if (input.id && !autocompleteInstances[input.id]) {
                console.log(`Input ${input.id} does not have autocomplete attached`);
                setupAutocompleteForInput(input.id);
            }
        });
    }, 2000);
}

// Main initialization function
function initMapsIntegration() {
    console.log('Initializing Maps integration');
    loadGoogleMapsAPI();
    
    // Start debugging after a short delay
    setTimeout(debugAutocomplete, 3000);
}

/**
 * Load the Google Maps JavaScript API with Places library
 */
function loadGoogleMapsAPI() {
    // Check if API is already loading or loaded
    if (window.googleMapsLoading || (window.google && window.google.maps)) {
        console.log('Google Maps API already loading or loaded');
        return;
    }
    
    window.googleMapsLoading = true;
    
    // Define the callback function
    window.initGoogleMapsPlaces = initGoogleMapsPlaces;
    
    // Create the script element
    const script = document.createElement('script');
    // REPLACE 'YOUR_API_KEY' with your actual API key
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCancy_vwbDbYZavxDjtpL7NW4lYl8Tkmk&libraries=places&callback=initGoogleMapsPlaces`;
    script.async = true;
    script.defer = true;
    
    // Handle script loading errors
    script.onerror = () => {
        console.error('Failed to load Google Maps API');
        window.googleMapsLoading = false;
        
        // Show an alert using the app's alert function
        if (typeof showAlert === 'function') {
            showAlert('Failed to load Google Maps API. Some features may not work properly.', 'error');
        }
    };
    
    console.log('Adding Google Maps script to page');
    document.head.appendChild(script);
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMapsIntegration);
} else {
    // DOM already loaded, initialize immediately
    initMapsIntegration();
}
