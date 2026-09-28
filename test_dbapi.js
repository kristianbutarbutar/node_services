const API_URL = 'http://localhost:3000/api/query-object';

async function testQueryObjectAPI() {
  console.log('=== Testing POST /api/query-object ===\n');

  // Sample JSON payload matching the expected format
  const samplePayload = {
    tableName: 'employees'
  };

  console.log('Sending Payload:', JSON.stringify(samplePayload, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(samplePayload)
    });

    const result = await response.json();

    console.log(`\nHTTP Status Code: ${response.status}`);
    console.log('Response JSON Output:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ API Call Failed:', error.message);
  }
}

testQueryObjectAPI();