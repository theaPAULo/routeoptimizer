// netlify/functions/maps-proxy.js
const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Get the API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Parse the query parameters
    const params = event.queryStringParameters || {};
    
    // Add the API key to the parameters
    params.key = apiKey;
    
    // Get the requested Google Maps API endpoint
    const endpoint = params.endpoint || 'js';
    delete params.endpoint;
    
    // Create the URL for the Google Maps API
    const url = `https://maps.googleapis.com/maps/api/${endpoint}`;
    
    // Make the request to Google Maps API
    const response = await axios.get(url, { params });
    
    // Return the response from Google Maps API
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers['content-type'],
        'Cache-Control': 'public, max-age=3600'
      },
      body: response.data
    };
  } catch (error) {
    console.error('Error proxying Google Maps API request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};