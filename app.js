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
        
        // Add first stop input
        addStopInput();
        
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
 * Enables drag and drop functionality for stop items - simplified version
 */
function enableDragAndDrop() {
    console.log("Setting up simplified drag and drop");
    
    // Get the stops container
    const container = document.getElementById('stops-container');
    
    // Variables to track dragging state
    let draggedItem = null;
    
    // Function to update the drag and drop capability on all stops
    function setupDragForStops() {
        console.log("Setting up drag for stops");
        
        // Get all stop items
        const stopItems = container.querySelectorAll('.stop-item');
        
        stopItems.forEach(item => {
            // Skip if already set up
            if (item.getAttribute('data-drag-setup') === 'true') {
                return;
            }
            
            // Mark as set up
            item.setAttribute('data-drag-setup', 'true');
            
            // Get handle element
            const handle = item.querySelector('.drag-handle');
            if (!handle) return;
            
            // Add mouse down event to handle
            handle.addEventListener('mousedown', function(e) {
                // Prevent default actions
                e.preventDefault();
                
                // Set dragged item
                draggedItem = item;
                
                // Add dragging class
                item.classList.add('dragging');
                
                // Calculate initial positions and offsets
                const itemRect = item.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Initial position
                const startY = e.clientY;
                const startTop = item.offsetTop;
                
                // Function to handle mouse move
                function onMouseMove(e) {
                    if (!draggedItem) return;
                    
                    // Calculate new position
                    const deltaY = e.clientY - startY;
                    const newTop = startTop + deltaY;
                    
                    // Set position
                    draggedItem.style.position = 'relative';
                    draggedItem.style.top = `${deltaY}px`;
                    
                    // Find position to insert
                    const siblings = Array.from(container.querySelectorAll('.stop-item:not(.dragging)'));
                    
                    // Clear all indicator classes
                    siblings.forEach(sib => {
                        sib.classList.remove('drop-above', 'drop-below');
                    });
                    
                    // Find the element we're hovering over
                    const hoverEl = siblings.find(sib => {
                        const rect = sib.getBoundingClientRect();
                        return e.clientY < rect.bottom && e.clientY > rect.top;
                    });
                    
                    if (hoverEl) {
                        const hoverRect = hoverEl.getBoundingClientRect();
                        const hoverMiddle = hoverRect.top + hoverRect.height / 2;
                        
                        // Determine if we should show above or below indicator
                        if (e.clientY < hoverMiddle) {
                            hoverEl.classList.add('drop-above');
                        } else {
                            hoverEl.classList.add('drop-below');
                        }
                    }
                }
                
                // Function to handle mouse up
                function onMouseUp(e) {
                    if (!draggedItem) return;
                    
                    // Remove dragging class
                    draggedItem.classList.remove('dragging');
                    
                    // Reset positioning
                    draggedItem.style.position = '';
                    draggedItem.style.top = '';
                    
                    // Find any element with drop indicators
                    const dropAbove = container.querySelector('.drop-above');
                    const dropBelow = container.querySelector('.drop-below');
                    
                    // Reposition the element
                    if (dropAbove) {
                        container.insertBefore(draggedItem, dropAbove);
                        dropAbove.classList.remove('drop-above');
                    } else if (dropBelow) {
                        // Insert after the element
                        const next = dropBelow.nextElementSibling;
                        if (next) {
                            container.insertBefore(draggedItem, next);
                        } else {
                            container.appendChild(draggedItem);
                        }
                        dropBelow.classList.remove('drop-below');
                    }
                    
                    // Clear other classes
                    const siblings = Array.from(container.querySelectorAll('.stop-item'));
                    siblings.forEach(sib => {
                        sib.classList.remove('drop-above', 'drop-below');
                    });
                    
                    // Remove event listeners
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    
                    // Reset dragged item
                    draggedItem = null;
                    
                    // Refresh autocompletes
                    refreshAutocompletes();
                    
                    console.log("Drag and drop completed");
                }
                
                // Add event listeners for move and up
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }
    
    // Set up initial items
    setupDragForStops();
    
    // Create observer to watch for new items
    const observer = new MutationObserver(function(mutations) {
        setupDragForStops();
    });
    
    // Start observing
    observer.observe(container, { childList: true });
}
    
    // Handle movement during drag
    function onMove(e) {
        if (!dragEl) return;
        
        const y = getY(e);
        
        // Find the element we're hovering over
        const items = Array.from(container.querySelectorAll('.stop-item:not(.dragging)'));
        
        // Remove any previous indicators
        items.forEach(item => {
            item.classList.remove('drop-above', 'drop-below');
        });
        
        // Find the element we should insert before
        nextEl = items.find(item => {
            const box = item.getBoundingClientRect();
            const boxY = box.top + box.height / 2;
            return y <= boxY;
        });
        
        if (nextEl) {
            nextEl.classList.add('drop-above');
        } else if (items.length) {
            // If no nextEl, we're at the end
            items[items.length - 1].classList.add('drop-below');
        }
    }
    
    // Handle drop
    function onEnd() {
        if (!dragEl) return;
        
        // Remove classes
        dragEl.classList.remove('dragging');
        Array.from(container.querySelectorAll('.stop-item')).forEach(item => {
            item.classList.remove('drop-above', 'drop-below');
        });
        
        // Insert the element
        if (nextEl) {
            container.insertBefore(dragEl, nextEl);
        } else {
            container.appendChild(dragEl);
        }
        
        // Remove listeners
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        
        // Reset variables
        dragEl = null;
        nextEl = null;
        
        // Refresh autocompletes
        refreshAutocompletes();
    }
    
    // Initialize drag and drop
    addEventListeners();
    
    // Add a mutation observer to handle dynamically added stops
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                addEventListeners();
            }
        });
    });
    
    // Start observing
    observer.observe(container, { childList: true });
/**
 * Refreshes autocompletes after drag-and-drop operations
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
            <!-- Reorder controls will be added here by JavaScript -->
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
 * Handles dark mode toggle functionality
 */
function setupDarkModeToggle() {
    console.log("Setting up dark mode toggle");
    const themeToggle = document.getElementById('theme-toggle');
    
    if (!themeToggle) {
        console.error("Theme toggle button not found!");
        return;
    }
    
    console.log("Theme toggle found:", themeToggle);
    
    // Check for saved theme preference or use the system preference
    const savedTheme = localStorage.getItem('theme');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    console.log("Saved theme:", savedTheme, "System dark mode:", systemDarkMode);
    
    // Set initial theme
    if (savedTheme === 'dark' || (!savedTheme && systemDarkMode)) {
        document.documentElement.classList.add('dark');
        console.log("Dark mode activated on load");
    } else {
        document.documentElement.classList.remove('dark');
        console.log("Light mode activated on load");
    }
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        console.log("Theme toggle clicked");
        const isDark = document.documentElement.classList.toggle('dark');
        
        // Save preference to localStorage
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        console.log("Theme set to:", isDark ? 'dark' : 'light');
    });
    
    console.log("Dark mode toggle setup complete");
}

/**
 * Enables manual reordering of stops - simplified version
 */
function setupManualReordering() {
    console.log("Setting up manual reordering - simplified");
    const stopsContainer = document.getElementById('stops-container');
    
    // Function to refresh all controls
    function refreshControls() {
        console.log("Refreshing controls");
        // Remove all existing controls
        const existingControls = document.querySelectorAll('.reorder-controls');
        existingControls.forEach(control => control.remove());
        
        // Get all stop items
        const items = stopsContainer.querySelectorAll('.stop-item');
        console.log("Found", items.length, "items");
        
        // Add controls to each item
        items.forEach((item, index) => {
            // Create controls container
            const controls = document.createElement('div');
            controls.className = 'reorder-controls';
            controls.style.position = 'absolute';
            controls.style.right = '35px';
            controls.style.top = '50%';
            controls.style.transform = 'translateY(-50%)';
            controls.style.display = 'flex';
            controls.style.gap = '4px';
            controls.style.zIndex = '10';
            
            let controlsHTML = '';
            
            // Add up button if not first
            if (index > 0) {
                controlsHTML += `
                    <button type="button" class="up-btn text-blue-500 hover:text-blue-700" style="padding: 2px; border-radius: 4px;">
                        <i class="fas fa-arrow-up"></i>
                    </button>`;
            }
            
            // Add down button if not last
            if (index < items.length - 1) {
                controlsHTML += `
                    <button type="button" class="down-btn text-blue-500 hover:text-blue-700" style="padding: 2px; border-radius: 4px;">
                        <i class="fas fa-arrow-down"></i>
                    </button>`;
            }
            
            controls.innerHTML = controlsHTML;
            
            // Add event listeners
            const upBtn = controls.querySelector('.up-btn');
            if (upBtn) {
                upBtn.addEventListener('click', function() {
                    console.log("Move up clicked");
                    const prev = item.previousElementSibling;
                    if (prev) {
                        stopsContainer.insertBefore(item, prev);
                        refreshControls();
                        refreshAutocompletes();
                    }
                });
            }
            
            const downBtn = controls.querySelector('.down-btn');
            if (downBtn) {
                downBtn.addEventListener('click', function() {
                    console.log("Move down clicked");
                    const next = item.nextElementSibling;
                    if (next) {
                        stopsContainer.insertBefore(next, item);
                        refreshControls();
                        refreshAutocompletes();
                    }
                });
            }
            
            // Add to item
            const inputWrapper = item.querySelector('.relative');
            if (inputWrapper) {
                inputWrapper.appendChild(controls);
            }
        });
    }
    
    // Initial setup
    refreshControls();
    
    // Set up observer for dynamic changes
    const observer = new MutationObserver(function(mutations) {
        refreshControls();
    });
    
    // Start observing
    observer.observe(stopsContainer, { 
        childList: true,
        subtree: true
    });
    
    // Also refresh after adding a stop
    document.getElementById('add-stop-btn').addEventListener('click', function() {
        setTimeout(refreshControls, 100);
    });
    
    return refreshControls;
}

// Add this at the end of your app.js file
document.addEventListener('DOMContentLoaded', function() {
    // Only run this if not already initialized by Google Maps
    if (typeof window.appInitialized === 'undefined') {
        console.log("DOM Content Loaded - initializing app");
        initializeApp();
    }
});

// Keep the original initMap function (Google Maps will call this)
function initMap() {
    console.log("Google Maps API loaded successfully");
    window.appInitialized = true;
    initializeApp();
}