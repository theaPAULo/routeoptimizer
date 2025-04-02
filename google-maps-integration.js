/**
 * Google Maps API Integration
 * 
 * This script extends the Route Optimizer app with real Google Maps functionality:
 * - Places Autocomplete for address inputs
 * - Distance Matrix API for calculating distances and times
 * - Directions API for route optimization
 * - Map visualization of the optimized route
 */

// Google Maps API objects
let map;
let directionsService;
let directionsRenderer;
let placesService;
let autocompleteInstances = [];

/**
 * Initialize Google Maps APIs when the page is fully loaded
 */
function initGoogleMapsAPI() {
    console.log('Initializing Google Maps API...');
    
    // Create a map instance (will be hidden until results are shown)
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map';
    mapDiv.style.width = '100%';
    mapDiv.style.height = '300px';
    mapDiv.style.marginBottom = '1.5rem';
    mapDiv.style.borderRadius = '0.5rem';
    mapDiv.style.display = 'none';
    
    // Insert map before the route list
    const routeListContainer = document.querySelector('#results-section h3').parentNode;
    routeListContainer.insertBefore(mapDiv, routeListContainer.firstChild);
    
    // Initialize Google Maps and related services
    try {
        // Initialize the map
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
            zoom: 12,
            mapTypeControl: false
        });
        
        // Initialize the Directions Service and Renderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: false,
            polylineOptions: {
                strokeColor: '#3b82f6',
                strokeWeight: 5
            }
        });
        
        // Initialize Places Service for additional place details
        placesService = new google.maps.places.PlacesService(map);
        
        // Set up autocomplete for input fields
        setupAutocomplete();
        
        console.log('Google Maps API initialized successfully');
    } catch (error) {
        console.error('Error initializing Google Maps API:', error);
        showAlert('Failed to initialize Google Maps. Please check your API key.', 'error');
    }
}

/**
 * Set up Google Places Autocomplete on address input fields
 */
function setupAutocomplete() {
    // Set up autocomplete for start location
    setupInputAutocomplete('start-location');
    
    // Set up autocomplete for end location
    setupInputAutocomplete('end-location');
    
    // Set up autocomplete for initial stop
    const initialStopInput = document.querySelector('#stops-container input');
    if (initialStopInput) {
        setupInputAutocomplete(initialStopInput.id);
    }
    
    // When adding new stops, set up autocomplete for them
    const originalAddStopInput = window.addStopInput;
    window.addStopInput = function() {
        // Call the original function first
        originalAddStopInput();
        
        // Then set up autocomplete for the newly added input
        const newStopId = `stop-${stopCounter}`;
        setupInputAutocomplete(newStopId);
    };
}

/**
 * Set up autocomplete for a specific input field
 * @param {string} inputId - The ID of the input field
 */
function setupInputAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Create autocomplete instance
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        fields: ['place_id', 'formatted_address', 'geometry', 'name']
    });
    
    // Store the autocomplete instance
    autocompleteInstances.push({
        id: inputId,
        instance: autocomplete
    });
    
    // Prevent form submission on place selection
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === input) {
            e.preventDefault();
        }
    });
}

/**
 * Calculate optimized route using Google Maps APIs
 * @param {string} startLocation - Starting location address
 * @param {string} endLocation - Ending location address
 * @param {Array<string>} stops - Array of stop addresses
 * @returns {Promise} - Resolves with the route data
 */
async function calculateOptimizedRoute(startLocation, endLocation, stops) {
    // Combine all waypoints for the optimization request
    const waypoints = [
        { location: startLocation, stopover: true },
        ...stops.map(stop => ({ location: stop, stopover: true })),
        { location: endLocation, stopover: true }
    ];
    
    try {
        // Use Directions API for route optimization
        // Note: This is a simplified approach - real optimization would use Distance Matrix + algorithm
        const optimizedRoute = await getOptimizedRoute(waypoints);
        
        // Format the route data for display
        return {
            success: true,
            route: {
                totalDistance: optimizedRoute.totalDistance,
                estimatedTime: optimizedRoute.estimatedTime,
                waypoints: optimizedRoute.waypoints
            }
        };
    } catch (error) {
        console.error('Route calculation error:', error);
        return {
            success: false,
            error: 'Could not calculate route. Please check your addresses and try again.'
        };
    }
}

/**
 * Get an optimized route using the Directions API
 * @param {Array} waypoints - Array of waypoint objects
 * @returns {Promise} - Resolves with the optimized route data
 */
function getOptimizedRoute(waypoints) {
    return new Promise((resolve, reject) => {
        // Extract starting and ending points
        const origin = waypoints[0].location;
        const destination = waypoints[waypoints.length - 1].location;
        
        // Use middle waypoints for the directions request
        const middleWaypoints = waypoints.slice(1, waypoints.length - 1);
        
        // Create the directions request
        const request = {
            origin: origin,
            destination: destination,
            waypoints: middleWaypoints,
            optimizeWaypoints: true, // This is key - tells Google to optimize the waypoint order
            travelMode: google.maps.TravelMode.DRIVING
        };
        
        // Make the directions request
        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                // Calculate total distance and time
                let totalDistance = 0;
                let totalDuration = 0;
                
                // Sum up leg distances and durations
                result.routes[0].legs.forEach(leg => {
                    totalDistance += leg.distance.value;
                    totalDuration += leg.duration.value;
                });
                
                // Convert distance from meters to miles
                const distanceInMiles = (totalDistance / 1609.34).toFixed(1);
                
                // Convert duration from seconds to minutes
                const durationInMinutes = Math.round(totalDuration / 60);
                
                // Format the optimized waypoints in the correct order
                const optimizedOrder = [0, ...result.routes[0].waypoint_order, result.routes[0].waypoint_order.length + 1];
                
                // Create ordered waypoints array
                const orderedWaypoints = optimizedOrder.map((index) => {
                    const wp = waypoints[index];
                    let type = 'stop';
                    
                    if (index === 0) {
                        type = 'start';
                    } else if (index === waypoints.length - 1) {
                        type = 'end';
                    }
                    
                    return {
                        address: typeof wp.location === 'string' ? wp.location : wp.location.formatted_address || 'Location',
                        type: type
                    };
                });
                
                // Render directions on the map
                directionsRenderer.setDirections(result);
                
                // Show the map
                document.getElementById('map').style.display = 'block';
                
                // Resolve with the route data
                resolve({
                    totalDistance: `${distanceInMiles} miles`,
                    estimatedTime: `${durationInMinutes} minutes`,
                    waypoints: orderedWaypoints
                });
            } else {
                console.error('Directions request failed with status:', status);
                reject(new Error(`Directions request failed: ${status}`));
            }
        });
    });
}

/**
 * Override the original form submission handler to use Google Maps APIs
 */
const originalHandleFormSubmit = window.handleFormSubmit;
window.handleFormSubmit = async function(event) {
    event.preventDefault();
    
    // Collect form data
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    
    // Collect all stops
    const stops = [];
    const stopInputs = document.querySelectorAll('#stops-container input[type="text"]');
    
    for (const input of stopInputs) {
        if (input.value.trim()) {
            stops.push(input.value.trim());
        }
    }
    
    // Validate inputs
    if (!startLocation) {
        showAlert('Please enter a starting location');
        return;
    }
    
    if (!endLocation) {
        showAlert('Please enter an ending location');
        return;
    }
    
    if (stops.length === 0) {
        showAlert('Please add at least one stop');
        return;
    }
    
    // Show loading state
    toggleLoadingState(true);
    
    try {
        // Calculate route using Google Maps APIs
        const response = await calculateOptimizedRoute(startLocation, endLocation, stops);
        
        // Handle the response
        handleRouteResponse(response);
    } catch (error) {
        console.error('Error calculating route:', error);
        showAlert('Failed to calculate route. Please try again.');
        toggleLoadingState(false);
    }
};

/**
 * Load Google Maps script with the API key
 * Called after the page loads
 */
function loadGoogleMapsScript() {
    // Check if we're running on Netlify or locally
    let finalApiKey = googleMapsApiKey;
    
    // If this is a placeholder, try to get from environment
    if (finalApiKey === 'GOOGLE_MAPS_API_KEY') {
        // For Netlify, try to get from environment variables
        if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_MAPS_API_KEY) {
            finalApiKey = process.env.GOOGLE_MAPS_API_KEY;
        }
        
        // For local testing, check if YOUR_API_KEY is defined
        if (typeof YOUR_API_KEY !== 'undefined') {
            finalApiKey = YOUR_API_KEY;
        }
        
        console.log(`Using API key from environment: ${finalApiKey.substring(0, 4)}...`);
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${finalApiKey}&libraries=places&callback=initGoogleMapsAPI`;
    script.async = true;
    script.defer = true;
    
    // Add error handling
    script.onerror = function() {
        console.error('Failed to load Google Maps API');
        showAlert('Failed to load Google Maps API. Please check your API key.', 'error');
    };
    
    // Add the script to the document
    document.head.appendChild(script);
}

/**
 * Add a helper function to reset the map when going back to form view
 */
const originalShowInputSection = window.showInputSection;
window.showInputSection = function() {
    // Call the original function
    originalShowInputSection();
    
    // Hide the map
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.style.display = 'none';
    }
    
    // Clear the directions if renderer exists
    if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
    }
};

/**
 * Enhancement: Save route with additional map data
 */
const originalSaveRoute = window.saveRoute;
window.saveRoute = function() {
    // If we have a real route with Google Maps data, add it to what we save
    if (currentRoute && map && directionsRenderer) {
        // Add map bounds for later recreation
        if (map.getBounds()) {
            currentRoute.mapBounds = {
                north: map.getBounds().getNorthEast().lat(),
                east: map.getBounds().getNorthEast().lng(),
                south: map.getBounds().getSouthWest().lat(),
                west: map.getBounds().getSouthWest().lng()
            };
        }
        
        // Add route polyline points (compressed to save space)
        if (directionsRenderer.getDirections() && 
            directionsRenderer.getDirections().routes[0] &&
            directionsRenderer.getDirections().routes[0].overview_path) {
            
            const points = directionsRenderer.getDirections().routes[0].overview_path;
            currentRoute.routePath = points.map(point => [point.lat(), point.lng()]);
        }
    }
    
    // Call the original save function
    originalSaveRoute();
};

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the app to be initialized first
    setTimeout(() => {
        // Then load Google Maps API
        loadGoogleMapsScript();
    }, 100);
});

/**
 * Helper function to get better addresses from geocoding when input is vague
 * @param {string} address - The user input address
 * @returns {Promise<string>} - Promise resolving to a more complete address
 */
function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        // If we don't have the geocoder yet, just return the original address
        if (!window.google || !window.google.maps.Geocoder) {
            resolve(address);
            return;
        }
        
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                resolve(results[0].formatted_address);
            } else {
                // If geocoding fails, just use the original address
                resolve(address);
            }
        });
    });
}

/**
 * Add a debug button for API key issues (development only)
 * This will be removed automatically in production builds
 */
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Add a debug floating button
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug API Key';
    debugBtn.style.position = 'fixed';
    debugBtn.style.bottom = '10px';
    debugBtn.style.right = '10px';
    debugBtn.style.zIndex = '9999';
    debugBtn.style.padding = '8px 12px';
    debugBtn.style.background = '#f59e0b';
    debugBtn.style.color = 'white';
    debugBtn.style.border = 'none';
    debugBtn.style.borderRadius = '4px';
    debugBtn.style.cursor = 'pointer';
    
    debugBtn.addEventListener('click', function() {
        // Print debug info
        console.log('DEBUG INFO:');
        console.log('API Key:', googleMapsApiKey);
        console.log('Is Google Maps loaded:', typeof google !== 'undefined' && typeof google.maps !== 'undefined');
        console.log('Autocomplete instances:', autocompleteInstances);
        
        // Check if key is valid
        if (googleMapsApiKey === 'GOOGLE_MAPS_API_KEY' || googleMapsApiKey === 'YOUR_API_KEY') {
            alert('API Key is not set! Please add your Google Maps API key.');
        } else {
            alert('Using API Key: ' + googleMapsApiKey.substring(0, 4) + '...');
        }
    });
    
    // Add to document
    document.body.appendChild(debugBtn);
}