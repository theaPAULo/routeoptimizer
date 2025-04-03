exports.handler = async function(event, context) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600'
      },
      body: `
        // Initialize Google Maps with the API key
        (function() {
          const script = document.createElement('script');
          script.src = "https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap";
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        })();
      `
    };
};