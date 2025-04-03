/**
 * Route Optimizer Application with Google Maps API Integration
 */

// Global variables
let map;
let directionsService;
let directionsRenderer;
let geocoder;
let autocompletes = [];
let currentRoute = null;
let stopCounter = 0;

// DOM Elements
const routeForm = document.getElementById('route-form');
const stopsContainer = document.getElementById('stops-container');
const addStopBtn = document.getElementById('add-stop-btn');
const optimizeBtn = document.getElementById('optimize-btn');
const backBtn = document.getElementById('back-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const optimizeBtnText = document.getElementById('optimize-btn-text');
const inputSection = document.getElementById('input-section');
const resultsSection = document.getElementById('results-section');
const alertBox = document.getElementById('alert-box');
const totalDistance = document.getElementById('total-distance');
const estimatedTime = document.getElementById('estimated-time');
const routeList = document.getElementById('route-list');
const mapContainer = document.getElementById('map-container');


/**
 * Main initialization function - called after Google Maps loads
 */
function initializeApp() {
    try {
        console.log("Initializing DriveLess App");
        
        // Set up Google Maps components
        initializeGoogleMaps();
        
        // Add first stop input - only if Google Maps is available
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
            // Clear any existing stops first
            stopsContainer.innerHTML = '';
            stopCounter = 0;
            addStopInput();
        }
        
        // Set up event listeners
        addStopBtn.addEventListener('click', addStopInput);
        routeForm.addEventListener('submit', handleFormSubmit);
        backBtn.addEventListener('click', showInputSection);
        // Add event listeners for map buttons
        document.getElementById('google-maps-btn').addEventListener('click', openGoogleMaps);
        document.getElementById('apple-maps-btn').addEventListener('click', openAppleMaps);
        
        console.log("Initialization complete");
    } catch (error) {
        console.error("Error during initialization:", error);
    }
}

/**
 * Initialize Google Maps components
 */
function initializeGoogleMaps() {
    console.log("Setting up Google Maps components");
    
    try {
        // Create directions service for route calculation
        directionsService = new google.maps.DirectionsService();
        
        // Create geocoder for converting addresses to coordinates
        geocoder = new google.maps.Geocoder();
        
        // Initialize map
        if (mapContainer) {
            console.log("Initializing map in container:", mapContainer);
            
            // Force a height if not set in CSS
            if (mapContainer.offsetHeight === 0) {
                mapContainer.style.height = '400px';
            }
            
            // Initialize the map
            map = new google.maps.Map(mapContainer, {
                center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            
            // Create directions renderer for displaying routes
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: false,
                draggable: false,
                polylineOptions: {
                    strokeColor: '#3b82f6',
                    strokeWeight: 5,
                    strokeOpacity: 0.7
                }
            });
            
            console.log("Map initialized successfully");
        } else {
            console.error("Map container not found");
        }
        
        // Setup autocomplete for start/end fields
        setupAutocomplete('start-location');
        setupAutocomplete('end-location');
        
    } catch (error) {
        console.error("Error setting up Google Maps components:", error);
    }
}

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.error(`Input element with ID ${inputId} not found`);
        return;
    }
    
    try {
        // Allow all types of places (addresses, establishments, etc.)
        const autocomplete = new google.maps.places.Autocomplete(input, {
            types: [] // Empty array means all types
        });
        console.log(`Autocomplete initialized for ${inputId}`);
        
        // Store autocomplete instance
        autocompletes.push({ id: inputId, instance: autocomplete });
    } catch (error) {
        console.error(`Error setting up autocomplete for ${inputId}:`, error);
    }
}

/**
 * Refreshes autocompletes after reordering operations
 */
function refreshAutocompletes() {
    // Clear existing autocompletes
    autocompletes = autocompletes.filter(item => 
        item.id === 'start-location' || item.id === 'end-location'
    );
    
    // Re-initialize all stop autocompletes
    const stopInputs = stopsContainer.querySelectorAll('input[type="text"]');
    stopInputs.forEach(input => {
        setupAutocomplete(input.id);
    });
}

/**
 * Adds a new stop input field to the form with Google Places autocomplete
 */
function addStopInput() {
    stopCounter++;
    const stopId = `stop-${stopCounter}`;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'stop-item fade-in';
    stopDiv.innerHTML = `
        <div class="relative flex items-center mb-2">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i class="fas fa-map-marker-alt text-gray-400"></i>
            </span>
            <input 
                type="text" 
                id="${stopId}" 
                class="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter stop address"
                required
            >
            ${stopCounter > 1 ? `<button 
                type="button" 
                class="absolute right-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                aria-label="Remove stop"
                onclick="removeStop(this)"
            >
                <i class="fas fa-times"></i>
            </button>` : ''}
        </div>
    `;
    
    stopsContainer.appendChild(stopDiv);
    
    // Add Google Places autocomplete
    setupAutocomplete(stopId);
}

/**
 * Removes a stop input field
 * @param {HTMLElement} button - The remove button that was clicked
 */
function removeStop(button) {
    const stopItem = button.closest('.stop-item');
    const inputId = stopItem.querySelector('input').id;
    
    // Remove autocomplete from tracking array
    autocompletes = autocompletes.filter(item => item.id !== inputId);
    
    // Animate removal
    stopItem.style.opacity = 0;
    setTimeout(() => {
        stopsContainer.removeChild(stopItem);
    }, 300);
}

/**
 * Shows an alert message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of alert (error, success, info)
 */
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `${type} mb-4 p-4 rounded-md fade-in`;
    alertBox.classList.remove('hidden');
    
    // Automatically hide after 5 seconds
    setTimeout(() => {
        alertBox.classList.add('hidden');
    }, 5000);
}

/**
 * Handles the form submission
 * @param {Event} event - The form submission event
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Collect form data
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    
    // Collect all stops
    const stops = [];
    const stopInputs = stopsContainer.querySelectorAll('input[type="text"]');
    
    for (const input of stopInputs) {
        if (input.value.trim()) {
            stops.push(input.value.trim());
        }
    }
    
    // Basic validation
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
        console.log("Calculating route with:", {
            start: startLocation,
            stops: stops,
            end: endLocation
        });
        
        // Step 1: Validate and geocode all addresses
        const locations = await validateAddresses({
            start: startLocation,
            end: endLocation,
            stops: stops
        });
        
        console.log("Geocoded locations:", locations);
        
        // Step 2: Calculate the optimized route
        const routeResult = await calculateOptimizedRoute(locations);
        
        console.log("Route calculation result:", routeResult);
        
        // Update UI with results
        displayRouteResults(routeResult);
    } catch (error) {
        console.error("Route calculation error:", error);
        showAlert(error.message || 'Error calculating route. Please try again.');
        toggleLoadingState(false);
    }
}

/**
 * Validates all addresses using Google Geocoding API
 * @param {Object} locations - Object containing start, end, and stops addresses
 * @returns {Promise} - Promise resolving to validated locations with coordinates
 */
async function validateAddresses(locations) {
    try {
        console.log("Validating addresses:", locations);
        
        // Create geocoding promises for all addresses
        const startPromise = geocodeAddress(locations.start);
        const endPromise = geocodeAddress(locations.end);
        const stopsPromises = locations.stops.map(stop => geocodeAddress(stop));
        
        // Wait for all geocoding requests to complete
        const [startResult, endResult, ...stopsResults] = await Promise.all([
            startPromise, 
            endPromise, 
            ...stopsPromises
        ]);
        
        console.log("Geocoding results:", {
            start: startResult,
            end: endResult,
            stops: stopsResults
        });
        
        // Check if any geocoding failed
        if (!startResult || !endResult || stopsResults.includes(null)) {
            throw new Error('One or more addresses could not be found. Please check your inputs.');
        }
        
        return {
            start: startResult,
            end: endResult,
            stops: stopsResults
        };
    } catch (error) {
        console.error('Address validation error:', error);
        throw error;
    }
}

/**
 * Geocodes an address to coordinates
 * @param {string} address - The address to geocode
 * @returns {Promise} - Promise resolving to location object with coordinates
 */
function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        console.log("Geocoding address:", address);
        
        geocoder.geocode({ address }, (results, status) => {
            console.log(`Geocoding result for "${address}":`, status, results);
            
            if (status === 'OK' && results && results.length > 0) {
                resolve({
                    address: results[0].formatted_address,
                    location: results[0].geometry.location,
                    placeId: results[0].place_id
                });
            } else {
                console.error('Geocoding failed for address:', address, status);
                resolve(null); // Resolve with null to handle in the main validation function
            }
        });
    });
}

/**
 * Calculates an optimized route using Google Directions Service
 * @param {Object} locations - Object containing geocoded addresses
 * @returns {Promise} - Promise resolving to route data
 */
function calculateOptimizedRoute(locations) {
    return new Promise((resolve, reject) => {
        console.log("Calculating optimized route...");
        
        // For the Google Directions API, we need to optimize waypoint order
        const waypoints = locations.stops.map(stop => ({
            location: stop.location,
            stopover: true
        }));
        
        const request = {
            origin: locations.start.location,
            destination: locations.end.location,
            waypoints: waypoints,
            optimizeWaypoints: true, // This is key for route optimization
            travelMode: google.maps.TravelMode.DRIVING
        };
        
        console.log("Direction request:", request);
        
        directionsService.route(request, (result, status) => {
            console.log("Directions service response:", status, result);
            
            if (status === 'OK') {
                // Process route data
                const legs = result.routes[0].legs;
                const waypointOrder = result.routes[0].waypoint_order;
                
                // Calculate total distance and time
                let totalDistanceMeters = 0;
                let totalDurationSeconds = 0;
                
                for (const leg of legs) {
                    totalDistanceMeters += leg.distance.value;
                    totalDurationSeconds += leg.duration.value;
                }
                
                // Convert to miles and minutes
                const totalDistanceMiles = (totalDistanceMeters / 1609.34).toFixed(1);
                const totalDurationMinutes = Math.round(totalDurationSeconds / 60);
                
                // Format duration into hours and minutes
                let durationText;
                if (totalDurationMinutes >= 60) {
                    const hours = Math.floor(totalDurationMinutes / 60);
                    const minutes = totalDurationMinutes % 60;
                    durationText = `${hours} hr ${minutes} min`;
                } else {
                    durationText = `${totalDurationMinutes} min`;
                }
                
                // Create ordered waypoints list based on the optimization
                const orderedWaypoints = [
                    { address: locations.start.address, type: 'start' }
                ];
                
                // Add stops in optimized order
                for (const index of waypointOrder) {
                    orderedWaypoints.push({
                        address: locations.stops[index].address,
                        type: 'stop'
                    });
                }
                
                // Add destination
                orderedWaypoints.push({
                    address: locations.end.address,
                    type: 'end'
                });
                
                // Create route object
                const route = {
                    totalDistance: `${totalDistanceMiles} miles`,
                    estimatedTime: durationText,
                    waypoints: orderedWaypoints,
                    directionsResult: result
                };
                
                resolve(route);
            } else {
                console.error('Directions request failed:', status);
                reject(new Error('Could not calculate route. Please try different locations.'));
            }
        });
    });
}

/**
 * Toggles the loading state of the form
 * @param {boolean} isLoading - Whether the form is in loading state
 */
function toggleLoadingState(isLoading) {
    if (isLoading) {
        optimizeBtnText.textContent = 'Calculating optimal route...';
        loadingSpinner.classList.remove('hidden');
        optimizeBtn.disabled = true;
    } else {
        optimizeBtnText.textContent = 'Optimize Route';
        loadingSpinner.classList.add('hidden');
        optimizeBtn.disabled = false;
    }
}

/**
 * Checks if the current user is an admin
 * Uses localStorage for simple implementation
 * @returns {boolean} - Whether the user is an admin
 */
function isAdminUser() {
    return localStorage.getItem('driveless_admin') === 'true';
  }
  
  /**
   * Attempts to authenticate as admin
   * @param {string} password - Admin password
   * @returns {boolean} - Whether authentication was successful
   */
  function authenticateAdmin(password) {
    // Use a secure hashing mechanism in production
    // This is a simple example - DO NOT use in production as-is
    const hashedPassword = "5f4dcc3b5aa765d61d8327deb882cf99"; // "password" hashed with MD5
    
    // In production, you'd use a more secure method and server-side verification
    if (password && hashPassword(password) === hashedPassword) {
      localStorage.setItem('driveless_admin', 'true');
      return true;
    }
    return false;
  }

/**
 * Displays the route results in the UI and on the map
 * @param {Object} route - The optimized route data
 */
function displayRouteResults(route) {
    console.log("Displaying route results:", route);
    
    // Store current route
    currentRoute = route;
    
    // End loading state
    toggleLoadingState(false);
    
    // Update stats
    totalDistance.textContent = route.totalDistance;
    estimatedTime.textContent = route.estimatedTime;
    
    // Display route on map
    directionsRenderer.setDirections(route.directionsResult);
    
    // Clear previous route list
    routeList.innerHTML = '';
    
    // Add route points to list
    route.waypoints.forEach((point, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'slide-down';
        listItem.style.animationDelay = `${index * 0.1}s`;
        
        listItem.innerHTML = `
            <div class="stop-number">${index + 1}</div>
            <div class="stop-address">${point.address}</div>
            <div class="stop-type ${point.type}">${point.type}</div>
        `;
        
        routeList.appendChild(listItem);
    });
    
    // Show results section
    inputSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
    
    // Trigger a resize event to ensure map displays correctly
    setTimeout(() => {
        google.maps.event.trigger(map, 'resize');
        
        // Set map bounds to fit the route
        const bounds = new google.maps.LatLngBounds();
        route.directionsResult.routes[0].legs.forEach(leg => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
        });
        map.fitBounds(bounds);
    }, 100);
}

/**
 * Shows the input section again
 */
function showInputSection() {
    inputSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
}

/**
 * Generates a Google Maps URL for the current route
 * @returns {string} URL to open the route in Google Maps
 */
function generateGoogleMapsUrl() {
    if (!currentRoute) return null;
    
    // Extract addresses
    const waypoints = currentRoute.waypoints;
    const origin = encodeURIComponent(waypoints[0].address);
    const destination = encodeURIComponent(waypoints[waypoints.length - 1].address);
    
    // Extract intermediate stops
    const stops = waypoints.slice(1, waypoints.length - 1)
        .map(point => encodeURIComponent(point.address))
        .join('|');
    
    // Build Google Maps URL
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${stops}&travelmode=driving`;
}

/**
 * Generates an Apple Maps URL for the current route
 * @returns {string} URL to open the route in Apple Maps
 */
function generateAppleMapsUrl() {
    if (!currentRoute) return null;
    
    // Extract addresses
    const waypoints = currentRoute.waypoints;
    const origin = encodeURIComponent(waypoints[0].address);
    const destination = encodeURIComponent(waypoints[waypoints.length - 1].address);
    
    // Apple Maps doesn't support multiple waypoints in the same way Google Maps does
    // But we can provide a basic directions URL from start to end
    return `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
}

/**
 * Opens the current route in Google Maps
 */
function openGoogleMaps() {
    const url = generateGoogleMapsUrl();
    if (url) {
        window.open(url, '_blank');
    } else {
        showAlert('Please calculate a route first');
    }
}

/**
 * Opens the current route in Apple Maps
 */
function openAppleMaps() {
    const url = generateAppleMapsUrl();
    if (url) {
        window.open(url, '_blank');
    } else {
        showAlert('Please calculate a route first');
    }
}

/**
 * Geocodes an address with caching
 * @param {string} address - The address to geocode
 * @returns {Promise} - Promise resolving to location object
 */
function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        console.log("Geocoding address:", address);
        
        // Check cache first
        const cacheKey = `geocode_${address}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            console.log("Using cached geocoding result");
            resolve(JSON.parse(cached));
            return;
        }
        
        // Not in cache, use Google API
        geocoder.geocode({ address }, (results, status) => {
            console.log(`Geocoding result for "${address}":`, status, results);
            
            if (status === 'OK' && results && results.length > 0) {
                const result = {
                    address: results[0].formatted_address,
                    location: results[0].geometry.location,
                    placeId: results[0].place_id
                };
                
                // Cache the result
                localStorage.setItem(cacheKey, JSON.stringify(result));
                
                resolve(result);
            } else {
                console.error('Geocoding failed for address:', address, status);
                resolve(null);
            }
        });
    });
}

/**
 * Function to sanitize user input to prevent XSS attacks
 * @param {string} input - User provided input
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  // Basic sanitization - removes HTML tags and script
  return input.replace(/<\/?[^>]+(>|$)/g, "");
}

// At the end of initializeApp function
// Set up admin functionality
setupAdminFunctionality();

/**
 * Sets up admin functionality
 */
function setupAdminFunctionality() {
  // Check if admin already
  if (isAdminUser()) {
    document.body.classList.add('admin-user');
  }
  
  // Add admin login link to footer
  const footer = document.querySelector('footer');
  const adminLink = document.createElement('a');
  adminLink.href = '#';
  adminLink.textContent = 'Admin';
  adminLink.className = 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2';
  adminLink.addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('admin-login-modal').classList.remove('hidden');
  });
  
  footer.appendChild(document.createTextNode(' | '));
  footer.appendChild(adminLink);
  
  // Set up admin login form
  const adminForm = document.getElementById('admin-login-form');
  const adminModal = document.getElementById('admin-login-modal');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  
  adminForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    
    if (authenticateAdmin(password)) {
      // Successfully authenticated
      document.body.classList.add('admin-user');
      adminModal.classList.add('hidden');
      showAlert('Admin mode activated', 'success');
    } else {
      showAlert('Invalid admin password', 'error');
    }
  });
  
  cancelBtn.addEventListener('click', function() {
    adminModal.classList.add('hidden');
  });
}

/**
 * Simple password hashing function
 * NOTE: This is NOT secure for production. Use a proper hashing library.
 * @param {string} password - Password to hash
 * @returns {string} - Hashed password
 */
function hashPassword(password) {
  // This is a placeholder - in production use a secure hashing method
  // For example, use a library like bcrypt
  return password; // Do NOT use this in production
}

// Add this at the end of your app.js file
document.addEventListener('DOMContentLoaded', function() {
    // Only run this if not already initialized by Google Maps
    if (typeof window.appInitialized === 'undefined') {
        console.log("DOM Content Loaded - initializing app");
        initializeApp();
    }
});

// Keep this function at the bottom of your app.js file
function initMap() {
    console.log("Google Maps API loaded successfully");
    window.appInitialized = true;
    
    // Initialize the app now that Google Maps is loaded
    initializeApp();
}

// Leave this event listener in place for cases where Maps loads very quickly
document.addEventListener('DOMContentLoaded', function() {
    // Only run this if not already initialized by Google Maps
    if (typeof window.appInitialized === 'undefined') {
        console.log("DOM Content Loaded - initializing app");
        
        // Check if Maps API is loaded
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            console.log("Google Maps API not yet loaded, waiting for callback");
            // The Maps API will call initMap when it loads
        } else {
            initializeApp();
        }
    }
});