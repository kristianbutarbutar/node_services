// fileapimulter.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const { Storage } = require('@google-cloud/storage');

const app = express();

// Initialize GCP Storage client
const storage = new Storage();

// Configuration constants
const PORT = process.env.FILE_API_PORT || process.env.FILE_PORT || 3002;
const SAVE_OBJECT_ENDPOINT = process.env.SAVE_OBJECT_ENDPOINT || 'http://localhost:3000/api/save-object';
const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'amgreat-app-public-assets';
const GCP_DEST_FOLDER = process.env.GCP_DEST_FOLDER || 'upload-image';

// Allowed Origins List
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

// CORS Options
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
};

// 1. CORS Middleware applied globally
app.use(cors(corsOptions));

// 2. Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// 3. Body Parsers with 100MB limit for Base64 payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Directory Resolution
const configuredBasePath = '/Users/admin/Documents/gemini_src_dev_react';
const uploadBase = fs.existsSync(configuredBasePath)
  ? configuredBasePath
  : path.resolve(__dirname);

const uploadDir = path.join(uploadBase, 'fileuploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed extensions and MIME types
const allowedExts = ['jpg', 'jpeg', 'png', 'pdf', 'sql', 'txt', 'html'];
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'text/plain',
  'application/sql',
  'application/x-sql',
  'text/x-sql',
  'application/octet-stream',
  'application/x-html',
  'text/x-html',
  'text/html'
];

/**
 * Helper to map extension to content type
 */
function getMimeTypeByExt(ext) {
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
    txt: 'text/plain',
    sql: 'application/sql',
    html: 'text/html'
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * GET /api/read
 * Serves file directly from local disk first; falls back to streaming via GCP Storage SDK
 */
app.get('/api/read', async (req, res) => {
  try {
    const fileName = req.query.fileName || req.query.filename || '';
    const sessionid = req.query.sessionid || req.headers['x-session-id'] || '';

    if (!fileName) {
      return res.status(400).json({
        success: false,
        sessionid,
        error: "Missing required parameter 'fileName'."
      });
    }

    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const contentType = getMimeTypeByExt(ext);

    console.log("fileName > 1 > ", fileName )
    // 1. Check local storage first
    const localFilePath = path.join(uploadDir, fileName);
    if (fs.existsSync(localFilePath)) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      if (sessionid) res.setHeader('x-session-id', sessionid);
      return fs.createReadStream(localFilePath).pipe(res);
    }
    console.log("fileName > 2 > ", fileName )

    // 2. Fall back to GCS via Storage client
    const blobPath = `${GCP_DEST_FOLDER}/${fileName}`;
    const file = storage.bucket(GCP_BUCKET_NAME).file(blobPath);
    
    console.log("fileName > 3 > blobPath > ", blobPath )
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({
        success: false,
        sessionid,
        error: `File '${fileName}' not found in local storage or GCS gs://${GCP_BUCKET_NAME}/${blobPath}`
      });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    if (sessionid) res.setHeader('x-session-id', sessionid);

    console.log("fileName > 4 > blobPath > ", fileName )

    return file.createReadStream()
      .on('error', (streamErr) => {
        console.error('GCS stream error:', streamErr);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: streamErr.message });
        }
      })
      .pipe(res);

  } catch (err) {
    console.error('Error in /api/read:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while reading file.'
    });
  }
});

/**
 * Archives uploaded files and records status into database objects via /api/save-object.
 */
async function archieveUploadedFiles(input, endpoint = SAVE_OBJECT_ENDPOINT) {
  const { savedFiles = [], isSuccess = 'false', sessionid = '', htmleditor = '' } = input || {};
  const results = {
    response1: null,
    id: '',
    fileResponses: [],
    success: false
  };

  try {
    const payload1 = {
      objectid: htmleditor && htmleditor!=='' ? 'fdeb98a5-9217-482a-9f2d-051ebe5b7c59' : 'OBJ_UPLOADED_FORM_ID',
      columns: [
        { col_name: 'status', value: isSuccess }
      ]
    };

    const res1 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionid ? { 'x-session-id': sessionid } : {})
      },
      body: JSON.stringify(payload1)
    });

    const response1 = await res1.json();
    results.response1 = response1;

    const isSuccessMatch = String(isSuccess) === 'true' || isSuccess === true;
    const isResponseStatusTrue = String(response1?.status || response1?.success) === 'true' || response1?.status === true;

    if (isSuccessMatch && isResponseStatusTrue && Array.isArray(savedFiles)) {
      for (const file of savedFiles) {
        const payload2 = {
          objectid: 'UPLOADED_FILES_FORM_ID',
          columns: [
            { col_name: 'pid', value: response1.id || '' },
            { col_name: 'originalName', value: file.originalName },
            { col_name: 'savedName', value: file.savedName },
            { col_name: 'size', value: file.size },
            { col_name: 'mimetype', value: file.mimetype },
            { col_name: 'path', value: file.path }
          ]
        };

        const res2 = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionid ? { 'x-session-id': sessionid } : {})
          },
          body: JSON.stringify(payload2)
        });

        const response2 = await res2.json();
        results.fileResponses.push(response2);
      }
    }
    results.success = true;
    results.id = response1.id;
    return results;
  } catch (err) {
    console.error('Error in archieveUploadedFiles:', err);
    return {
      ...results,
      success: false,
      error: err.message
    };
  }
}

/**
 * Copies files into a Google Cloud Platform (GCP) Bucket folder.
 */
async function copyToGCPBucket(input) {
  const { sessionid = '', bucketName = GCP_BUCKET_NAME, destFolder = GCP_DEST_FOLDER, file = [] } = input || {};
  const uploadResults = [];
  const errors = [];

  if (!Array.isArray(file) || file.length === 0) {
    return {
      success: false,
      status: 'false',
      sessionid,
      message: 'No files provided for GCP bucket upload.',
      uploadedFiles: [],
      errors: ['File list is empty or not an array.']
    };
  }

  const bucket = storage.bucket(bucketName);

  for (let i = 0; i < file.length; i++) {
    const item = file[i] || {};
    const srcFolder = item.srcfolder || item.srcFolder || uploadDir;
    const fileName = item.name || '';
    const contentType = item.contentType || 'application/octet-stream';

    if (!fileName) {
      errors.push({ index: i, error: 'Missing filename.' });
      continue;
    }

    const fullSourcePath = path.resolve(srcFolder, fileName);

    try {
      if (!fs.existsSync(fullSourcePath)) {
        throw new Error(`Source file does not exist at path: ${fullSourcePath}`);
      }

      const destinationBlobName = path.join(destFolder, fileName).replace(/\\/g, '/');

      await bucket.upload(fullSourcePath, {
        destination: destinationBlobName,
        metadata: {
          contentType: contentType
        }
      });

      console.log(`Successfully uploaded ${fileName} to gs://${bucketName}/${destinationBlobName}`);

      uploadResults.push({
        bucket: bucketName,
        destinationPath: destinationBlobName,
        filename: fileName,
        contentType,
        status: 'uploaded'
      });
    } catch (err) {
      errors.push({
        filename: fileName,
        error: err.message
      });
    }
  }

  const isSuccess = uploadResults.length > 0;
  return {
    success: isSuccess,
    status: isSuccess ? 'true' : 'false',
    sessionid,
    bucketName,
    destFolder,
    uploadedFiles: uploadResults,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * POST /api/upload
 */
app.post('/api/upload', async (req, res) => {
  const { sessionid = '', message = '', files = [], htmleditor = '' } = req.body || {};

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      success: false,
      status: 'false',
      sessionid,
      message: 'No files provided in files array.',
      files: []
    });
  }

  const savedFiles = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const item = files[i] || {};
    const originalName = item.filename || item.name || `file_${Date.now()}_${i}`;
    const mimetype = (item.mimetype || item.type || 'application/octet-stream').toLowerCase();
    let rawData = item.fileData || item.base64 || item.data || '';

    const ext = path.extname(originalName).toLowerCase().replace('.', '');

    const isExtValid = allowedExts.includes(ext) || ext === '';
    const isMimeValid = allowedMimeTypes.includes(mimetype) || mimetype === 'application/octet-stream';

    if (!isExtValid && !isMimeValid) {
      errors.push({
        filename: originalName,
        error: `File type not allowed. Extension: .${ext}, MIME: ${mimetype}`
      });
      continue;
    }

    if (!rawData) {
      errors.push({
        filename: originalName,
        error: 'Missing fileData (Base64 string).'
      });
      continue;
    }

    try {
      if (typeof rawData === 'string' && rawData.includes(';base64,')) {
        rawData = rawData.split(';base64,')[1];
      }

      const cleanBase64 = typeof rawData === 'string' ? rawData.trim() : rawData;
      const buffer = Buffer.isBuffer(cleanBase64) ? cleanBase64 : Buffer.from(cleanBase64, 'base64');

      const extWithDot = path.extname(originalName) || `.${ext || 'bin'}`;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const savedName = `files-${uniqueSuffix}${extWithDot}`;
      const destinationPath = path.join(uploadDir, savedName);

      await fsPromises.writeFile(destinationPath, buffer);

      savedFiles.push({
        originalName,
        savedName,
        size: buffer.length,
        mimetype,
        path: destinationPath
      });
    } catch (err) {
      errors.push({
        filename: originalName,
        error: err.message
      });
    }
  }

  const isSuccess = savedFiles.length > 0;
  const archiveResult = await archieveUploadedFiles({
    savedFiles,
    isSuccess: isSuccess ? 'true' : 'false',
    sessionid, htmleditor:htmleditor,
  });

  let gcpBucketResult = null;
  if (archiveResult && archiveResult.success && savedFiles.length > 0) {
    gcpBucketResult = await copyToGCPBucket({
      sessionid: sessionid,
      bucketName: GCP_BUCKET_NAME,
      destFolder: GCP_DEST_FOLDER,
      file: savedFiles.map((file) => ({
        name: file.savedName,
        srcFolder: path.dirname(file.path),
        contentType: file.mimetype
      }))
    });
  }

  return res.status(isSuccess ? 200 : 400).json({
    success: isSuccess,
    status: isSuccess ? 'true' : 'false',
    sessionid,
    message: message || (isSuccess ? `${savedFiles.length} file(s) processed successfully.` : 'File processing failed.'),
    id: isSuccess ? archiveResult.id : '',
    files: savedFiles,
    archive: archiveResult,
    gcpUpload: gcpBucketResult,
    errors: errors.length > 0 ? errors : undefined
  });
});

// JSON parsing & global error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      status: 'false',
      error: "Payload too large. Base64 file exceeds upload limit."
    });
  }
  return res.status(500).json({
    success: false,
    status: 'false',
    error: err.message || 'Internal server error'
  });
});

// Start Server with error listening
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Base64 Upload Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process!`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});