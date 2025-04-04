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
        // Add location button event listener
        const useLocationBtn = document.getElementById('use-location-btn');
        if (useLocationBtn) {
            useLocationBtn.addEventListener('click', getCurrentLocation);
            console.log("Added event listener for location button");
        } else {
            console.error("Location button not found");
}
        // Set up admin functionality
        setupAdminFunctionality();
        
        // Update usage indicator
        updateUsageIndicator();
        
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
 * Refreshes ads when changing views
 */
function refreshAds() {
    // Only attempt to refresh ads if not in admin mode
    if (!isAdminUser()) {
      if (window.adsbygoogle) {
        try {
          // Push a new ad request
          (adsbygoogle = window.adsbygoogle || []).push({});
          console.log("AdSense refresh requested");
        } catch (e) {
          console.error("Error refreshing ads:", e);
        }
      } else {
        console.log("AdSense not available for refresh");
      }
    }
  }
  
  /**
   * Modifies the showInputSection function to refresh ads
   */
  function showInputSection() {
    inputSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    
    // Refresh ads when changing view
    refreshAds();
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
    stopDiv.className = 'stop-item fade-in-up';
    stopDiv.innerHTML = `
        <div class="relative flex items-center mb-2">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i class="fas fa-map-marker-alt text-primary-400"></i>
            </span>
            <input 
                type="text" 
                id="${stopId}" 
                class="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" 
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
 * Shows the user's API usage statistics
 */
function showUsageStats() {
  // Create usage stats modal if it doesn't exist
  if (!document.getElementById('usage-stats-modal')) {
    const usageData = getApiUsage();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayCount = usageData[today] || 0;
    
    const modal = document.createElement('div');
    modal.id = 'usage-stats-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 class="text-xl font-bold mb-4 dark:text-white">Usage Limit Reached</h3>
        <p class="mb-4 dark:text-gray-300">You've used ${todayCount} out of ${API_LIMITS.DAILY_LIMIT} route calculations today.</p>
        <p class="mb-4 dark:text-gray-300">Your limit will reset at midnight.</p>
        <div class="mb-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${(todayCount / API_LIMITS.DAILY_LIMIT) * 100}%"></div>
        </div>
        <div class="flex justify-center">
          <button 
            id="usage-close-btn"
            class="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            OK, I Understand
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener
    document.getElementById('usage-close-btn').addEventListener('click', function() {
      modal.remove();
    });
  } else {
    document.getElementById('usage-stats-modal').classList.remove('hidden');
  }
}

/**
 * Updates the usage indicator display
 */
function updateUsageIndicator() {
    console.log("Updating usage indicator...");
    
    const usageData = getApiUsage();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayCount = usageData[today] || 0;
    
    const indicator = document.getElementById('usage-indicator');
    const countEl = document.getElementById('usage-count');
    const limitEl = document.getElementById('usage-limit');
    
    console.log("Usage indicator elements:", {
        indicator: indicator,
        countEl: countEl,
        limitEl: limitEl,
        todayCount: todayCount
    });
    
    if (indicator && countEl && limitEl) {
        // Always show the indicator
        indicator.classList.remove('hidden');
        
        countEl.textContent = todayCount;
        limitEl.textContent = API_LIMITS.DAILY_LIMIT;
    } else {
        console.error("One or more usage indicator elements not found");
    }
}

/**
 * Handles the form submission
 * @param {Event} event - The form submission event
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Check API usage limit (skip for admin users)
    if (!isAdminUser() && hasExceededApiLimit()) {
      showAlert('You have reached your daily limit of route calculations. Please try again tomorrow.', 'error');
      showUsageStats();
      return;
    }
    
    // Collect form data with sanitization
    const startLocation = sanitizeInput(document.getElementById('start-location').value);
    const endLocation = sanitizeInput(document.getElementById('end-location').value);
    
    // Collect all stops
    const stops = [];
    const stopInputs = stopsContainer.querySelectorAll('input[type="text"]');
    
    for (const input of stopInputs) {
      if (input.value.trim()) {
        stops.push(sanitizeInput(input.value.trim()));
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
        
        // Add original address strings to preserve business names
        locations.start.originalAddress = startLocation;
        locations.end.originalAddress = endLocation;
        locations.stops.forEach((stop, index) => {
            stop.originalAddress = stops[index];
        });
        
        console.log("Geocoded locations:", locations);
        
        // Step 2: Calculate the optimized route
        const routeResult = await calculateOptimizedRoute(locations);
        
        console.log("Route calculation result:", routeResult);
        
        // Update UI with results
        displayRouteResults(routeResult);
        
        // Increment API usage counter
        incrementApiUsage();
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

function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        console.log("Geocoding address:", address);
        
        // Check cache first
        const cacheKey = `geocode_${address}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            console.log("Using cached geocoding result");
            const cachedResult = JSON.parse(cached);
            
            // Ensure the name is set correctly (add this check)
            if (!cachedResult.name && address) {
                // Extract name from the original address
                if (address.includes(',')) {
                    cachedResult.name = address.split(',')[0].trim();
                    cachedResult.originalAddress = address;
                    
                    // Update the cache with the fixed result
                    localStorage.setItem(cacheKey, JSON.stringify(cachedResult));
                }
            }
            
            resolve(cachedResult);
            return;
        }
        
        // Not in cache, use Google API
        geocoder.geocode({ address }, (results, status) => {
            console.log(`Geocoding result for "${address}":`, status, results);
            
            if (status === 'OK' && results && results.length > 0) {
                // Extract name from the original address
                let name = '';
                if (address.includes(',')) {
                    name = address.split(',')[0].trim();
                }
                
                const result = {
                    address: results[0].formatted_address,
                    location: results[0].geometry.location,
                    placeId: results[0].place_id,
                    name: name,
                    originalAddress: address
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
                
                // Extract the first part of the original address as the name
                const extractName = (addr) => {
                    if (!addr) return '';
                    return addr.includes(',') ? addr.split(',')[0].trim() : addr;
                };

                // Create ordered waypoints list based on the optimization
                const orderedWaypoints = [
                    { 
                        address: locations.start.address,
                        // Ensure we're getting the name either from the geocoded result or the original input
                        name: locations.start.name || extractName(locations.start.originalAddress || ''),
                        type: 'start' 
                    }
                ];
                
                // Add stops in optimized order
                for (const index of waypointOrder) {
                    orderedWaypoints.push({
                        address: locations.stops[index].address,
                        name: locations.stops[index].name || extractName(locations.stops[index].originalAddress || ''),
                        type: 'stop'
                    });
                }
                
                // Add destination
                orderedWaypoints.push({
                    address: locations.end.address,
                    name: locations.end.name || extractName(locations.end.originalAddress || ''),
                    type: 'end'
                });
                
                // Add debugging to see what names are actually being passed
                console.log("Ordered waypoints with names:", orderedWaypoints);
                
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
 * API usage monitoring and rate limiting
 */
const API_LIMITS = {
  // Daily limit for all users
  DAILY_LIMIT: 25,
  // Storage key
  STORAGE_KEY: 'driveless_api_usage',
};

/**
 * Checks if the user has exceeded their API usage limit
 * @returns {boolean} - Whether the user has exceeded their limit
 */
function hasExceededApiLimit() {
  const isAdmin = isAdminUser();
  if (isAdmin) return false; // Admin has unlimited usage
  
  const usageData = getApiUsage();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Initialize today's count if not exists
  if (!usageData[today]) {
    usageData[today] = 0;
  }
  
  // Check if exceeded limit
  return usageData[today] >= API_LIMITS.DAILY_LIMIT;
}

/**
 * Increments the API usage counter
 */
function incrementApiUsage() {
    // Don't increment usage for admin users
    if (isAdminUser()) {
      console.log("Admin user - not incrementing API usage");
      return;
    }
    
    const usageData = getApiUsage();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Initialize today's count if not exists
    if (!usageData[today]) {
      usageData[today] = 0;
    }
    
    // Increment count
    usageData[today]++;
    
    // Save back to storage
    localStorage.setItem(API_LIMITS.STORAGE_KEY, JSON.stringify(usageData));
    
    // Update the UI indicator
    updateUsageIndicator();
  }

/**
 * Gets the current API usage data
 * @returns {Object} - API usage data
 */
function getApiUsage() {
  const usageJson = localStorage.getItem(API_LIMITS.STORAGE_KEY);
  return usageJson ? JSON.parse(usageJson) : {};
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
    
    // Update stats with explicit icon HTML
    document.querySelector('#results-section .fa-route').outerHTML = '<i class="fas fa-route" style="display: inline-block; visibility: visible; opacity: 1; font-size: 1.25rem; color: #4caf50; margin-right: 0.75rem;"></i>';
    document.querySelector('#results-section .fa-clock').outerHTML = '<i class="fas fa-clock" style="display: inline-block; visibility: visible; opacity: 1; font-size: 1.25rem; color: #4caf50; margin-right: 0.75rem;"></i>';

    // Now update the text content
    totalDistance.textContent = route.totalDistance;
    estimatedTime.textContent = route.estimatedTime;
    
    // Display route on map
    directionsRenderer.setDirections(route.directionsResult);
    
    // Clear previous route list
    routeList.innerHTML = '';
    
// Inside the displayRouteResults function, modify the forEach loop:
// Inside the displayRouteResults function, modify the forEach loop:
route.waypoints.forEach((point, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'fade-in-up';
    listItem.style.animationDelay = `${index * 0.1}s`;
    
    let typeClass = '';
    if (point.type === 'start') typeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    else if (point.type === 'end') typeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    else typeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    
    // Prepare the display name and address
    let displayName = '';
    let displayAddress = point.address;
    
    // Default labels based on point type
    const defaultLabels = {
        'start': 'START',
        'stop': 'STOP',
        'end': 'END'
    };
    
    // Debug what point.name contains
    console.log(`Point ${index} name:`, point.name);
    
    // Always use the name if it exists, otherwise fall back to default label
    const nameToDisplay = point.name || defaultLabels[point.type];
    displayName = `<div class="stop-name font-medium">${nameToDisplay}</div>`;
    
    listItem.innerHTML = `
        <div class="stop-number">${index + 1}</div>
        <div class="stop-details">
            ${displayName}
            <div class="stop-address text-sm text-gray-600 dark:text-gray-400">${displayAddress}</div>
        </div>
        <div class="stop-type ${point.type} ${typeClass} text-xs font-medium px-2 py-1 rounded-full">${point.type}</div>
    `;
    
    routeList.appendChild(listItem);
});
    
    // Show results section
    inputSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
    
    // Refresh ads
    refreshAds();
    
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
 * Function to sanitize user input to prevent XSS attacks
 * @param {string} input - User provided input
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  // Basic sanitization - removes HTML tags and script
  return input.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Checks if the current user is an admin
 * @returns {boolean} - Whether the user is an admin
 */
function isAdminUser() {
  return localStorage.getItem('driveless_admin') === 'true';
}

/**
 * Sets up admin functionality
 */
function setupAdminFunctionality() {
    // Check if admin already
    if (isAdminUser()) {
      document.body.classList.add('admin-user');
      // Add logout button to header
      addAdminLogoutButton();
    }
    
    // Add admin login link to footer
    const footer = document.querySelector('footer');
    if (footer) {
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
    }
    
    // Set up admin login form
    const adminForm = document.getElementById('admin-login-form');
    const adminModal = document.getElementById('admin-login-modal');
    const cancelBtn = document.getElementById('admin-cancel-btn');
    
    if (adminForm && adminModal && cancelBtn) {
      adminForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        
        if (authenticateAdmin(password)) {
          // Successfully authenticated
          document.body.classList.add('admin-user');
          adminModal.classList.add('hidden');
          showAlert('Admin mode activated - ads disabled and API limits removed', 'success');
          addAdminLogoutButton(); // Add logout button after successful login
        } else {
          showAlert('Invalid admin password', 'error');
        }
      });
      
      cancelBtn.addEventListener('click', function() {
        adminModal.classList.add('hidden');
      });
    }
  }
  
  /**
   * Adds a logout button to the header for admin users
   */
  function addAdminLogoutButton() {
    // Check if button already exists
    if (document.getElementById('admin-logout-btn')) {
      return;
    }
    
    // Create logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'admin-logout-btn';
    logoutBtn.className = 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-4 text-sm';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt mr-1"></i> Admin Logout';
    
    // Add click event
    logoutBtn.addEventListener('click', function() {
      // Remove admin status
      localStorage.removeItem('driveless_admin');
      document.body.classList.remove('admin-user');
      
      // Remove logout button
      logoutBtn.remove();
      
      // Show confirmation
      showAlert('Admin mode deactivated', 'info');
      
      // Refresh ads
      refreshAds();
      
      // Update usage indicator
      updateUsageIndicator();
    });
    
    // Add to header next to the theme toggle
    const headerControls = document.querySelector('header .flex.items-center');
    if (headerControls) {
      headerControls.appendChild(logoutBtn);
    }
  }

// Add this function to app.js after the initializeGoogleMaps function

/**
 * Gets the user's current location using the Geolocation API
 */
function getCurrentLocation() {
    // Show a loading indicator
    const startLocationInput = document.getElementById('start-location');
    startLocationInput.value = 'Detecting your location...';
    startLocationInput.disabled = true;
    
    // Check if geolocation is available in the browser
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                console.log("Geolocation successful:", position);
                
                // Get coordinates
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Use reverse geocoding to get a readable address
                reverseGeocode(lat, lng);
            },
            // Error callback
            function(error) {
                startLocationInput.disabled = false;
                startLocationInput.value = '';
                
                console.error("Geolocation error:", error);
                
                let errorMessage = "Unable to get your location. ";
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "Please allow location access in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "The request to get your location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMessage += "An unknown error occurred.";
                        break;
                }
                
                showAlert(errorMessage, 'error');
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        // Browser doesn't support Geolocation
        startLocationInput.disabled = false;
        startLocationInput.value = '';
        showAlert("Geolocation is not supported by your browser. Please enter your address manually.", 'error');
    }
}

/**
 * Reverse geocodes coordinates to an address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function reverseGeocode(lat, lng) {
    console.log("Reverse geocoding coordinates:", lat, lng);
    
    const startLocationInput = document.getElementById('start-location');
    
    // Create a latlng object for the geocoder
    const latlng = new google.maps.LatLng(lat, lng);
    
    // Use the geocoder to get an address
    geocoder.geocode({ 'location': latlng }, function(results, status) {
        startLocationInput.disabled = false;
        
        if (status === 'OK') {
            if (results[0]) {
                // Use the most accurate address (usually the first result)
                const address = results[0].formatted_address;
                console.log("Reverse geocoded address:", address);
                
                // Set the input value
                startLocationInput.value = address;
                
                // Create a synthetic Place object for the autocomplete system to work with
                const place = {
                    address_components: results[0].address_components,
                    formatted_address: address,
                    geometry: {
                        location: latlng
                    },
                    place_id: results[0].place_id
                };
                
                // Trigger an event as if the autocomplete had selected this address
                const autocompleteInstance = autocompletes.find(a => a.id === 'start-location')?.instance;
                if (autocompleteInstance) {
                    google.maps.event.trigger(autocompleteInstance, 'place_changed');
                }
                
                showAlert("Your location has been detected successfully!", 'success');
            } else {
                startLocationInput.value = '';
                showAlert("No address found for your location. Please enter it manually.", 'error');
            }
        } else {
            startLocationInput.value = '';
            showAlert("Could not convert your coordinates to an address. Please enter it manually. Error: " + status, 'error');
        }
    });
}

/**
 * Get place details for an address marker
 * @param {Object} marker - Google Maps marker
 * @param {string} address - The address to look up
 */
function getPlaceInfo(marker, address) {
    // Create a place service
    const placesService = new google.maps.places.PlacesService(map);
    
    // Search for place by address
    placesService.findPlaceFromQuery({
        query: address,
        fields: ['name', 'formatted_address']
    }, function(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const place = results[0];
            
            // Create an info window with the place name if available
            const infoContent = place.name && place.name !== address 
                ? `<div><strong>${place.name}</strong><br>${address}</div>`
                : `<div>${address}</div>`;
                
            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });
            
            // Add click listener to show info window
            marker.addListener('click', function() {
                infoWindow.open(map, marker);
            });
        }
    });
}

/**
 * Attempts to authenticate as admin
 * @param {string} password - Admin password
 * @returns {boolean} - Whether authentication was successful
 */
function authenticateAdmin(password) {
    // Use a simple hash comparison for the demo version
    // In production, you'd use a more secure method and server-side verification
    const hashedPassword = "e62c40e04f5355250d7e349d0d1e5714"; // Hash for "pdxWaterMehn628!?"
    
    // Compare directly for the demo
    if (password === "pdxWaterMehn628!?") {
      localStorage.setItem('driveless_admin', 'true');
      return true;
    }
    return false;
  }
  
  // We're not using this function anymore, but keeping it for reference
  function hashPassword(password) {
    return password; // Not actually used in our implementation
  }

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