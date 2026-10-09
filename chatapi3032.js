const express = require('express');
const net = require('net');
const helmet = require('helmet');
const cors = require('cors');
const ip_api = require('./host');

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Middleware - Configured for Vite (5173) and local client/server (3000)
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3003',
    'http://127.0.0.1:3003','http://amgreat.id','https://amgreat.id',`${ip_api.api_3000}`,`${ip_api.api_3003}`,`${ip_api.front_end}`
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: Access denied for origin ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
    credentials: true
}));

// Middleware to parse incoming JSON payloads
app.use(express.json());

const CHAT_SERVER_PORT = 8080;//3333;
const CHAT_SERVER_HOST = '127.0.0.1';
const API_PORT = 3032;

// Configurable Query Object API URL
const QUERY_OBJECT_API_URL = `${ip_api.api_3000}/api/query-object`;//'http://localhost:3000/api/query-object';

const __fetchRecord = async (payload) => {
    if (!payload) return '';

    /*const payload = {
        objectid: 'PORTAL_USER_FORM_ID',
        whereClause: [{ col_name: 'id', value: idValue }],
        filterColumns: ['uid']
    };*/

    try {
        const response = await fetch(QUERY_OBJECT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        console.log("__fetchRecord >> ", JSON.stringify(responseData));

        return responseData;

    } catch (error) {
        console.error(`[__fetchRecord Error for :`, error.message);
        return '';
    }
};

/**
 * Fetches and maps record UIDs for sender and receiver based on input parameters.
 * @param {Object} input - Input parameters containing uid and touid
 * @param {string} input.uid - Sender ID to query
 * @param {string} input.touid - Receiver ID to query
 * @returns {Promise<{uid: string, touid: string}>}
 */
async function getObjectRecords(input) {

    if (!input || !input.uid) return {};

    const fetchRecord = async (idValue) => {
        if (!idValue) return '';

        const payload = {
            objectid: 'PORTAL_USER_FORM_ID',
            whereClause: [{ col_name: 'id', value: idValue }],
            filterColumns: ['uid']
        };

        try {
            const response = await fetch(QUERY_OBJECT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();

            console.log("fetch response > ", idValue, ", >> ", JSON.stringify(responseData));

            return responseData?.data[0].uid || '';
        } catch (error) {
            console.error(`[getObjectRecords Error for id: ${idValue}]:`, error.message);
            return '';
        }
    };

    // Fetch __uid
    const __uid = await fetchRecord(input.uid);
    let __touid = [];

    console.log("input.touid > ", JSON.stringify(input));

    if (input && Array.isArray(input.touid)) {
        console.log("input.touid 2 > input.touid > ", JSON.stringify(input.touid));

        // Create an array of promises for concurrent fetching
        const promises = input.touid.map(async (tuid) => {
            const id = await fetchRecord(tuid);
            console.log("input.touid 3 > input.touid > ", id);
            return id;
        });

        // Wait for all promises to resolve
        const results = await Promise.all(promises);

        // Filter out any empty strings and assign to __touid
        __touid = results.filter(id => id !== '');

        console.log("input.touid 4 > input.touid > ", JSON.stringify(__touid));
    }

    return {
        uid: __uid,
        touid: __touid
    };
}

/**
 * Helper function to communicate with C++ TCP Socket Server 
 * using newline-delimited framing and timeout safeguards.
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
function sendToCppServer(payload) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let responseData = '';
        let settled = false;

        client.connect(CHAT_SERVER_PORT, CHAT_SERVER_HOST, () => {
            // Append a newline delimiter so the C++ server knows where the JSON payload ends
            client.write(JSON.stringify(payload) + '\n');
        });

        client.on('data', (data) => {
            responseData += data.toString();
        });

        client.on('close', () => {
            if (settled) return;
            settled = true;
            try {
                resolve(JSON.parse(responseData.trim()));
            } catch (e) {
                resolve({ status: 'success', raw: responseData.trim() });
            }
        });

        client.on('error', (err) => {
            if (settled) return;
            settled = true;
            reject(err);
        });

        // Set a 5-second safety timeout to prevent hanging connections
        client.setTimeout(5000, () => {
            client.destroy();
            if (!settled) {
                settled = true;
                reject(new Error('TCP connection to C++ server timed out'));
            }
        });
    });
}

// POST /api/chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { action, uid, touid, message, timestamp, fromseqno } = req.body;

        if (!action || !uid) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: action and uid'
            });
        }

        console.log("uid > ", uid, " > touid ", JSON.stringify(touid));
        if (!touid) {

            const payload = {
                objectid: 'PORTAL_USER_FORM_ID',
                whereClause: [{ col_name: 'pid', value: uid }],
                filterColumns: ['uid']
            };

            const __resp = __fetchRecord(payload);

            if (__resp && __resp?.data) {
                let __touid = [];
                __resp?.data.map((__id) => {
                    __touid.push(__id);
                });
                touid = __touid;
            }

        }
        // Resolve mapped records using the new function
        console.log("/api/chat touid[]", JSON.stringify(touid));

        const resolvedRecords = await getObjectRecords({ uid, touid });

        console.log("resolvedRecords > uid and touid[] > ", JSON.stringify(resolvedRecords));

        if (!resolvedRecords || !resolvedRecords?.uid) {
            return res.status(400).json({ status: "error", message: "Failed to resolve sender record" });
        }

        // Construct payload to forward to C++ socket server using resolved values
        let socketPayload = {
            action,
            uid: resolvedRecords.uid,
            touid: resolvedRecords.touid,
            message: message || '',
            timestamp: timestamp || new Date().toISOString()
        };

        if (action && action.toLowerCase() === 'read_message' && resolvedRecords.touid && resolvedRecords.touid.length > 0) {
            console.log("fromseqno > ", fromseqno);
            socketPayload = { action, uid: resolvedRecords.uid, touid: resolvedRecords.touid, fromseqno: fromseqno };
        }

        console.log("socketPayload > ", JSON.stringify(socketPayload));

        const serverResponse = await sendToCppServer(socketPayload);

        console.log("serverResponse > ", serverResponse);

        const __parsed = parseValidJsonResponse(serverResponse);
        
        if(socketPayload && socketPayload.action === 'read_message'){
            
            console.log("serverResponse > read_message clear", JSON.stringify(__parsed));
        }

        return res.status(200).json(__parsed.raw);

    } catch (error) {
        console.error('[API Gateway Error]:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to communicate with chat server',
            details: error.message
        });
    }
});

function parseValidJsonResponse(responseObj) {
  let parsedRaw = null;

  try {
    // Case 1: If the input itself is already the data object containing `node`
    if (responseObj && Array.isArray(responseObj.node)) {
      parsedRaw = responseObj;
    } 
    // Case 2: If it's wrapped inside `responseObj.raw` as an object
    else if (typeof responseObj?.raw === 'object' && responseObj.raw !== null) {
      parsedRaw = responseObj.raw;
    } 
    // Case 3: If it's wrapped as a JSON string in `responseObj.raw`
    else if (typeof responseObj?.raw === 'string') {
      try {
        parsedRaw = JSON.parse(responseObj.raw);
      } catch (parseErr) {
        console.warn('[WARN] Raw JSON string is malformed or cut off. Attempting repair...');
        
        let fixedString = responseObj.raw.trim();
        const lastCompleteObjectIndex = fixedString.lastIndexOf('}');
        
        if (lastCompleteObjectIndex !== -1) {
          fixedString = fixedString.substring(0, lastCompleteObjectIndex + 1);
        }
        
        fixedString += ']}';
        parsedRaw = JSON.parse(fixedString);
      }
    }
  } catch (err) {
    console.error('[ERROR] Failed to parse raw data:', err.message);
    parsedRaw = { node: [] };
  }

  return {
    status: responseObj?.status || 'success',
    raw: parsedRaw
  };
}

const parseAndCleanResponse = (responseText) => {
    try {
      // Step 1: Parse the outer JSON structure

      console.log("parseAndCleanResponse > responseText > ", responseText);
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

/**
 * Registers chat users by fetching records from the query object API
 * and forwarding each user entry to the C++ TCP socket server.
 * @returns {Promise<Object>} Aggregated responses from the server
 */
async function registerChatUser() {
    const queryPayload = {
        objectid: 'PORTAL_USER_FORM_ID',
        whereClause: [],
        filterColumns: ['uid', 'email']
    };

    const response = await fetch(QUERY_OBJECT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! query object status: ${response.status}`);
    }

    const responseData = await response.json();
    const records = responseData?.data || [];

    const results = [];

    for (const record of records) {
        if (!record || !record.uid) continue;

        const __add_user_payload = {
            action: 'add_user',
            uid: record.uid,
            name: record.uid,
            levelStr: '1',
            status: 'A'
        };

        console.log("registerChatUser __add_user_payload > ", JSON.stringify(__add_user_payload));

        const serverResponse = await sendToCppServer(__add_user_payload);
        results.push(serverResponse);
    }

    return {
        status: 'success',
        totalProcessed: results.length,
        responses: results
    };
}

// POST /api/chat/register endpoint
app.post('/api/chat/register', async (req, res) => {
    try {
        const serverResponse = await registerChatUser();
        return res.status(200).json(serverResponse);

    } catch (error) {
        console.error('[API Gateway Register Error]:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to register chat users with server',
            details: error.message
        });
    }
});

// GET /api/loadChatUser endpoint
app.get('/api/loadChatUser', async (req, res) => {
    try {
        const serverResponse = await registerChatUser();
        return res.status(200).json(serverResponse);

    } catch (error) {
        console.error('[API Gateway Load Chat User Error]:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to load and register chat users with server',
            details: error.message
        });
    }
});

app.listen(API_PORT,'0.0.0.0', () => {
    console.log(`[Chat API Gateway] Running on http://localhost:${API_PORT}`);
});