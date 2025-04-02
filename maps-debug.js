/**
 * Google Maps Places Autocomplete Debugging Tools
 * 
 * This script helps debug issues with Google Maps Places Autocomplete
 * by providing visual feedback and console diagnostics.
 */

// Create a debugging panel
function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'maps-debug-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 0;
        right: 0;
        width: 300px;
        max-height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff00;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        z-index: 9999;
        border-top-left-radius: 5px;
    `;
    
    // Add a title
    const title = document.createElement('div');
    title.textContent = 'Places API Debug';
    title.style.fontWeight = 'bold';
    title.style.borderBottom = '1px solid #00ff00';
    title.style.marginBottom = '5px';
    title.style.paddingBottom = '5px';
    panel.appendChild(title);
    
    // Add a status section
    const status = document.createElement('div');
    status.id = 'maps-debug-status';
    status.innerHTML = 'Initializing...';
    panel.appendChild(status);
    
    // Add a log section
    const log = document.createElement('div');
    log.id = 'maps-debug-log';
    panel.appendChild(log);
    
    // Add a close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: #333;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 2px 5px;
        font-size: 10px;
        cursor: pointer;
    `;
    closeBtn.onclick = () => panel.style.display = 'none';
    panel.appendChild(closeBtn);
    
    document.body.appendChild(panel);
    return panel;
}

// Log a message to the debug panel
function debugLog(message, isError = false) {
    console.log(`[Places Debug] ${message}`);
    
    const logElement = document.getElementById('maps-debug-log');
    if (logElement) {
        const entry = document.createElement('div');
        entry.textContent = message;
        if (isError) {
            entry.style.color = '#ff6666';
        }
        logElement.appendChild(entry);
        logElement.scrollTop = logElement.scrollHeight;
    }
}

// Update the status in the debug panel
function updateDebugStatus(message, isError = false) {
    const statusElement = document.getElementById('maps-debug-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? '#ff6666' : '#00ff00';
    }
}

// Test Google Places API with a visible test input
function testPlacesAPI() {
    debugLog('Running Places API test...');
    
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'places-api-test';
    testContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 90%;
        width: 400px;
    `;
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Google Places API Test';
    title.style.marginTop = '0';
    testContainer.appendChild(title);
    
    // Add description
    const description = document.createElement('p');
    description.textContent = 'Type a business or location name below to test if Places API is working correctly:';
    testContainer.appendChild(description);
    
    // Add test input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'places-test-input';
    input.placeholder = 'Try typing "Starbucks" or "Empire State"';
    input.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 16px;
        margin-bottom: 10px;
    `;
    testContainer.appendChild(input);
    
    // Add result div
    const result = document.createElement('div');
    result.id = 'places-test-result';
    result.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 4px;
        min-height: 40px;
    `;
    result.textContent = 'Results will appear here';
    testContainer.appendChild(result);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        margin-top: 15px;
        padding: 8px 15px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;
    closeBtn.onclick = () => {
        document.body.removeChild(testContainer);
        debugLog('Test window closed');
    };
    testContainer.appendChild(closeBtn);
    
    document.body.appendChild(testContainer);
    
    // Set up autocomplete on the test input
    try {
        if (window.google && window.google.maps && window.google.maps.places) {
            const autocomplete = new google.maps.places.Autocomplete(input, {
                types: ['establishment', 'geocode']
            });
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                const resultDiv = document.getElementById('places-test-result');
                
                if (place && place.name) {
                    resultDiv.innerHTML = `
                        <strong>Success!</strong><br>
                        Selected: ${place.name}<br>
                        Address: ${place.formatted_address || 'N/A'}<br>
                        Types: ${place.types ? place.types.join(', ') : 'N/A'}
                    `;
                    resultDiv.style.color = 'green';
                    debugLog(`Test successful - found place: ${place.name}`);
                    updateDebugStatus('Places API working correctly');
                } else {
                    resultDiv.innerHTML = 'No details available for this place';
                    resultDiv.style.color = 'red';
                    debugLog('Test failed - no place details returned', true);
                    updateDebugStatus('Places API not returning full results', true);
                }
            });
            
            debugLog('Test autocomplete initialized successfully');
        } else {
            document.getElementById('places-test-result').innerHTML = 
                'Google Maps API not available. Check console for errors.';
            debugLog('Cannot run test - Google Maps API not loaded', true);
            updateDebugStatus('Google Maps API not loaded', true);
        }
    } catch (error) {
        console.error('Error setting up test autocomplete:', error);
        document.getElementById('places-test-result').innerHTML = 
            `Error: ${error.message}`;
        debugLog(`Error in test: ${error.message}`, true);
        updateDebugStatus('Error testing Places API', true);
    }
}

// Initialize debugging
function initDebug() {
    createDebugPanel();
    debugLog('Debug panel initialized');
    
    // Add a button to test the API
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Places API';
    testButton.style.cssText = `
        position: fixed;
        bottom: 210px;
        right: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
        z-index: 9999;
    `;
    testButton.onclick = testPlacesAPI;
    document.body.appendChild(testButton);
    
    // Check Google Maps API status
    setTimeout(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
            updateDebugStatus('Google Maps API loaded successfully');
            debugLog('Maps API loaded and available');
        } else {
            updateDebugStatus('Google Maps API not loaded', true);
            debugLog('Maps API not available after timeout', true);
        }
    }, 5000);
}

// Run the debugging when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebug);
} else {
    initDebug();
}