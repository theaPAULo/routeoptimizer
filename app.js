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

        // Add this line to initializeApp():
        setupRoundTripFeature();

        // Add this line to initializeApp():
        setupLocationButtons();
        
    
        setupTrafficConsideration();

        // Update usage indicator
        updateUsageIndicator();

        // Add this line to the initializeApp function, near the end
        cleanupGeocodeCache();

        // Add this line to the initializeApp function
        enhanceAccessibility();
                
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
            
            // Initialize the map with minimal controls
            map = new google.maps.Map(mapContainer, {
                center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                fullscreenControl: false,
                mapTypeControl: false,
                streetViewControl: false,
                zoomControl: false, // Remove zoom controls (+/-)
                gestureHandling: 'greedy' // Makes it easier to navigate on mobile
            });
            
            // Create directions renderer for displaying routes
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
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
   * Modifies the showInputSection function to refresh ads
   */
  function showInputSection() {
    inputSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
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

// Find the showAlert function (around line 354) and update it

/**
 * Shows an alert message to the user with improved styling and auto-dismissal
 * @param {string} message - The message to display
 * @param {string} type - The type of alert (error, success, info)
 * @param {number} duration - How long to show the alert in ms (default: 5000, 0 for no auto-dismiss)
 */
function showAlert(message, type = 'error', duration = 5000) {
    // Clear any existing timeout
    if (window.alertTimeout) {
        clearTimeout(window.alertTimeout);
    }
    
    const alertBox = document.getElementById('alert-box');
    
    // Add alert icon based on type
    let iconHTML = '';
    switch (type) {
        case 'error':
            iconHTML = '<i class="fas fa-exclamation-circle mr-2"></i>';
            break;
        case 'success':
            iconHTML = '<i class="fas fa-check-circle mr-2"></i>';
            break;
        case 'info':
            iconHTML = '<i class="fas fa-info-circle mr-2"></i>';
            break;
    }
    
    // Set alert content with icon
    alertBox.innerHTML = `
        <div class="flex items-center">
            ${iconHTML}
            <span>${sanitizeInput(message)}</span>
        </div>
        ${duration > 0 ? '<button class="ml-auto text-sm opacity-70 hover:opacity-100" onclick="dismissAlert()"><i class="fas fa-times"></i></button>' : ''}
    `;
    
    alertBox.className = `${type} mb-4 p-4 rounded-md fade-in flex items-center`;
    alertBox.classList.remove('hidden');
    
    // Add accessibility attribute
    alertBox.setAttribute('role', 'alert');
    
    // Automatically hide after specified duration (if not 0)
    if (duration > 0) {
        window.alertTimeout = setTimeout(() => {
            dismissAlert();
        }, duration);
    }
}

// Add this function after the initializeApp function:

/**
 * Enhances accessibility features throughout the app
 */
function enhanceAccessibility() {
    console.log("Enhancing accessibility features...");
    
    // Add ARIA labels to interactive elements
    document.querySelectorAll('button:not([aria-label])').forEach(button => {
        // Try to infer label from inner text or icon
        const text = button.textContent.trim();
        if (text) {
            button.setAttribute('aria-label', text);
        } else if (button.querySelector('i.fas, i.fa')) {
            const icon = button.querySelector('i.fas, i.fa');
            const iconClass = Array.from(icon.classList)
                .find(cls => cls.startsWith('fa-'));
            
            if (iconClass) {
                const label = iconClass.replace('fa-', '').replace(/-/g, ' ');
                button.setAttribute('aria-label', label);
            }
        }
    });
    
    // Make sure form fields have associated labels
    document.querySelectorAll('input, select, textarea').forEach(field => {
        // Skip fields that already have explicit labels
        if (document.querySelector(`label[for="${field.id}"]`)) {
            return;
        }
        
        // Check for parent label
        const parentLabel = field.closest('label');
        if (!parentLabel && field.id) {
            // Try to find a label-like element nearby
            const container = field.closest('div');
            if (container) {
                const labelText = container.querySelector('.text-sm, .font-medium');
                if (labelText) {
                    // Create a proper label and associate it
                    const newLabel = document.createElement('label');
                    newLabel.setAttribute('for', field.id);
                    newLabel.className = labelText.className;
                    newLabel.innerHTML = labelText.innerHTML;
                    container.insertBefore(newLabel, labelText);
                    labelText.remove();
                }
            }
        }
    });
    
    // Add keyboard navigation to interactive components
    const stopItems = document.querySelectorAll('.stop-item');
    stopItems.forEach((item, index) => {
        const inputs = item.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.setAttribute('tabindex', '0');
        });
    });
}



/**
 * Dismisses the alert box with animation
 */
function dismissAlert() {
    const alertBox = document.getElementById('alert-box');
    alertBox.style.opacity = '0';
    
    setTimeout(() => {
        alertBox.classList.add('hidden');
        alertBox.style.opacity = '1';
    }, 300);
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
        
        // Check if traffic consideration is enabled
        const considerTraffic = document.getElementById('consider-traffic-checkbox')?.checked;
        
        // Choose the appropriate route calculation method
        let routeResult;
        if (considerTraffic) {
            routeResult = await calculateTrafficAwareOptimizedRoute(locations);
        } else {
            routeResult = await calculateOptimizedRoute(locations);
        }
        
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

// In app.js, find the geocodeAddress function (around line 405)
// Update the caching mechanism to include expiration

function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        console.log("Geocoding address:", address);
        
        // Check cache first
        const cacheKey = `geocode_${address}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const cachedData = JSON.parse(cached);
            // Add cache expiration check (1 week)
            const now = new Date().getTime();
            const cacheTime = cachedData.timestamp || 0;
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            
            if (now - cacheTime < oneWeek) {
                console.log("Using cached geocoding result");
                resolve(cachedData.result);
                return;
            } else {
                console.log("Cached geocoding result expired");
                // Continue to fetch fresh data
            }
        }
        
        // Not in cache or expired, use Google API
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
                
                // Cache the result with timestamp
                localStorage.setItem(cacheKey, JSON.stringify({
                    result: result,
                    timestamp: new Date().getTime()
                }));
                
                resolve(result);
            } else {
                console.error('Geocoding failed for address:', address, status);
                resolve(null);
            }
        });
    });
}

// Add this function after the geocodeAddress function

/**
 * Cleans up old geocoding cache entries
 * @param {number} maxAge - Maximum age in milliseconds (default: 30 days)
 */
function cleanupGeocodeCache(maxAge = 30 * 24 * 60 * 60 * 1000) {
    console.log("Cleaning up geocode cache...");
    const now = new Date().getTime();
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Only process geocode cache entries
        if (key && key.startsWith('geocode_')) {
            try {
                const cached = JSON.parse(localStorage.getItem(key));
                const cacheTime = cached.timestamp || 0;
                
                // Remove if older than maxAge
                if (now - cacheTime > maxAge) {
                    console.log(`Removing expired cache entry: ${key}`);
                    localStorage.removeItem(key);
                }
            } catch (error) {
                // If entry is corrupted, remove it
                console.error(`Error processing cache entry ${key}:`, error);
                localStorage.removeItem(key);
            }
        }
    }
}


function calculateOptimizedRoute(locations) {
    return new Promise((resolve, reject) => {
        console.log("Calculating optimized route...");
        
        // For the Google Directions API, we need to optimize waypoint order
        const waypoints = locations.stops.map(stop => ({
            location: stop.location,
            stopover: true
        }));
        
        // Check if traffic consideration is enabled
        const considerTraffic = document.getElementById('consider-traffic-checkbox')?.checked;
        console.log("Consider traffic:", considerTraffic);
        
        // Create the base request
        const request = {
            origin: locations.start.location,
            destination: locations.end.location,
            waypoints: waypoints,
            optimizeWaypoints: true, // This is key for route optimization
            travelMode: google.maps.TravelMode.DRIVING
        };
        
        // Add traffic options if enabled
        if (considerTraffic) {
            // Set departure time to now (required for traffic consideration)
            request.drivingOptions = {
                departureTime: new Date(),
                trafficModel: google.maps.TrafficModel.BEST_GUESS
            };
            
            console.log("Traffic options applied with departure time:", request.drivingOptions.departureTime);
        }
        
        console.log("Direction request:", request);
        
        directionsService.route(request, (result, status) => {
            console.log("Directions service response:", status);
            
            if (status === 'OK') {
                // Check if traffic data is included in the response
                const hasTrafficData = result.routes[0].legs.some(leg => leg.duration_in_traffic);
                console.log("Response includes traffic data:", hasTrafficData);
                
                if (considerTraffic && !hasTrafficData) {
                    console.warn("Traffic consideration was requested but no traffic data was returned by Google API");
                }
                
                // Process route data
                const legs = result.routes[0].legs;
                const waypointOrder = result.routes[0].waypoint_order;
                
                // Calculate total distance and time
                let totalDistanceMeters = 0;
                let totalDurationSeconds = 0;
                
                for (const leg of legs) {
                    totalDistanceMeters += leg.distance.value;
                    
                    // Use duration_in_traffic if available and traffic consideration is enabled
                    if (considerTraffic && leg.duration_in_traffic) {
                        totalDurationSeconds += leg.duration_in_traffic.value;
                        console.log(`Using traffic duration for leg: ${leg.duration_in_traffic.text} instead of ${leg.duration.text}`);
                    } else {
                        totalDurationSeconds += leg.duration.value;
                    }
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
 * Sets up the traffic consideration checkbox functionality
 */
function setupTrafficConsideration() {
    const trafficCheckbox = document.getElementById('consider-traffic-checkbox');
    
    if (!trafficCheckbox) {
        console.error("Could not find traffic consideration checkbox");
        return;
    }
    
    // Set default to checked (use traffic data)
    if (localStorage.getItem('driveless_use_traffic') !== null) {
        // Use saved preference
        trafficCheckbox.checked = localStorage.getItem('driveless_use_traffic') === 'true';
    } else {
        // Default to true if no preference saved
        trafficCheckbox.checked = true;
    }
    
    // Save preference when changed
    trafficCheckbox.addEventListener('change', function() {
        localStorage.setItem('driveless_use_traffic', this.checked);
    });
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
 * Modifies the displayRouteResults function to include our enhancements
 * @param {Object} route - The optimized route data
 */
// Update displayRouteResults function to fix duplicate indicators
function displayRouteResults(route) {
    console.log("Displaying route results:", route);
    
    // Store current route
    currentRoute = route;
    
    // End loading state
    toggleLoadingState(false);
    
    // Update stats
    totalDistance.textContent = route.totalDistance;
    estimatedTime.textContent = route.estimatedTime;
    
    // Display route on map with custom styling
    directionsRenderer.setOptions({
        polylineOptions: {
            strokeColor: '#4f46e5', // Indigo color
            strokeWeight: 5,
            strokeOpacity: 0.6
        }
    });
    
    // Check if this is a traffic route with our synthetic result structure
if (route.trafficConsidered) {
    // For traffic routes with synthetic result, we need to ensure the path is properly created
    // Set up polyline manually if needed
    if (!route.directionsResult.routes[0].overview_path || 
        route.directionsResult.routes[0].overview_path.length === 0) {
        
        console.log("Creating manual polyline for traffic route");
        
        // Get all the points from the legs
        const path = [];
        route.directionsResult.routes[0].legs.forEach(leg => {
            path.push(leg.start_location);
            path.push(leg.end_location);
        });
        
        // Clear existing polyline if any
        if (window.trafficPolyline) {
            window.trafficPolyline.setMap(null);
        }
        
        // Create a new polyline
        window.trafficPolyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#4f46e5',
            strokeOpacity: 0.7,
            strokeWeight: 5,
            map: map
        });
        
        // Set empty directions to prevent conflicts
        directionsRenderer.setDirections({routes: []});
    } else {
        // Use directions renderer normally
        directionsRenderer.setDirections(route.directionsResult);
        
        // Clear any manual polyline
        if (window.trafficPolyline) {
            window.trafficPolyline.setMap(null);
            window.trafficPolyline = null;
        }
    }
} else {
    // Standard route display
    directionsRenderer.setDirections(route.directionsResult);
    
    // Clear any manual polyline
    if (window.trafficPolyline) {
        window.trafficPolyline.setMap(null);
        window.trafficPolyline = null;
    }
}
    
    // Clear previous route list
    routeList.innerHTML = '';
    
    // Remove any existing traffic indicators
    const existingIndicators = document.querySelectorAll('.traffic-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Check if traffic was considered
    const trafficConsidered = document.getElementById('consider-traffic-checkbox')?.checked;
    
    if (trafficConsidered) {
        // Add a traffic indicator
        const trafficIndicator = document.createElement('div');
        trafficIndicator.className = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-2 rounded text-sm mb-4 traffic-indicator';
        trafficIndicator.innerHTML = '<i class="fas fa-traffic-light mr-2"></i> Route optimized with current traffic conditions';
        
        // Insert it before the map container
        const mapContainer = document.getElementById('map-container');
        mapContainer.parentNode.insertBefore(trafficIndicator, mapContainer);
    }
    directionsRenderer.setDirections(route.directionsResult);
    
    // Clear previous route list
    routeList.innerHTML = '';
    
// Add route points to list
route.waypoints.forEach((point, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'fade-in-up';
    listItem.style.animationDelay = `${index * 0.1}s`;
    
    let typeClass = '';
    if (point.type === 'start') typeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    else if (point.type === 'end') typeClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    else typeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    
    // Prepare the display name and address
    let displayName = '';
    let displayAddress = point.address;
    
    // Default labels based on point type
    const defaultLabels = {
        'start': 'START',
        'stop': 'STOP',
        'end': 'END'
    };
    
    // Always use the name if it exists, otherwise fall back to default label
    const nameToDisplay = point.name || defaultLabels[point.type];
    displayName = `<div class="stop-name font-medium">${nameToDisplay}</div>`;
    
    // Create Google Maps link for the address
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address)}`;
    
    // Add leg details - we'll adjust this logic:
    // For the first point (index 0), don't show leg details
    // For points in between, show leg details from previous to current point
    // For the last point, show leg details from second-last to last point
    let legDetails = '';
    
    const legs = route.directionsResult.routes[0].legs;
    
    if (index > 0 && index - 1 < legs.length) {
        // For all points except the first, show leg details from previous point
        const leg = legs[index - 1];
        legDetails = `
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                <span class="flex items-center mr-2">
                    <i class="fas fa-route text-primary-600 dark:text-primary-400 mr-1"></i>
                    ${leg.distance.text}
                </span>
                <span class="flex items-center">
                    <i class="fas fa-clock text-primary-600 dark:text-primary-400 mr-1"></i>
                    ${leg.duration.text}
                </span>
            </div>
        `;
    }
    
    listItem.innerHTML = `
        <div class="stop-number">${index + 1}</div>
        <div class="stop-details">
            ${displayName}
            <a href="${googleMapsUrl}" target="_blank" class="stop-address text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">${displayAddress}</a>
            ${legDetails}
        </div>
        <div class="stop-type ${point.type} ${typeClass} text-xs font-medium px-2 py-1 rounded-full">${point.type.toUpperCase()}</div>
    `;
    
    routeList.appendChild(listItem);
});
    
    // Show results section
    inputSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
    
    // Add map controls
    addMapControls();
    
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
        
        // Add custom markers with enhanced info windows
        addRouteMarkers(route);
    }, 100);
}

// Modify calculateTrafficAwareOptimizedRoute to properly handle traffic data
function calculateTrafficAwareOptimizedRoute(locations) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("Calculating traffic-aware optimized route...");
            
            // First get the optimized waypoint order without traffic consideration
            const optimizedRoute = await getOptimizedWaypointOrder(locations);
            console.log("Optimized waypoint order:", optimizedRoute.waypointOrder);
            
            // Now use that order to calculate each leg with traffic 
            const orderedStops = optimizedRoute.waypointOrder.map(index => locations.stops[index]);
            
            // Create the full sequence: start -> all stops in order -> end
            const fullSequence = [locations.start, ...orderedStops, locations.end];
            
            // Calculate each leg separately with traffic consideration
            const legs = [];
            let totalDistanceMeters = 0;
            let totalDurationSeconds = 0;
            
            for (let i = 0; i < fullSequence.length - 1; i++) {
                const origin = fullSequence[i];
                const destination = fullSequence[i + 1];
                
                console.log(`Calculating leg ${i + 1} with traffic: ${origin.address} to ${destination.address}`);
                
                // This is the key part - calculate each leg WITHOUT stopovers to get traffic data
                const legResult = await calculateSingleLeg(origin, destination, true);
                
                // Important debug info - check if duration_in_traffic was returned
                if (legResult.duration_in_traffic) {
                    console.log(`Leg ${i + 1} has traffic data: ${legResult.duration_in_traffic.text} vs regular ${legResult.duration.text}`);
                    totalDurationSeconds += legResult.duration_in_traffic.value;
                } else {
                    console.log(`Leg ${i + 1} has NO traffic data, using regular duration: ${legResult.duration.text}`);
                    totalDurationSeconds += legResult.duration.value;
                }
                
                legs.push(legResult);
                totalDistanceMeters += legResult.distance.value;
            }
            
            // Format the result to match the expected format
            const route = formatResultFromLegs(legs, optimizedRoute.waypointOrder, locations, totalDistanceMeters, totalDurationSeconds);
            
            resolve(route);
        } catch (error) {
            console.error("Error calculating traffic-aware route:", error);
            reject(error);
        }
    });
}

// Ensure the calculateSingleLeg function properly sets the departureTime
function calculateSingleLeg(origin, destination, considerTraffic) {
    return new Promise((resolve, reject) => {
        const request = {
            origin: origin.location,
            destination: destination.location,
            travelMode: google.maps.TravelMode.DRIVING
        };
        
        if (considerTraffic) {
            // MUST use the current time as departure time to get real-time traffic
            request.drivingOptions = {
                departureTime: new Date(), // Current time
                trafficModel: google.maps.TrafficModel.BEST_GUESS
            };
        }
        
        directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                const leg = result.routes[0].legs[0];
                
                // Debug - check if traffic data is returned
                if (considerTraffic) {
                    console.log("Traffic data returned:", !!leg.duration_in_traffic);
                    if (leg.duration_in_traffic) {
                        console.log(`Regular time: ${leg.duration.text}, With traffic: ${leg.duration_in_traffic.text}`);
                    }
                }
                
                resolve(leg);
            } else {
                console.error(`Failed to calculate leg: ${status}`);
                reject(new Error(`Failed to calculate leg: ${status}`));
            }
        });
    });
}

/**
 * Gets the optimized waypoint order without traffic consideration
 */
function getOptimizedWaypointOrder(locations) {
    return new Promise((resolve, reject) => {
        const waypoints = locations.stops.map(stop => ({
            location: stop.location,
            stopover: true
        }));
        
        const request = {
            origin: locations.start.location,
            destination: locations.end.location,
            waypoints: waypoints,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING
        };
        
        directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                resolve({
                    waypointOrder: result.routes[0].waypoint_order,
                    result: result
                });
            } else {
                reject(new Error(`Failed to get optimized order: ${status}`));
            }
        });
    });
}

function formatResultFromLegs(legs, waypointOrder, locations, totalDistanceMeters, totalDurationSeconds) {
    // Format distance and duration
    const totalDistanceMiles = (totalDistanceMeters / 1609.34).toFixed(1);
    let durationText;
    
    if (totalDurationSeconds >= 3600) {
        const hours = Math.floor(totalDurationSeconds / 3600);
        const minutes = Math.round((totalDurationSeconds % 3600) / 60);
        durationText = `${hours} hr ${minutes} min`;
    } else {
        durationText = `${Math.round(totalDurationSeconds / 60)} min`;
    }
    
    // Create ordered waypoints list
    const orderedWaypoints = [
        { 
            address: locations.start.address,
            name: locations.start.name || extractBusinessName(locations.start.originalAddress || ''),
            type: 'start' 
        }
    ];
    
    // Add stops in optimized order
    for (const index of waypointOrder) {
        orderedWaypoints.push({
            address: locations.stops[index].address,
            name: locations.stops[index].name || extractBusinessName(locations.stops[index].originalAddress || ''),
            type: 'stop'
        });
    }
    
    // Add destination
    orderedWaypoints.push({
        address: locations.end.address,
        name: locations.end.name || extractBusinessName(locations.end.originalAddress || ''),
        type: 'end'
    });
    
    // Create a proper synthetic directions result for compatibility with DirectionsRenderer
    // This is key to making the route display on the map
    const syntheticResult = {
        routes: [{
            legs: legs,
            waypoint_order: waypointOrder,
            overview_path: createOverviewPath(legs), // Add this to create a path for the renderer
            bounds: calculateBounds(legs) // Add this to properly set the map bounds
        }]
    };
    
    return {
        totalDistance: `${totalDistanceMiles} miles`,
        estimatedTime: durationText,
        waypoints: orderedWaypoints,
        directionsResult: syntheticResult,
        trafficConsidered: true
    };
}

/**
 * Creates an overview path from leg steps for route drawing
 * @param {Array} legs - Route legs
 * @returns {Array} - Combined path
 */
function createOverviewPath(legs) {
    const path = [];
    
    legs.forEach(leg => {
        // Each leg has steps, each step has a path
        if (leg.steps) {
            leg.steps.forEach(step => {
                if (step.path) {
                    // Add all path points
                    path.push(...step.path);
                } else if (step.start_location && step.end_location) {
                    // Fallback to just start and end points if no path
                    path.push(step.start_location);
                    path.push(step.end_location);
                }
            });
        } else {
            // Fallback if no steps, just use leg start and end
            path.push(leg.start_location);
            path.push(leg.end_location);
        }
    });
    
    return path;
}

/**
 * Calculates bounds for the entire route
 * @param {Array} legs - Route legs
 * @returns {Object} - Google Maps bounds object
 */
function calculateBounds(legs) {
    const bounds = new google.maps.LatLngBounds();
    
    legs.forEach(leg => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
        
        // Include all step points for more accurate bounds
        if (leg.steps) {
            leg.steps.forEach(step => {
                if (step.path) {
                    step.path.forEach(point => {
                        bounds.extend(point);
                    });
                }
            });
        }
    });
    
    return bounds;
}

/**
 * Adds custom markers for each waypoint with enhanced info windows
 * @param {Object} route - The route object with waypoint data
 */
function addRouteMarkers(route) {
    // Clear existing markers if any
    if (window.routeMarkers) {
        window.routeMarkers.forEach(marker => marker.setMap(null));
    }
    window.routeMarkers = [];
    
    // Clear any open info window
    if (window.currentInfoWindow) {
        window.currentInfoWindow.close();
    }
    
    // Get route legs for positions
    const legs = route.directionsResult.routes[0].legs;
    
    // Add marker for each waypoint
    route.waypoints.forEach((point, index) => {
        let position;
        let labelText = (index + 1).toString();
        
        if (index === 0) {
            // Start location
            position = legs[0].start_location;
        } else if (index === route.waypoints.length - 1) {
            // End location
            position = legs[legs.length - 1].end_location;
        } else {
            // Intermediate stop - use the destination of the previous leg
            position = legs[index - 1].end_location;
        }
        
        // Create custom marker
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            icon: createCustomMarkerIcon(labelText, point.type),
            title: point.name || point.address.split(',')[0],
            zIndex: 999 - index // Higher z-index for start and lower for subsequent points
        });
        
        // Create enhanced info window - pass all legs
        const infoContent = createEnhancedInfoWindow(point, index, legs);
        
        // Create info window
        const infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            disableAutoPan: false
        });
        
        // Add click listener
        marker.addListener('click', () => {
            // Close any open info window
            if (window.currentInfoWindow) {
                window.currentInfoWindow.close();
            }
            
            // Open this info window
            infoWindow.open(map, marker);
            window.currentInfoWindow = infoWindow;
            
            // Ensure the map is centered on this marker
            map.panTo(marker.getPosition());
        });
        
        // Store marker for later reference
        window.routeMarkers.push(marker);
    });
    
    // Add route animation and direction arrows
    const cleanupAnimation = enhanceRouteDisplay(route.directionsResult);
    
    // Store cleanup function
    window.cleanupRouteAnimation = cleanupAnimation;
}

/**
 * Applies animation and direction arrows to the route
 * @param {Object} result - The directions result
 */
function enhanceRouteDisplay(result) {
    // Clear any existing animation polylines
    if (window.animatedPolylines) {
        window.animatedPolylines.forEach(poly => poly.setMap(null));
    }
    window.animatedPolylines = [];
    
    // Clear any existing direction arrows
    if (window.directionArrows) {
        window.directionArrows.forEach(arrow => arrow.setMap(null));
    }
    window.directionArrows = [];
    
    // Get the routes and path points
    const routes = result.routes[0];
    const path = routes.overview_path;
    
    // Create an animated polyline
    const animatedLine = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#4f46e5', // Indigo color
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map,
        icons: [{
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#ffffff',
                fillOpacity: 1,
                scale: 3,
                strokeColor: '#ffffff',
                strokeWeight: 1
            },
            repeat: '80px',
            offset: '0'
        }]
    });
    
    // Animate the line
    animatedLine.setPath(path);
    window.animatedPolylines.push(animatedLine);
    
    // Animate dash
    let count = 0;
    window.routeAnimation = window.setInterval(() => {
        count = (count + 1) % 200;
        
        const icons = animatedLine.get('icons');
        icons[0].offset = (count / 2) + 'px';
        animatedLine.set('icons', icons);
    }, 30);
    
    // Add direction arrows - but much fewer of them (every 20 points instead of 5)
    // We'll also add a minimum distance check to avoid cluttering
    const arrowSpacing = Math.max(20, Math.floor(path.length / 5)); // Maximum of 5 arrows on the path
    
    for (let i = 0; i < path.length - 1; i += arrowSpacing) {
        // Skip if i+1 would be out of bounds
        if (i + 1 >= path.length) continue;
        
        // Calculate position for arrow (midpoint between two path points)
        const p1 = path[i];
        const p2 = path[i + 1];
        
        // Calculate heading/bearing
        const heading = google.maps.geometry.spherical.computeHeading(p1, p2);
        
        // Create the arrow marker
        const arrowMarker = new google.maps.Marker({
            position: google.maps.geometry.spherical.interpolate(p1, p2, 0.5),
            map: map,
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                fillColor: '#ffffff',
                fillOpacity: 1,
                strokeColor: '#4f46e5',
                strokeWeight: 2,
                rotation: heading
            },
            clickable: false
        });
        
        window.directionArrows.push(arrowMarker);
    }
    
    // Make sure we clean up the animation when changing routes
    return () => {
        if (window.routeAnimation) {
            window.clearInterval(window.routeAnimation);
        }
    };
}

/**
 * Creates an enhanced info window for markers with scrolling capability
 * @param {Object} point - Waypoint data
 * @param {number} index - Index in the route
 * @param {Object} legs - All route leg data
 * @returns {string} - HTML content for the info window
 */
function createEnhancedInfoWindow(point, index, legs) {
    // Determine marker type label and color
    let typeLabel, typeColorClass;
    switch (point.type) {
        case 'start':
            typeLabel = 'Starting Point';
            typeColorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            break;
        case 'end':
            typeLabel = 'Destination';
            typeColorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            break;
        default:
            typeLabel = 'Stop';
            typeColorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
    
    // Add leg details - similar to the route list logic:
    // For the first point (index 0), don't show leg details
    // For all other points, show leg details from previous to current point
    let legDetails = '';
    
    if (index > 0 && index - 1 < legs.length) {
        // For all points except the first, show leg details from previous point
        const leg = legs[index - 1];
        legDetails = `
            <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center text-sm mt-1">
                    <i class="fas fa-route text-primary-600 mr-2"></i>
                    <span class="font-medium">Distance:</span>
                    <span class="ml-1">${leg.distance.text}</span>
                </div>
                <div class="flex items-center text-sm mt-1">
                    <i class="fas fa-clock text-primary-600 mr-2"></i>
                    <span class="font-medium">Time:</span>
                    <span class="ml-1">${leg.duration.text}</span>
                </div>
            </div>
        `;
    }
    
    // Create the info window content with a scrollable container
    return `
        <div class="info-window" style="font-family: 'Poppins', sans-serif; max-height: 250px; min-width: 250px; max-width: 300px; overflow-y: auto; overflow-x: hidden; padding: 0;">
            <div class="p-3">
                <div class="flex justify-between items-start">
                    <div class="font-semibold text-lg">${point.name || point.address.split(',')[0]}</div>
                    <div class="text-xs px-2 py-1 rounded-full ${typeColorClass}">
                        ${typeLabel}
                    </div>
                </div>
                
                <div class="address text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ${point.address}
                </div>
                
                ${legDetails}
                
                <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address)}" 
                       target="_blank" 
                       class="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 flex items-center">
                       <i class="fas fa-map-marked-alt mr-1"></i> View in Google Maps
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Adds custom controls to the map
 */
function addMapControls() {
    // Wait for the map to be fully initialized
    setTimeout(() => {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        const mapElement = mapContainer.querySelector('div[role="region"]');
        if (!mapElement) return;
        
        // Create control container
        const controlContainer = document.createElement('div');
        controlContainer.className = 'map-custom-controls';
        controlContainer.style.position = 'absolute';
        controlContainer.style.top = '10px';
        controlContainer.style.right = '10px';
        controlContainer.style.zIndex = '1';
        controlContainer.style.display = 'flex';
        controlContainer.style.flexDirection = 'column';
        controlContainer.style.gap = '5px';
        
        // Traffic toggle button
        const trafficBtn = document.createElement('div');
        trafficBtn.className = 'bg-white dark:bg-gray-800 rounded-md shadow-md p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700';
        trafficBtn.innerHTML = '<i class="fas fa-car"></i>';
        trafficBtn.setAttribute('title', 'Toggle traffic');
        
        trafficBtn.addEventListener('click', toggleTrafficLayer);
        
        // Reset view button
        const resetViewBtn = document.createElement('div');
        resetViewBtn.className = 'bg-white dark:bg-gray-800 rounded-md shadow-md p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700';
        resetViewBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
        resetViewBtn.setAttribute('title', 'Reset view');
        
        resetViewBtn.addEventListener('click', resetMapView);
        
        // Add buttons to container
        controlContainer.appendChild(trafficBtn);
        controlContainer.appendChild(resetViewBtn);
        
        // Add container to map
        mapElement.appendChild(controlContainer);
    }, 1000);
}

/**
 * Toggles traffic layer on the map
 */
function toggleTrafficLayer() {
    if (!map) return;
    
    if (!window.trafficLayer) {
        window.trafficLayer = new google.maps.TrafficLayer();
        window.trafficLayer.setMap(map);
        showAlert('Traffic information enabled', 'info', 2000);
    } else {
        const isVisible = window.trafficLayer.getMap() !== null;
        window.trafficLayer.setMap(isVisible ? null : map);
        showAlert(isVisible ? 'Traffic information disabled' : 'Traffic information enabled', 'info', 2000);
    }
}

/**
 * Resets the map view to show the entire route
 */
function resetMapView() {
    if (!map || !currentRoute) return;
    
    const bounds = new google.maps.LatLngBounds();
    
    // Add all waypoints to bounds
    currentRoute.directionsResult.routes[0].legs.forEach(leg => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
    });
    
    // Fit map to bounds with some padding
    map.fitBounds(bounds, { padding: 50 });
    showAlert('Map view reset', 'info', 2000);
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
 * Creates a custom marker icon for route stops
 * @param {string} label - Text to display on marker
 * @param {string} type - Type of marker (start, stop, end)
 * @returns {Object} - Google Maps Icon configuration
 */
function createCustomMarkerIcon(label, type) {
    // Define colors based on type
    let backgroundColor, borderColor, textColor;
    
    switch (type) {
        case 'start':
            backgroundColor = '#4ade80'; // Green
            borderColor = '#16a34a';
            textColor = '#ffffff';
            break;
        case 'end':
            backgroundColor = '#f87171'; // Red
            borderColor = '#dc2626';
            textColor = '#ffffff';
            break;
        default:
            backgroundColor = '#60a5fa'; // Blue
            borderColor = '#2563eb';
            textColor = '#ffffff';
            break;
    }
    
    // Create a canvas element to draw the marker
    const canvas = document.createElement('canvas');
    const size = 36; // Increased size for better visibility
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    // Draw circle background
    context.beginPath();
    context.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
    context.fillStyle = backgroundColor;
    context.fill();
    
    // Draw border
    context.lineWidth = 2;
    context.strokeStyle = borderColor;
    context.stroke();
    
    // Draw text
    context.font = 'bold 16px Arial';
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, size/2, size/2);
    
    return {
        url: canvas.toDataURL(),
        size: new google.maps.Size(size, size),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(size/2, size/2),
        scaledSize: new google.maps.Size(size, size)
    };
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
      
      // Update usage indicator
      updateUsageIndicator();
    });
    
    // Add to header next to the theme toggle
    const headerControls = document.querySelector('header .flex.items-center');
    if (headerControls) {
      headerControls.appendChild(logoutBtn);
    }
  }

/**
 * Gets the user's current location using the Geolocation API
 * @param {string} targetInputId - ID of the input to populate (default: 'start-location')
 */
function getCurrentLocation(targetInputId = 'start-location') {
    // Determine which input we're targeting
    const targetInput = document.getElementById(targetInputId);
    if (!targetInput) {
        console.error(`Target input with ID ${targetInputId} not found`);
        return;
    }
    
    // Show a loading indicator
    targetInput.value = 'Detecting your location...';
    targetInput.disabled = true;
    
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
                reverseGeocode(lat, lng, targetInputId);
            },
            // Error callback
            function(error) {
                targetInput.disabled = false;
                targetInput.value = '';
                
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
        targetInput.disabled = false;
        targetInput.value = '';
        showAlert("Geolocation is not supported by your browser. Please enter your address manually.", 'error');
    }
}

/**
 * Reverse geocodes coordinates to an address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} targetInputId - ID of the input to populate
 */
function reverseGeocode(lat, lng, targetInputId = 'start-location') {
    console.log("Reverse geocoding coordinates:", lat, lng, "for input:", targetInputId);
    
    const targetInput = document.getElementById(targetInputId);
    
    // Create a latlng object for the geocoder
    const latlng = new google.maps.LatLng(lat, lng);
    
    // Use the geocoder to get an address
    geocoder.geocode({ 'location': latlng }, function(results, status) {
        targetInput.disabled = false;
        
        if (status === 'OK') {
            if (results[0]) {
                // Use the most accurate address (usually the first result)
                const address = results[0].formatted_address;
                console.log("Reverse geocoded address:", address);
                
                // Set the input value
                targetInput.value = address;
                
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
                const autocompleteInstance = autocompletes.find(a => a.id === targetInputId)?.instance;
                if (autocompleteInstance) {
                    google.maps.event.trigger(autocompleteInstance, 'place_changed');
                }
                
                // If this is the start location and round trip is checked, update end location too
                if (targetInputId === 'start-location') {
                    const roundTripCheckbox = document.getElementById('round-trip-checkbox');
                    if (roundTripCheckbox && roundTripCheckbox.checked) {
                        const endLocationInput = document.getElementById('end-location');
                        if (endLocationInput) {
                            endLocationInput.value = address;
                        }
                    }
                }
                
                showAlert("Your location has been detected successfully!", 'success');
            } else {
                targetInput.value = '';
                showAlert("No address found for your location. Please enter it manually.", 'error');
            }
        } else {
            targetInput.value = '';
            showAlert("Could not convert your coordinates to an address. Please enter it manually. Error: " + status, 'error');
        }
    });
}

/**
 * Sets up the "Use My Location" buttons
 */
function setupLocationButtons() {
    // Start location button
    const useLocationBtn = document.getElementById('use-location-btn');
    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', function() {
            getCurrentLocation('start-location');
        });
    }
    
    // End location button
    const useLocationBtnEnd = document.getElementById('use-location-btn-end');
    if (useLocationBtnEnd) {
        useLocationBtnEnd.addEventListener('click', function() {
            getCurrentLocation('end-location');
        });
    }
}

// Replace your existing location button setup code with a call to this function
// in your initializeApp function



/**
 * Handles the round trip checkbox functionality
 */
function setupRoundTripFeature() {
    const roundTripCheckbox = document.getElementById('round-trip-checkbox');
    const startLocationInput = document.getElementById('start-location');
    const endLocationInput = document.getElementById('end-location');
    
    if (!roundTripCheckbox || !startLocationInput || !endLocationInput) {
        console.error("Could not find required elements for round trip feature");
        return;
    }
    
    // Store the original end location value when toggling
    let savedEndLocation = '';
    
    roundTripCheckbox.addEventListener('change', function() {
        if (this.checked) {
            // Save current end location before overwriting it
            savedEndLocation = endLocationInput.value;
            
            // Set end location to match start location
            endLocationInput.value = startLocationInput.value;
            
            // Disable end location input
            endLocationInput.disabled = true;
            endLocationInput.classList.add('bg-gray-100', 'dark:bg-gray-600');
        } else {
            // Restore previous end location
            endLocationInput.value = savedEndLocation;
            
            // Re-enable end location input
            endLocationInput.disabled = false;
            endLocationInput.classList.remove('bg-gray-100', 'dark:bg-gray-600');
        }
    });
    
    // Update end location when start location changes (if round trip is checked)
    startLocationInput.addEventListener('change', function() {
        if (roundTripCheckbox.checked) {
            endLocationInput.value = this.value;
        }
    });
    
    // Also listen for input from autocomplete selections
    startLocationInput.addEventListener('blur', function() {
        setTimeout(() => {
            if (roundTripCheckbox.checked && startLocationInput.value !== endLocationInput.value) {
                endLocationInput.value = startLocationInput.value;
            }
        }, 300); // Small delay to allow autocomplete to finish
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
    // Setup admin keyboard shortcut (Ctrl+Shift+A)
document.addEventListener('keydown', function(event) {
    // Check for Ctrl+Shift+A
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        // Show admin login modal
        document.getElementById('admin-login-modal').classList.remove('hidden');
    }
});
});