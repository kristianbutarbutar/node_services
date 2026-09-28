const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const calldbapi = require('./calldbapi');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Middleware - Configured for Vite (5173) and local client/server (3000)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
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

/**
 * GET /api/columns/:tableName
 * Alternative POST /api/columns
 * Fetches column definitions for a given table name from t_t_cols_def.
 */
app.get('/api/columns/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await calldbapi.getTableColumns(tableName);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/columns', async (req, res) => {
  try {
    const { v_table_name } = req.body;
    if (!v_table_name) {
      return res.status(400).json({ success: false, error: "Missing required parameter 'v_table_name' in JSON body." });
    }
    const result = await calldbapi.getTableColumns(v_table_name);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/query-object
 * Calls queryObject(tableName, whereClause) to return matching array records.
 */
app.post('/api/query-object', async (req, res) => {
  try {
    const tableName = req.body.tableName || req.body.objectid;
    const whereClause = req.body.whereClause || [];
    const filterColumns = req.body.filterColumns || [];

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'objectid' in JSON body."
      });
    }

    if (!Array.isArray(whereClause)) {
      return res.status(400).json({
        success: false,
        error: "Invalid parameter 'whereClause'. It must be an array of condition objects."
      });
    }
    //console.log("/api/query-object payload ", JSON.stringify(req.body));
    const result = await calldbapi.queryObject(tableName, whereClause, filterColumns);
    //console.log("/api/query-object result ", JSON.stringify(result));

    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/query-object-in-table
 * Calls queryObjectInTable(tableName, whereClause, row_start, row_end) to dynamically
 * fetch table records and return an HTML <table> for the specified row sequence range.
 */
app.post('/api/query-object-in-table', async (req, res) => {
  try {
    const tableName = req.body.tableName || req.body.objectid;
    const whereClause = req.body.whereClause || [];
    const row_start = req.body.row_start ?? req.body.rowStart ?? 1;
    const row_end = req.body.row_end ?? req.body.rowEnd ?? null;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'tableName' (or 'v_table_name') in JSON body."
      });
    }

    if (!Array.isArray(whereClause)) {
      return res.status(400).json({
        success: false,
        error: "Invalid parameter 'whereClause'. It must be an array of condition objects."
      });
    }

    const result = await calldbapi.queryObjectInTable(tableName, whereClause, row_start, row_end);

    //console.log("/api/query-object-in-table Request: table: ", tableName, ", whereClause", JSON.stringify(whereClause));
    //console.log("/api/query-object-in-table Result: ", JSON.stringify(result));

    if (res !== undefined && !res.success) {
      res.status(result.success ? 200 : 400).json(result);
    }

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const overrideMandatoryColumns = (formData) => {
        formData.columns.some(col => {
        const name = col.col_name;
        if(name && String(name).toLowerCase() === 'createdby'){
            col.value = 'TEST';
        }
      });
      return formData;
}

/**
 * POST /api/save-object
 * Calls saveForm(formData) to automatically fetch metadata, generate an INSERT statement,
 * execute it, and return a JSON payload with the execution result and sessionid.
 */
app.post('/api/save-object', async (req, res) => {
  try {
    const objectid = req.body.objectid || req.body.tableName;

    if (!objectid) {
      return res.status(400).json({
        success: false,
        sessionid: req.body.sessionid || '',
        error: "Missing required parameter 'objectid' in JSON body."
      });
    }
    //console.log("API Save Object => ", JSON.stringify(req.body));
    const saveResult = await calldbapi.saveForm(overrideMandatoryColumns(req.body));

    const sessionid = req.body.sessionid || req.headers['x-session-id'] || '';

    const responsePayload = {
      ...saveResult,
      sessionid: sessionid
    };

    res.status(saveResult.success ? 200 : 400).json(responsePayload);
  } catch (err) {
    res.status(500).json({
      success: false,
      sessionid: req.body.sessionid || '',
      error: err.message
    });
  }
});

/**
 * POST /api/drop-object
 * Accepts JSON payload { tableName, recordid, sessionid } and calls calldbapi.dropObject()
 */
app.post('/api/drop-object', async (req, res) => {
  try {
    const result = await calldbapi.dropObject(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      sessionid: req.body?.sessionid || '',
      error: err.message
    });
  }
});

/**
 * POST /api/drop
 * Accepts JSON payload { tableName, sessionid, column } and calls calldbapi.dropObjectItems()
 */
app.post('/api/drop', async (req, res) => {
  try {

    const result = await calldbapi.dropObjectItems(req.body);
    res.status(result.success ? 200 : 400).json(result);

    if (result.success == 200 && req.body && req.body.children && req.body.children.length > 0) {
      req.body.children.forEach(async (obj, index) => {
        const rst = await calldbapi.dropObjectItems(obj);
      });
    }

  } catch (err) {
    res.status(500).json({
      success: false,
      sessionid: req.body?.sessionid || '',
      error: err.message
    });
  }
});

/**
 * POST /api/update-object
 * Accepts JSON payload { tableName, recordid, columns, sessionid } and calls calldbapi.updateObject()
 */
app.post('/api/update-object', async (req, res) => {
  try {
    const result = await calldbapi.updateObject(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      sessionid: req.body?.sessionid || '',
      error: err.message
    });
  }
});

/**
 * POST /api/query
 * Executes a raw SELECT query payload.
 */
app.post('/api/query', async (req, res) => {
  try {
    const result = await calldbapi.executeQuery(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/insert
 * Executes an INSERT query payload.
 */
app.post('/api/insert', async (req, res) => {
  try {
    const result = await calldbapi.executeInsert(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/update
 * Executes an UPDATE query payload.
 */
app.post('/api/update', async (req, res) => {
  try {
    const result = await calldbapi.executeUpdate(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/delete
 * Executes a DELETE query payload.
 */
app.post('/api/delete', async (req, res) => {
  try {
    const result = await calldbapi.executeDelete(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express HTTP Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️  Secure DB API Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS allowed for: ${allowedOrigins.join(', ')}`);
});