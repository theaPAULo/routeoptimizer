exports.handler = async function(event, context) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Environment variable test",
        hasApiKey: process.env.GOOGLE_MAPS_API_KEY ? true : false,
        keyLength: process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.length : 0
      })
    };
  };