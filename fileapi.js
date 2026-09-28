const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const filestore = require('./filestore');

const app = express();
const PORT = process.env.FILE_API_PORT || 3002;

// Security & CORS Configuration
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: Access denied for origin ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body Parsers for JSON and URL-encoded data (supports large Base64 files up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage to directly forward file buffers
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

/**
 * POST /api/uploadFiles
 * 
 * Supports two payload formats:
 * 1. multipart/form-data:
 *    - form fields: destPath, folderName, sessionid
 *    - form files: 'files' field (multiple files supported)
 * 
 * 2. application/json:
 *    - JSON body: { destPath, folderName, sessionid, files: [{ fileName, base64 / content }] }
 */
app.post('/api/uploadFiles', upload.array('files'), async (req, res) => {
    try {
        let uploadPayload = {};

        // Check if multipart/form-data files were uploaded
        if (req.files && req.files.length > 0) {
            uploadPayload = {
                destPath: req.body.destPath || './uploads',
                folderName: req.body.folderName || '',
                sessionid: req.body.sessionid || '',
                files: req.files.map(file => ({
                    fileName: file.originalname,
                    buffer: file.buffer,
                    size: file.size,
                    mimetype: file.mimetype
                }))
            };
        } else {
            // Fallback to JSON body format
            uploadPayload = {
                destPath: req.body.destPath || './uploads',
                folderName: req.body.folderName || '',
                sessionid: req.body.sessionid || '',
                files: req.body.files || []
            };
        }

        if (!uploadPayload.files || uploadPayload.files.length === 0) {
            return res.status(400).json({
                success: false,
                sessionid: uploadPayload.sessionid,
                error: "No files provided in multipart 'files' field or JSON 'files' array."
            });
        }

        // Process files through filestore.js
        const result = await filestore.uploadFile(uploadPayload);

        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error("Error in /api/uploadFiles:", err);
        res.status(500).json({
            success: false,
            error: err.message || "Internal server error during file upload."
        });
    }
});

// Start File API Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📁 File API Server running on http://localhost:${PORT}`);
    console.log(`📡 CORS allowed for: ${allowedOrigins.join(', ')}`);
});

module.exports = app;