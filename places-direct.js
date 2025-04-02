/**
 * Direct Places API Integration
 * 
 * This simplified script directly attaches Google Places autocomplete
 * to the Route Optimizer's input fields.
 */

// Wait for Google Maps API to be fully loaded
function waitForGoogleMaps(callback) {
    if (window.google && window.google.maps && window.google.maps.places) {
        // API is already loaded, call callback immediately
        callback();
    } else {
        // Check again in 100ms
        setTimeout(() => waitForGoogleMaps(callback), 100);
    }
}

// Initialize autocomplete on an input element
function initializeAutocomplete(inputElement) {
    // Skip if already initialized or element doesn't exist
    if (!inputElement || inputElement.dataset.placesInitialized === 'true') {
        return;
    }

    console.log(`Initializing autocomplete for: ${inputElement.id}`);
    
    // Create the autocomplete object
    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
        // Empty types array allows ALL types (businesses, addresses, etc.)
        types: [],
        // Request these specific fields for better performance
        fields: ['place_id', 'formatted_address', 'name', 'geometry']
    });
    
    // Mark as initialized
    inputElement.dataset.placesInitialized = 'true';
    
    // When a place is selected
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        
        // For business locations, format as "Business Name, Address"
        if (place.name && place.formatted_address && 
            !place.formatted_address.includes(place.name)) {
            inputElement.value = `${place.name}, ${place.formatted_address}`;
        }
        
        console.log(`Selected place: ${place.name || 'Unknown'}`);
    });
    
    // Prevent form submission when selecting from dropdown
    inputElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === inputElement) {
            e.preventDefault();
        }
    });
}

// Initialize autocomplete on all relevant inputs
function initializeAllInputs() {
    // Get the static inputs
    const startLocation = document.getElementById('start-location');
    const endLocation = document.getElementById('end-location');
    
    // Initialize static inputs
    if (startLocation) initializeAutocomplete(startLocation);
    if (endLocation) initializeAutocomplete(endLocation);
    
    // Get any existing stop inputs
    const stopInputs = document.querySelectorAll('#stops-container input[type="text"]');
    stopInputs.forEach(input => initializeAutocomplete(input));
    
    console.log('Initialized autocomplete on all existing inputs');
}

// Set up observer for dynamically added inputs
function setupDynamicInputObserver() {
    const stopsContainer = document.getElementById('stops-container');
    if (!stopsContainer) return;
    
    // Create observer to watch for new inputs
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // For each added node
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // If it's an input or contains inputs
                        const inputs = node.querySelectorAll ? 
                            node.querySelectorAll('input[type="text"]') : [];
                        
                        // Initialize each input
                        inputs.forEach(input => waitForGoogleMaps(() => initializeAutocomplete(input)));
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
    
    console.log('Dynamic input observer setup complete');
}

// Function to run when DOM is fully loaded
function onDOMReady() {
    console.log('DOM ready, waiting for Google Maps API...');
    
    // Wait for Google Maps API to load, then initialize
    waitForGoogleMaps(() => {
        console.log('Google Maps API ready, initializing autocomplete');
        initializeAllInputs();
        setupDynamicInputObserver();
        
        // Add periodic check for any missed inputs
        setInterval(() => {
            const allInputs = document.querySelectorAll('#start-location, #end-location, #stops-container input[type="text"]');
            allInputs.forEach(input => {
                if (!input.dataset.placesInitialized) {
                    initializeAutocomplete(input);
                }
            });
        }, 2000);
    });
}

// Run when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDOMReady);
} else {
    // DOM already loaded
    onDOMReady();
}
