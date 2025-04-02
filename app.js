/**
 * Route Optimizer Application
 * 
 * This script handles the functionality for the Route Optimizer web application.
 * It manages form inputs, API communication, UI updates, and enhanced features.
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

// Define stop categories with colors
const stopCategories = [
  { name: 'Default', color: '#3b82f6', icon: 'fa-map-pin' },
  { name: 'Order', color: '#10b981', icon: 'fa-shopping-bag' },
  { name: 'Sample', color: '#f59e0b', icon: 'fa-box-open' },
  { name: 'Meeting', color: '#6366f1', icon: 'fa-handshake' },
  { name: 'Delivery', color: '#ef4444', icon: 'fa-truck' }
];

/**
 * Initializes the application
 */
function initApp() {
    // Add first stop input
    addStopInput();
    
    // Set up event listeners
    addStopBtn.addEventListener('click', addStopInput);
    routeForm.addEventListener('submit', handleFormSubmit);
    backBtn.addEventListener('click', showInputSection);
    saveBtn.addEventListener('click', saveRoute);
    
    // Initialize dark mode
    initDarkMode();
    
    // Initialize Google Maps API autocomplete
    // This will be called via callback when the API loads
    window.initAllAutocompletes = initAllAutocompletes;
}

/**
 * Initialize dark mode based on user preference
 */
function initDarkMode() {
    // Check local storage preference
    const darkModePref = localStorage.getItem('darkMode');
    
    // If preference exists, apply it
    if (darkModePref === 'true') {
        document.documentElement.classList.add('dark');
    }
    // OR check system preference
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }
    
    // Update icon
    const darkModeIcon = document.getElementById('dark-mode-icon');
    if (darkModeIcon) {
        darkModeIcon.className = document.documentElement.classList.contains('dark') 
            ? 'fas fa-sun' : 'fas fa-moon';
    }
}

/**
 * Toggles dark mode
 */
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDarkMode = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
    
    // Update icon
    const darkModeIcon = document.getElementById('dark-mode-icon');
    if (darkModeIcon) {
        darkModeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
}

/**
 * Adds a new stop input field to the form with category and notes options
 */
function addStopInput() {
    stopCounter++;
    const stopId = `stop-${stopCounter}`;
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'stop-item fade-in mb-4 pb-4 border-b border-gray-200';
    stopDiv.innerHTML = `
        <div class="relative flex items-center mb-2">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i class="fas fa-map-pin text-gray-400"></i>
            </span>
            <input 
                type="text" 
                id="${stopId}" 
                class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter stop address or place name"
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
        
        <div class="flex flex-wrap gap-2 mt-2">
            <div class="relative w-full sm:w-auto">
                <select 
                    id="${stopId}-category" 
                    class="block w-full sm:w-auto pl-2 pr-8 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    ${stopCategories.map(cat => 
                        `<option value="${cat.name}" data-color="${cat.color}" data-icon="${cat.icon}">${cat.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="relative w-full mt-2">
                <textarea 
                    id="${stopId}-notes" 
                    class="block w-full pl-2 pr-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Add notes for this stop (optional)"
                    rows="2"
                ></textarea>
            </div>
        </div>
    `;
    
    stopsContainer.appendChild(stopDiv);
    
    // Initialize autocomplete for this stop if Google Maps API is loaded
    if (window.google && window.google.maps) {
        initAutocomplete(stopId);
    }
}

/**
 * Initialize address autocomplete for an input element
 * @param {string} inputId - The ID of the input element
 */
function initAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode', 'establishment'] // Allow both addresses and place names
    });
    
    // Ensure the autocomplete stays within the input field bounds
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) {
            // User entered the name of a place that was not suggested
            return;
        }
        
        // You can store the place_id for more accurate routing later
        input.dataset.placeId = place.place_id;
        input.dataset.lat = place.geometry.location.lat();
        input.dataset.lng = place.geometry.location.lng();
    });
}

/**
 * Closes the current modal
 */
function closeModal() {
    if (window.currentModal) {
        window.currentModal.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(window.currentModal);
            window.currentModal = null;
        }, 300);
    }
}

/**
 * Refreshes the saved routes modal
 */
function refreshSavedRoutesModal() {
    closeModal();
    setTimeout(showSavedRoutesModal, 300);
}

/**
 * Exports the current route as a JSON file
 */
function exportRoute() {
    if (!currentRoute) return;
    
    // Create a download link for the JSON file
    const dataStr = JSON.stringify(currentRoute, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportName = prompt('Name your export file:', 'route-export');
    if (!exportName) return;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${exportName}.json`);
    linkElement.click();
    
    showAlert('Route exported successfully!', 'success');
}

/**
 * Imports a route from a JSON file
 */
function importRoute() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedRoute = JSON.parse(e.target.result);
                
                // Validate the imported data has the required structure
                if (!importedRoute.waypoints || 
                    !importedRoute.totalDistance ||
                    !importedRoute.estimatedTime) {
                    throw new Error('Invalid route data format');
                }
                
                currentRoute = importedRoute;
                displayRouteResults(currentRoute);
                showAlert('Route imported successfully!', 'success');
            } catch (error) {
                showAlert('Error importing route. Invalid file format.', 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    });
    
    fileInput.click();
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Initialize autocomplete on all address inputs
 */
function initAllAutocompletes() {
    // Initialize for start and end locations
    initAutocomplete('start-location');
    initAutocomplete('end-location');
    
    // Initialize for existing stops
    const stopInputs = stopsContainer.querySelectorAll('input[type="text"]');
    for (const input of stopInputs) {
        initAutocomplete(input.id);
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
    
    // Automatically hide after 5 seconds
    setTimeout(() => {
        alertBox.classList.add('hidden');
    }, 5000);
}

/**
 * Handles the form submission
 * @param {Event} event - The form submission event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Collect form data
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    
    // Get coordinates if available from autocomplete
    const startInput = document.getElementById('start-location');
    const endInput = document.getElementById('end-location');
    
    const startCoords = startInput.dataset.lat && startInput.dataset.lng 
        ? { lat: parseFloat(startInput.dataset.lat), lng: parseFloat(startInput.dataset.lng) }
        : null;
        
    const endCoords = endInput.dataset.lat && endInput.dataset.lng 
        ? { lat: parseFloat(endInput.dataset.lat), lng: parseFloat(endInput.dataset.lng) }
        : null;
    
    // Collect all stops with their category and notes
    const stops = [];
    const stopItems = stopsContainer.querySelectorAll('.stop-item');
    
    for (const item of stopItems) {
        const input = item.querySelector('input[type="text"]');
        if (!input || !input.value.trim()) continue;
        
        const categorySelect = item.querySelector('select');
        const notesTextarea = item.querySelector('textarea');
        
        // Get selected category data
        const selectedOption = categorySelect.options[categorySelect.selectedIndex];
        const category = {
            name: selectedOption.value,
            color: selectedOption.dataset.color,
            icon: selectedOption.dataset.icon
        };
        
        const notes = notesTextarea ? notesTextarea.value.trim() : '';
        
        // Get coordinates if available
        const coords = input.dataset.lat && input.dataset.lng 
            ? { lat: parseFloat(input.dataset.lat), lng: parseFloat(input.dataset.lng) }
            : null;
        
        stops.push({
            address: input.value.trim(),
            category,
            notes,
            coords
        });
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
    
    // In a real application, you would call an API to optimize the route
    // For this demo, we'll calculate a simple route based on coordinates if available
    setTimeout(() => {
        // Use real coordinates if available, otherwise use mock data
        if (startCoords && endCoords && stops.every(stop => stop.coords)) {
            // Calculate actual distances and times
            const routeData = calculateRouteData(startCoords, endCoords, stops);
            
            const optimizedRoute = {
                success: true,
                route: {
                    totalDistance: routeData.totalDistance.toFixed(1) + ' miles',
                    estimatedTime: routeData.estimatedTime + ' minutes',
                    waypoints: [
                        { 
                            address: startLocation, 
                            type: 'start', 
                            category: null, 
                            notes: '',
                            coords: startCoords 
                        },
                        ...stops.map(stop => ({ 
                            address: stop.address, 
                            type: 'stop', 
                            category: stop.category,
                            notes: stop.notes,
                            coords: stop.coords
                        })),
                        { 
                            address: endLocation, 
                            type: 'end', 
                            category: null, 
                            notes: '',
                            coords: endCoords 
                        }
                    ]
                }
            };
            
            handleRouteResponse(optimizedRoute);
        } else {
            // Mock response with random data if coordinates aren't available
            const mockResponse = {
                success: true,
                route: {
                    totalDistance: (Math.random() * 50 + 10).toFixed(1) + ' miles',
                    estimatedTime: Math.floor(Math.random() * 120 + 30) + ' minutes',
                    waypoints: [
                        { 
                            address: startLocation, 
                            type: 'start', 
                            category: null, 
                            notes: '',
                            coords: startCoords 
                        },
                        ...stops.map(stop => ({ 
                            address: stop.address, 
                            type: 'stop', 
                            category: stop.category,
                            notes: stop.notes,
                            coords: stop.coords
                        })),
                        { 
                            address: endLocation, 
                            type: 'end', 
                            category: null, 
                            notes: '',
                            coords: endCoords 
                        }
                    ]
                }
            };
            
            handleRouteResponse(mockResponse);
        }
    }, 1500);
}

/**
 * Calculates route data based on coordinates
 * @param {Object} startCoords - {lat, lng} coordinates of start
 * @param {Object} endCoords - {lat, lng} coordinates of end
 * @param {Array} stops - Array of stop objects with coordinates
 * @returns {Object} Route data including total distance and time
 */
function calculateRouteData(startCoords, endCoords, stops) {
    // Create an array of all points in order (including start and end)
    const allPoints = [
        { coords: startCoords },
        ...stops,
        { coords: endCoords }
    ];
    
    // Calculate total distance by summing distances between consecutive points
    let totalDistance = 0;
    
    for (let i = 0; i < allPoints.length - 1; i++) {
        totalDistance += calculateDistance(
            allPoints[i].coords,
            allPoints[i + 1].coords
        );
    }
    
    // Estimate travel time based on distance (avg speed 30 mph for urban areas)
    const estimatedTime = estimateTravelTime(totalDistance);
    
    return {
        totalDistance,
        estimatedTime
    };
}

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param {Object} point1 - {lat, lng} coordinates of point 1
 * @param {Object} point2 - {lat, lng} coordinates of point 2
 * @returns {number} Distance in miles
 */
function calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const R = 3958.8; // Earth's radius in miles
    
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
}

/**
 * Estimates travel time based on distance
 * @param {number} distance - Distance in miles
 * @returns {number} Estimated time in minutes
 */
function estimateTravelTime(distance) {
    // Assume average speed of 30 mph for urban areas
    return Math.round(distance / 30 * 60);
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
        
        // Determine icon and color based on point type and category
        let icon = 'fa-map-marker-alt';
        let color = '#3b82f6'; // Default blue
        
        if (point.type === 'start') {
            icon = 'fa-map-marker-alt';
            color = '#3b82f6';
        } else if (point.type === 'end') {
            icon = 'fa-flag-checkered';
            color = '#10b981';
        } else if (point.category) {
            // Use category icon and color for regular stops
            icon = point.category.icon;
            color = point.category.color;
        }
        
        // Create HTML for the list item
        let itemHTML = `
            <div class="stop-number" style="background-color: ${color};">${index + 1}</div>
            <div class="stop-address">
                <div>${point.address}</div>
                ${point.category ? `<span class="category-tag" style="background-color: ${point.category.color}20; color: ${point.category.color}">
                    <i class="fas ${point.category.icon} mr-1"></i>${point.category.name}
                </span>` : ''}
            </div>
            <div class="stop-type ${point.type}">${point.type}</div>
        `;
        
        // Add notes button if there are notes
        if (point.notes && point.notes.trim() !== '') {
            itemHTML += `
                <button class="ml-2 text-gray-500 hover:text-gray-700 notes-toggle" data-notes="${encodeURIComponent(point.notes)}">
                    <i class="fas fa-sticky-note"></i>
                </button>
            `;
        }
        
        listItem.innerHTML = itemHTML;
        
        // Add click event listener for notes
        if (point.notes && point.notes.trim() !== '') {
            const notesBtn = listItem.querySelector('.notes-toggle');
            if (notesBtn) {
                notesBtn.addEventListener('click', function() {
                    showNotesModal(decodeURIComponent(this.dataset.notes), point.address);
                });
            }
        }
        
        routeList.appendChild(listItem);
    });
    
    // Show results section
    inputSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
}

/**
 * Shows a modal with stop notes
 * @param {string} notes - The notes text
 * @param {string} address - The stop address
 */
function showNotesModal(notes, address) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    modal.id = 'notes-modal';
    
    // Create modal content
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 modal-content">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold dark:text-white">Notes for ${address}</h3>
                <button class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white" id="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p class="whitespace-pre-wrap dark:text-gray-200">${notes}</p>
            </div>
            <div class="mt-6 text-right">
                <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" id="confirm-modal">
                    OK
                </button>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    window.currentModal = modal;
    
    // Add event listeners for closing
    const closeBtn = document.getElementById('close-modal');
    const confirmBtn = document.getElementById('confirm-modal');
    
    function closeModal() {
        modal.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(modal);
            window.currentModal = null;
        }, 300);
    }
    
    closeBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', closeModal);
    
    // Close when clicking outside the modal content
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}

/**
 * Shows the input section again
 */
function showInputSection() {
    inputSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
}

/**
 * Opens the current route in Google Maps or Apple Maps
 * @param {string} mapType - 'google' or 'apple'
 */
function openInMaps(mapType) {
    if (!currentRoute) return;

    const waypoints = currentRoute.waypoints;
    
    if (mapType === 'google') {
        // Format: https://www.google.com/maps/dir/?api=1&origin=ORIGIN&destination=DESTINATION&waypoints=STOP1|STOP2
        const origin = encodeURIComponent(waypoints[0].address);
        const destination = encodeURIComponent(waypoints[waypoints.length - 1].address);
        
        // Extract stops (exclude start and end)
        const stops = waypoints.slice(1, -1).map(wp => encodeURIComponent(wp.address)).join('|');
        
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${stops ? `&waypoints=${stops}` : ''}`;
        
        window.open(googleMapsUrl, '_blank');
    } else if (mapType === 'apple') {
        // Format: http://maps.apple.com/?saddr=ORIGIN&daddr=STOP1&daddr=STOP2&daddr=DESTINATION
        const origin = encodeURIComponent(waypoints[0].address);
        
        // Start building the URL
        let appleMapsUrl = `http://maps.apple.com/?saddr=${origin}`;
        
        // Add all stops and destination as daddr parameters
        for (let i = 1; i < waypoints.length; i++) {
            appleMapsUrl += `&daddr=${encodeURIComponent(waypoints[i].address)}`;
        }
        
        window.open(appleMapsUrl, '_blank');
    }
}

/**
 * Saves the current route to localStorage
 */
function saveRoute() {
    if (!currentRoute) return;
    
    // Prompt user for a name for this route
    const routeName = prompt('Enter a name for this route:', 'Route ' + new Date().toLocaleDateString());
    
    if (!routeName) return; // User cancelled
    
    // Get existing saved routes
    const savedRoutes = getSavedRoutes();
    
    // Add new route with timestamp
    const routeData = {
        id: Date.now().toString(),
        name: routeName,
        timestamp: new Date().toISOString(),
        route: currentRoute
    };
    
    savedRoutes.push(routeData);
    
    // Save to localStorage
    localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes));
    
    showAlert(`Route "${routeName}" saved successfully!`, 'success');
}

/**
 * Gets all saved routes from localStorage
 * @returns {Array} Array of saved route objects
 */
function getSavedRoutes() {
    const routesJson = localStorage.getItem('savedRoutes');
    return routesJson ? JSON.parse(routesJson) : [];
}

/**
 * Loads a saved route by ID
 * @param {string} routeId - The ID of the route to load
 */
function loadRoute(routeId) {
    const savedRoutes = getSavedRoutes();
    const routeData = savedRoutes.find(r => r.id === routeId);
    
    if (routeData) {
        currentRoute = routeData.route;
        displayRouteResults(currentRoute);
        showAlert(`Loaded route: ${routeData.name}`, 'info');
    }
}

/**
 * Deletes a saved route
 * @param {string} routeId - The ID of the route to delete
 */
function deleteRoute(routeId) {
    const savedRoutes = getSavedRoutes();
    const updatedRoutes = savedRoutes.filter(r => r.id !== routeId);
    
    localStorage.setItem('savedRoutes', JSON.stringify(updatedRoutes));
    showAlert('Route deleted successfully.', 'info');
}

/**
 * Shows a modal with all saved routes
 */
function showSavedRoutesModal() {
    const savedRoutes = getSavedRoutes();
    
    if (savedRoutes.length === 0) {
        showAlert('No saved routes found.', 'info');
        return;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in modal-container';
    modal.id = 'saved-routes-modal';
    
    // Format routes as list items
    const routeItems = savedRoutes.map(r => `
        <li class="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div class="mb-2 sm:mb-0">
                    <h4 class="font-medium dark:text-white">${r.name}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(r.timestamp).toLocaleString()}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700" 
                            onclick="loadRoute('${r.id}'); closeModal();">
                        Load
                    </button>
                    <button class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            onclick="deleteRoute('${r.id}'); refreshSavedRoutesModal();">
                        Delete
                    </button>
                </div>
            </div>
        </li>
    `).join('');
    
    // Create modal content
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 max-h-[80vh] flex flex-col modal-content">
            <div class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold dark:text-white">Saved Routes</h3>
                <button class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white" id="close-routes-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="overflow-y-auto flex-grow">
                <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${routeItems}
                </ul>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 p-4">
                <button class="w-full px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500" id="close-routes-btn">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(modal);
    window.currentModal = modal;
    
    // Add event listeners
    document.getElementById('close-routes-modal').addEventListener('click', closeModal);
    document.getElementById('close-routes-btn').addEventListener('click', closeModal);
    
    // Close when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}
