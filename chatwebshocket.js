const WebSocket = require('ws');
const ip_api = require('./host');

// Global process error handlers to prevent sudden background crashes
process.on('uncaughtException', (err) => {
    console.error('[Load Balancer] CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Load Balancer] CRITICAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const WEBSOCKET_PORT = 3004;

// Configurable Chat API Endpoint
const CHAT_API_URL = `${ip_api.api_3003}/api/chat`; //'http://localhost:3003/api/chat';

// Initialize WebSocket Server
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

// In-memory map to store active client connections indexed by UID
// Structure: Map<string, WebSocket>
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
    // Parse query parameters from the connection URL to extract the client's UID
    // Example connection string from client: ws://localhost:3004?uid=user_12345
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const uid = urlParams.get('uid');

    console.log("urlParams: ",urlParams,", uid=",uid);

    if (!uid) {
        console.warn('[WebSocket] Connection rejected: Missing UID in query parameters.');
        ws.close(4001, 'Unauthorized: Missing UID');
        return;
    }

    // Register/overwrite the active socket connection for this UID
    connectedClients.set(uid, ws);
    console.log(`[WebSocket] Client connected and registered -> UID: ${uid}`);

    // Send an immediate welcome message upon successful connection (optional/commented out)
    /*ws.send(JSON.stringify({
        status: 'success',
        message: `Hello from WebSocket server, user ${uid}! Connection established.`
    }));*/


    // Handle incoming messages from the client if needed
    ws.on('message', (msg) => {
        console.log(`[WebSocket] Message received from UID ${uid}:`, msg.toString());
        try {
            const parsedMessage = JSON.parse(msg.toString());

            // Example payload format: { type: 'PRIVATE_MSG', targetId: 'xyz123', text: 'Hi!' }
            if (parsedMessage.action) {
                const __clientShocket = connectedClients.get(parsedMessage.uid);

                // Check if the target client exists and is still connected
                if (__clientShocket && __clientShocket.readyState === ws.OPEN && isValidJSON(msg.toString())) {

                    (async () => {
                            try {
                                const __msg = JSON.parse(msg.toString());
                                const resp = await sendRequest(__msg);
                                console.log(`chatwebshocket > resp > uid = ${uid}, response > ${JSON.stringify(resp)}`);

                                // Check if the WebSocket connection is open before sending
                                if (__clientShocket && __clientShocket.readyState === WebSocket.OPEN) {
                                    __clientShocket.send(JSON.stringify(resp));
                                    //__clientShocket.send(parseAndCleanResponse(JSON.stringify(resp)));
                                } else {
                                    console.warn("WebSocket is not open. Current readyState:", __clientShocket?.readyState);
                                }
                                
                            } catch (error) {
                                console.error("Error processing chat websocket message:", error);
                            }
                        })();

                } else {
                    // Tell the sender the user wasn't found
                    ws.send(JSON.stringify({ type: 'ERROR', payload: 'Recipient not found or offline.' }));
                }
            }
            } catch (e) {
            console.error('Invalid JSON', e);
            }
    });

    // Handle client disconnection
    ws.on('close', () => {
        connectedClients.delete(uid);
        console.log(`[WebSocket] Client disconnected -> UID: ${uid}`);
    });

    // Handle socket errors
    ws.on('error', (error) => {
        console.error(`[WebSocket Error] UID ${uid}:`, error.message);
    });
});

const parseAndCleanResponse = (responseText) => {
    try {
      // Step 1: Parse the outer JSON structure
      let parsed = JSON.parse(responseText);

      // Step 2: If the 'raw' property is a stringified JSON, parse it too
      if (parsed && typeof parsed.raw === 'string') {
        try {
          parsed.raw = JSON.parse(parsed.raw);
        } catch (innerError) {
          console.warn('[WARNING] Inner "raw" JSON failed to parse (possibly truncated):', innerError.message);

          // Optional Fallback: Clean stray slashes if the inner string is malformed
          const cleanedRawString = parsed.raw
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

          try {
            parsed.raw = JSON.parse(cleanedRawString);
          } catch (fallbackError) {
            // If it's truncated (like your example ending in timestamp:\"20), 
            // you can keep it as a raw string or handle the truncation gracefully.
            console.error('[ERROR] Fallback parse failed:', fallbackError.message);
          }
        }
      }

      return parsed;
    } catch (err) {
      console.error('[CRITICAL PARSE ERROR]:', err.message);
      return null;
    }
  }

function isValidJSON(str) {
    if (typeof str !== 'string') return false;
    try {
        const parsed = JSON.parse(str);
        // Ensure it parses into an object or array (not just a raw string/number/boolean)
        return parsed !== null && typeof parsed === 'object';
    } catch (e) {
        return false;
    }
}

/**
 * Sends an action request to the Chat API gateway.
 * @param {Object} input - Input parameters payload
 * @param {string} input.action - The action to perform (e.g., 'read_message')
 * @param {string} input.uid - The user ID associated with the request
 * @returns {Promise<Object>} - The JSON response from the API
 */
async function sendRequest(input) {
    console.log("sendRequest > input > ", JSON.stringify(input));
    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[WebSocket] sendRequest Error:', error.message);
        return {
            status: 'error',
            message: 'Failed to communicate with chat API endpoint',
            details: error.message
        };
    }
}

/**
 * Pushes a hello/notification message to a specific connected client by their UID.
 * @param {string} uid - The target user's unique identifier
 * @param {string} [customMessage] - Optional custom message to push
 * @returns {boolean} - Returns true if the client was found and message was sent, false otherwise
 */
function sendHelloToClient(uid, customMessage) {
    const clientSocket = connectedClients.get(uid);

    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        const payload = {
            action: 'push_hello',
            message: customMessage || `Hello! This is a pushed message for UID: ${uid}`,
            timestamp: new Date().toISOString()
        };

        clientSocket.send(JSON.stringify(payload));
        console.log(`[WebSocket] Successfully pushed message to UID: ${uid}`);
        return true;
    }

    console.warn(`[WebSocket] Failed to push message: Client with UID ${uid} is not connected.`);
    return false;
}

console.log(`[WebSocket Server] Running on ws://localhost:${WEBSOCKET_PORT}`);

// Export functions and connected clients map so they can be imported elsewhere
module.exports = {
    sendRequest,
    sendHelloToClient,
    connectedClients
};