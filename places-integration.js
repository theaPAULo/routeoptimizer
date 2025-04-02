/**
 * Google Places API Integration
 * 
 * This script adds Google Places autocomplete to the Route Optimizer inputs,
 * enabling search for businesses, landmarks, and addresses.
 */

// Wait for Google Maps API to be fully loaded
function waitForGoogleMaps(callback) {
    if (window.google && window.google.maps && window.google.maps.places) {
        callback();
    } else {
        setTimeout(() => waitForGoogleMaps(callback), 100);
    }
}

// Initialize autocomplete on a specific input element
function initializeAutocomplete(inputElement) {
    if (!inputElement || inputElement.dataset.placesInitialized === 'true') {
        return;
    }
    
    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
        // Empty types array allows ALL place types (businesses, addresses, etc.)
        types: [],
        fields: ['place_id', 'formatted_address', 'name', 'geometry']
    });
    
    inputElement.dataset.placesInitialized = 'true';
    
    // Format business names properly when selected
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        
        // For business locations, format as "Business Name, Address"
        if (place.name && place.formatted_address && 
            !place.formatted_address.includes(place.name)) {
            inputElement.value = `${place.name}, ${place.formatted_address}`;
        }
    });
    
    // Prevent form submission when selecting from dropdown
    inputElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === inputElement) {
            e.preventDefault();
        }
    });
}

// Initialize autocomplete on all input fields
function initializeAllInputs() {
    // Initialize static inputs
    const startLocation = document.getElementById('start-location');
    const endLocation = document.getElementById('end-location');
    
    if (startLocation) initializeAutocomplete(startLocation);
    if (endLocation) initializeAutocomplete(endLocation);
    
    // Initialize any existing stop inputs
    const stopInputs = document.querySelectorAll('#stops-container input[type="text"]');
    stopInputs.forEach(input => initializeAutocomplete(input));
}

// Set up observer for dynamically added inputs
function setupDynamicInputObserver() {
    const stopsContainer = document.getElementById('stops-container');
    if (!stopsContainer) return;
    
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const inputs = node.querySelectorAll ? 
                            node.querySelectorAll('input[type="text"]') : [];
                        inputs.forEach(input => waitForGoogleMaps(() => initializeAutocomplete(input)));
                    }
                });
            }
        });
    });
    
    observer.observe(stopsContainer, { childList: true, subtree: true });
}

// Load Google Maps API with Places library
function loadGoogleMapsAPI() {
    // Skip if already loading or loaded
    if (window.googleMapsLoading || 
        (window.google && window.google.maps && window.google.maps.places)) {
        return;
    }
    
    window.googleMapsLoading = true;
    
    // Setup callback
    window.initGooglePlacesAPI = function() {
        waitForGoogleMaps(() => {
            initializeAllInputs();
            setupDynamicInputObserver();
            
            // Periodic check for missed inputs
            setInterval(() => {
                const allInputs = document.querySelectorAll('#start-location, #end-location, #stops-container input[type="text"]');
                allInputs.forEach(input => {
                    if (!input.dataset.placesInitialized) {
                        initializeAutocomplete(input);
                    }
                });
            }, 2000);
        });
    };
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initGooglePlacesAPI';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

// Initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGoogleMapsAPI);
} else {
    loadGoogleMapsAPI();
}
