// netlify/functions/track-usage.js
const faunadb = require('faunadb');
const q = faunadb.query;

// Initialize the FaunaDB client
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
});

exports.handler = async function(event, context) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { userId, userIp } = data;
    
    // Use a combination of user ID and IP to identify users
    const identifier = userId || userIp || 'anonymous';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Try to find existing record
    let usageRecord;
    try {
      usageRecord = await client.query(
        q.Get(
          q.Match(q.Index('usage_by_user_and_date'), [identifier, today])
        )
      );
    } catch (err) {
      // No record found, create new one
      if (err.name === 'NotFound') {
        usageRecord = {
          data: {
            userId: identifier,
            date: today,
            count: 0
          }
        };
      } else {
        throw err;
      }
    }
    
    // Check if user has exceeded daily limit
    const currentCount = usageRecord.data.count || 0;
    const limit = process.env.DAILY_API_LIMIT || 25;
    
    if (currentCount >= limit) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          currentUsage: currentCount,
          limit: limit
        })
      };
    }
    
    // Increment usage count
    if (usageRecord.ref) {
      // Update existing record
      await client.query(
        q.Update(usageRecord.ref, {
          data: {
            count: currentCount + 1
          }
        })
      );
    } else {
      // Create new record
      await client.query(
        q.Create(q.Collection('api_usage'), {
          data: {
            userId: identifier,
            date: today,
            count: 1
          }
        })
      );
    }
    
    // Return updated usage
    return {
      statusCode: 200,
      body: JSON.stringify({
        currentUsage: currentCount + 1,
        limit: limit,
        remaining: limit - (currentCount + 1)
      })
    };
  } catch (error) {
    console.error('Error tracking API usage:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track API usage' })
    };
  }
};