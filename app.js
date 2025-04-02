/**
 * Route Optimizer Application
 * 
 * This script handles the functionality for the Route Optimizer web application.
 * It manages form inputs, API communication, and UI updates.
 * Enhanced with Google Maps integration and business name search capabilities.
 */

// DOM Elements
const routeForm = document.getElementById('route-form');
const stopsContainer = document.getElementById('stops-container');
const addStopBtn = document.getElementById('add-stop-btn');
const optimizeBtn = document.getElementById('optimize-btn');
const backBtn = document.getElementById('back-btn');
const saveBtn = document.getElementById('save-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const optimizeBtnText = document.getElementById('optimize-btn-text');
const inputSection = document.getElementById('input-section');
const resultsSection = document.getElementById('results-section');
const alertBox = document.getElementById('alert-box');
const totalDistance = document.getElementById('total-distance');
const estimatedTime = document.getElementById('estimated-time');
const routeList = document.getElementById('route-list');

// Store current route data
let currentRoute = null;
let stopCounter = 0;

// Google Maps API objects
let map;
let directionsService;
let directionsRenderer;
let placesService;
let autocompleteInstances = [];
let mapInitialized = false;

/**
 * Initialize the application
 * This is the main entry point when the page loads
 */
function initApp() {
    console.log('Initializing Route Optimizer App');
    
    // Add first stop input
    addStopInput();
    
    // Set up event listeners
    addStopBtn.addEventListener('click', addStopInput);
    routeForm.addEventListener('submit', handleFormSubmit);
    backBtn.addEventListener('click', showInputSection);
    saveBtn.addEventListener('click', saveRoute);
    
    // Initialize Google Maps if the API is loaded
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        initializeGoogleMaps();
    } else {
        // If Google Maps isn't loaded yet, set up a callback
        window.initMap = initializeGoogleMaps;
        
        // Try to load Google Maps if it hasn't been loaded
        if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
            loadGoogleMapsScript();
        }
    }
}

/**
 * Load the Google Maps API script
 */
function loadGoogleMapsScript() {
    // Only load if not already loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    console.log('Google Maps API script loading...');
}

/**
 * Initialize Google Maps components
 * Called when the Google Maps API is loaded
 */
function initializeGoogleMaps() {
    console.log('Setting up Google Maps components');
    
    if (mapInitialized) return;
    mapInitialized = true;
    
    // Make sure there's a map container
    let mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        // Create a map container if it doesn't exist
        mapContainer = document.createElement('div');
        mapContainer.id = 'map-container';
        mapContainer.className = 'w-full h-64 md:h-96 rounded-md mb-6 border border-gray-300 overflow-hidden';
        mapContainer.style.height = '400px';
        
        // Insert before the route list in results section
        const resultsHeader = document.querySelector('#results-section h3');
        if (resultsHeader) {
            resultsHeader.parentNode.insertBefore(mapContainer, resultsHeader);
        }
    }
    
    console.log('Initializing map in container:', mapContainer);
    
    // Initialize the map
    map = new google.maps.Map(mapContainer, {
        center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false
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
    
    // Set up autocomplete for all input fields
    initializeAutocomplete();
    
    console.log('Map initialized successfully');
}

/**
 * Set up Places Autocomplete for all location inputs
 */
function initializeAutocomplete() {
    // Set up for start location
    setupPlacesAutocomplete('start-location');
    
    // Set up for end location
    setupPlacesAutocomplete('end-location');
    
    // Set up for any existing stops
    const stopInputs = document.querySelectorAll('#stops-container input');
    stopInputs.forEach(input => {
        if (input.id) {
            setupPlacesAutocomplete(input.id);
        }
    });
    
    console.log('Places Autocomplete initialized for all inputs');
}

/**
 * Set up enhanced Places Autocomplete for a specific input
 * This allows searching for business names and points of interest
 * @param {string} inputId - The ID of the input field
 */
function setupPlacesAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.warn(`Input element with ID ${inputId} not found`);
        return;
    }
    
    // Create autocomplete with broad search capabilities
    const autocomplete = new google.maps.places.Autocomplete(input, {
        // No type restrictions to allow all place types (businesses, addresses, etc.)
        fields: ['place_id', 'formatted_address', 'geometry', 'name', 'types'],
    });
    
    // Debug listener to see the selected place details
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        console.log(`Place selected for ${inputId}:`, place);
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
    
    console.log(`Enhanced autocomplete set up for ${inputId}`);
}

/**
 * Adds a new stop input field to the form
 */
function addStopInput() {
    stopCounter++;
    const stopId = `stop-${stopCounter}`;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'stop-item fade-in';
    stopDiv.innerHTML = `
        <div class="relative flex items-center mb-2">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i class="fas fa-map-pin text-gray-400"></i>
            </span>
            <input 
                type="text" 
                id="${stopId}" 
                class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter stop location (address, business, etc.)"
                required
            >
            ${stopCounter > 1 ? `<button 
                type="button" 
                class="absolute right-2 text-red-500 hover:text-red-700"
                aria-label="Remove stop"
                onclick="removeStop(this)"
            >
                <i class="fas fa-times"></i>
            </button>` : ''}
        </div>
    `;
    
    stopsContainer.appendChild(stopDiv);
    
    // Set up autocomplete for the new input
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        setupPlacesAutocomplete(stopId);
    }
}

/**
 * Removes a stop input field
 * @param {HTMLElement} button - The remove button that was clicked
 */
function removeStop(button) {
    const stopItem = button.closest('.stop-item');
    stopItem.style.opacity = 0;
    
    // Remove after fade out animation
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
 * Handles the form submission and calculates the route
 * @param {Event} event - The form submission event
 */
async function handleFormSubmit(event) {
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
        // Use Google Maps API to calculate route if available
        if (directionsService && map) {
            const response = await calculateOptimizedRoute(startLocation, endLocation, stops);
            handleRouteResponse(response);
        } else {
            // Fall back to mock data if Google Maps isn't available
            setTimeout(() => {
                const mockResponse = {
                    success: true,
                    route: {
                        totalDistance: (Math.random() * 50 + 10).toFixed(1) + ' miles',
                        estimatedTime: Math.floor(Math.random() * 120 + 30) + ' minutes',
                        waypoints: [
                            { address: startLocation, type: 'start' },
                            ...stops.map(stop => ({ address: stop, type: 'stop' })),
                            { address: endLocation, type: 'end' }
                        ]
                    }
                };
                
                handleRouteResponse(mockResponse);
            }, 1500);
        }
    } catch (error) {
        console.error('Error calculating route:', error);
        showAlert('Failed to calculate route. Please try again.');
        toggleLoadingState(false);
    }
}

/**
 * Calculate optimized route using Google Maps APIs
 * @param {string} startLocation - Starting location address or place name
 * @param {string} endLocation - Ending location address or place name
 * @param {Array<string>} stops - Array of stop addresses or place names
 * @returns {Promise} - Resolves with the route data
 */
async function calculateOptimizedRoute(startLocation, endLocation, stops) {
    return new Promise((resolve, reject) => {
        // Combine all waypoints for the optimization request
        const waypoints = stops.map(stop => ({
            location: stop,
            stopover: true
        }));
        
        // Create the directions request
        const request = {
            origin: startLocation,
            destination: endLocation,
            waypoints: waypoints,
            optimizeWaypoints: true, // This tells Google to optimize the order
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
                
                // Get the optimized waypoint order
                const waypointOrder = result.routes[0].waypoint_order;
                
                // Create ordered waypoints array
                const orderedWaypoints = [
                    { address: startLocation, type: 'start' }
                ];
                
                // Add the stops in the optimized order
                waypointOrder.forEach(index => {
                    orderedWaypoints.push({
                        address: stops[index],
                        type: 'stop'
                    });
                });
                
                // Add the destination
                orderedWaypoints.push({
                    address: endLocation,
                    type: 'end'
                });
                
                // Display the route on the map
                directionsRenderer.setDirections(result);
                
                // Fit the map to the route bounds
                map.fitBounds(result.routes[0].bounds);
                
                // Resolve with the route data
                resolve({
                    success: true,
                    route: {
                        totalDistance: `${distanceInMiles} miles`,
                        estimatedTime: `${durationInMinutes} minutes`,
                        waypoints: orderedWaypoints
                    }
                });
            } else {
                console.error('Directions request failed with status:', status);
                reject(new Error(`Directions request failed: ${status}`));
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
 * Handles the API response and updates the UI accordingly
 * @param {Object} response - The API response
 */
function handleRouteResponse(response) {
    toggleLoadingState(false);
    
    if (response.success && response.route) {
        currentRoute = response.route;
        displayRouteResults(response.route);
    } else {
        showAlert(response.error || 'Failed to optimize route. Please try again.');
    }
}

/**
 * Displays the route results in the UI
 * @param {Object} route - The optimized route data
 */
function displayRouteResults(route) {
    // Update stats
    totalDistance.textContent = route.totalDistance;
    estimatedTime.textContent = route.estimatedTime;
    
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
    
    // Make sure the map container is visible
    if (document.getElementById('map-container')) {
        document.getElementById('map-container').style.display = 'block';
    }
    
    // Show results section
    inputSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
}

/**
 * Shows the input section again
 */
function showInputSection() {
    inputSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
}

/**
 * Saves the current route
 */
function saveRoute() {
    if (!currentRoute) return;
    
    // Create a route object to save
    const routeToSave = {
        id: Date.now(),
        date: new Date().toISOString(),
        ...currentRoute
    };
    
    // Get existing saved routes or initialize empty array
    let savedRoutes = JSON.parse(localStorage.getItem('savedRoutes') || '[]');
    
    // Add current route to saved routes
    savedRoutes.push(routeToSave);
    
    // Save back to localStorage
    localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes));
    
    // Show success message
    showAlert('Route saved successfully!', 'success');
    
    console.log('Route saved:', routeToSave);
}

// Add this function to your existing code
function enableBusinessSearch() {
  if (typeof google === 'undefined' || typeof google.maps === 'undefined' || 
      typeof google.maps.places === 'undefined') {
    console.log('Google Maps Places API not loaded yet, trying again in 1 second');
    setTimeout(enableBusinessSearch, 1000);
    return;
  }
  
  // Target all address input fields
  const inputs = [
    document.getElementById('start-location'),
    document.getElementById('end-location'),
    ...Array.from(document.querySelectorAll('#stops-container input'))
  ].filter(input => input); // Filter out any null values
  
  console.log('Setting up business search for', inputs.length, 'inputs');
  
  // Set up each input with unrestricted autocomplete
  inputs.forEach(input => {
    // Create autocomplete with no type restrictions
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ['place_id', 'formatted_address', 'geometry', 'name'],
    });
    
    // Log when a place is selected
    autocomplete.addListener('place_changed', function() {
      const place = autocomplete.getPlace();
      console.log('Selected place:', place);
    });
    
    console.log('Enhanced autocomplete set up for', input.id || 'unnamed input');
  });
  
  // Handle dynamically added stops
  const originalAddStopInput = window.addStopInput;
  if (originalAddStopInput && !window.businessSearchEnabled) {
    window.businessSearchEnabled = true;
    window.addStopInput = function() {
      // Call original function first
      originalAddStopInput();
      
      // Then set up autocomplete for the newly added input
      setTimeout(() => {
        const newInputs = document.querySelectorAll('#stops-container input');
        const lastInput = newInputs[newInputs.length - 1];
        if (lastInput) {
          const autocomplete = new google.maps.places.Autocomplete(lastInput, {
            fields: ['place_id', 'formatted_address', 'geometry', 'name'],
          });
          console.log('Added autocomplete to new stop input:', lastInput.id || 'unnamed input');
        }
      }, 100);
    };
  }
}

// Run this after page load
document.addEventListener('DOMContentLoaded', function() {
  // Try to enable business search after a short delay
  setTimeout(enableBusinessSearch, 1000);
});
