const { EventEmitter } = require('events');

// Increase default listener threshold to avoid MaxListenersExceededWarning on concurrent tasks
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const dbutil = require('./dbutil');
const calldbapi = require('./calldbapi');
const pdfConverter = require('./PdfConverter');
const ip_api = require('./host');

const app = express();
const PORT = 3001;

// Security Middleware - Disable default CSP on API server to prevent blocking cross-origin requests
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS Middleware - Configured for port 5173 (Vite) and port 3001
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001','http://amgreat.id','https://amgreat.id',`${ip_api.api_3000}`,`${ip_api.api_3001}`,`${ip_api.front_end}`
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
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware to parse JSON payloads
app.use(express.json());

/**
 * POST /api/query
 * Invokes dbutil.getObjectRecords with the incoming request body payload.
 */
app.post('/api/query', async (req, res) => {
  try {
    const result = await dbutil.getObjectRecords(req.body);
    res.status(result.success !== false ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/get-list
 */
app.post('/api/get-list', async (req, res) => {
  try {
    const { groupid } = req.body;
    if (!groupid) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'groupid' in JSON body."
      });
    }
    const result = await dbutil.getList(req.body);
    res.status(result.success !== false ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/colList
 */
app.post('/api/colList', async (req, res) => {
  try {
    const { col_id, sessionid } = req.body;
    if (!col_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'col_id' in JSON body."
      });
    }
    const result = await dbutil.getListForColumnId({ col_id, sessionid });
    res.status(result.success !== false ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/get-object-schema
 */
app.post('/api/get-object-schema', async (req, res) => {
  try {
    const objectid = req.body.objectid || req.body.tableName;
    if (!objectid) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'objectid' in JSON body."
      });
    }
    const result = await calldbapi.getTableColumns(objectid);
    console.log("/api/get-object-schema: ", objectid, "result: ", JSON.stringify(result));
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/html-to-pdf
 */
app.post('/api/html-to-pdf', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        sessionid: req.body?.sessionid || '',
        objectid: req.body?.objectid || '',
        files: [],
        error: "Missing or empty 'files' array in JSON body."
      });
    }
    const result = await pdfConverter.htmlToPdf(req.body);
    res.status(result.error ? 500 : 200).json(result);
  } catch (err) {
    res.status(500).json({
      sessionid: req.body?.sessionid || '',
      objectid: req.body?.objectid || '',
      files: [],
      error: err.message
    });
  }
});

// Start Utility API Server on port 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️  Util API Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS allowed for: ${allowedOrigins.join(', ')}`);
});