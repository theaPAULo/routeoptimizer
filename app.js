/**
 * Route Optimizer Application
 * 
 * This script handles the functionality for the Route Optimizer web application.
 * It manages form inputs, API communication, and UI updates.
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

// Initialize the application
function initApp() {
    // Add first stop input
    addStopInput();
    
    // Set up event listeners
    addStopBtn.addEventListener('click', addStopInput);
    routeForm.addEventListener('submit', handleFormSubmit);
    backBtn.addEventListener('click', showInputSection);
    saveBtn.addEventListener('click', saveRoute);
    
    // Load any saved routes (to be implemented)
    // loadSavedRoutes();
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
                placeholder="Enter stop address"
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
    
    // Collect all stops
    const stops = [];
    const stopInputs = stopsContainer.querySelectorAll('input[type="text"]');
    
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
    
    // In a real application, you would call an API to optimize the route
    // For this demo, we'll use a mock response with a delay to simulate API call
    setTimeout(() => {
        // Mock response - in a real app, this would come from the API
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
 * Saves the current route (mock implementation)
 */
function saveRoute() {
    if (!currentRoute) return;
    
    // In a real app, this would save to localStorage or a backend
    showAlert('Route saved successfully!', 'success');
    
    // Mock implementation - in a real app, this would be more complex
    console.log('Saved route:', currentRoute);
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);