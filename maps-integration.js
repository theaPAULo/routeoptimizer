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
 */
function initGoogleMapsPlaces() {
    // Configure autocomplete for all address input fields
    setupAutocompleteForInput('start-location');
    setupAutocompleteForInput('end-location');
    
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
    if (!inputElement || autocompleteInstances[inputId]) return;
    
    // Create the autocomplete instance with options that enable business/POI search
    const autocompleteOptions = {
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
        // IMPORTANT: This tells Google to include businesses, POIs, etc. in results
        types: ['establishment', 'geocode']
    };
    
    // Initialize the autocomplete instance
    const autocomplete = new google.maps.places.Autocomplete(inputElement, autocompleteOptions);
    
    // Store the instance to prevent duplication
    autocompleteInstances[inputId] = autocomplete;
    
    // Add a listener to handle selection
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        // Use the full name of the place if it's a business/POI
        if (place.name && place.formatted_address) {
            // For businesses, format as "Business Name, Address"
            const formattedPlace = `${place.name}, ${place.formatted_address}`;
            inputElement.value = formattedPlace;
        }
        
        console.log('Selected place:', place);
    });
    
    // Prevent form submission when selecting an autocomplete item
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement === inputElement) {
            e.preventDefault();
        }
    });
}

/**
 * Load the Google Maps JavaScript API with Places library
 * @param {string} apiKey - Your Google Maps API key
 */
function loadGoogleMapsAPI(apiKey) {
    // Check if the API is already loaded
    if (window.google && window.google.maps) {
        initGoogleMapsPlaces();
        return;
    }
    
    // Create the script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsPlaces`;
    script.async = true;
    script.defer = true;
    
    // Add the callback function to the global scope
    window.initGoogleMapsPlaces = initGoogleMapsPlaces;
    
    // Handle script loading errors
    script.onerror = () => {
        console.error('Failed to load Google Maps API');
        showAlert('Failed to load Google Maps API. Some features may not work properly.', 'error');
    };
    
    // Add script to the document
    document.head.appendChild(script);
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Replace 'YOUR_API_KEY' with your actual Google Maps API key
    // For security, in a production app, you would use environment variables
    loadGoogleMapsAPI('YOUR_API_KEY');
});