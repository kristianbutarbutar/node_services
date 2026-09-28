const path = require('path');
const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');
const { EventEmitter } = require('events');

EventEmitter.defaultMaxListeners = 50;

/**
 * Creates an isolated Google Cloud Storage client instance.
 */
function createStorageClient() {
  return new Storage({
    keyFilename: process.env.GCP_KEY_FILE || undefined,
    projectId: process.env.GCP_PROJECT_ID || undefined
  });
}

/**
 * Explicitly closes storage client connections.
 */
async function closeStorageClient(storageInstance) {
  if (!storageInstance) return;
  try {
    if (typeof storageInstance.close === 'function') {
      await storageInstance.close();
    }
  } catch (_) { }
}

/**
 * Reads and downloads files inside a GCP Cloud Storage bucket folder.
 * 
 * @param {Object} input - { sessionid, bucketName, folderPath, downloadContent }
 * @returns {Promise<Object>} File metadata and downloaded contents
 */
async function readGCPStorageBucketFolder(input) {
  const { sessionid = '', bucketName = '', folderPath = '', downloadContent = true } = input || {};

  if (!bucketName) {
    return { success: false, sessionid, error: "Missing required parameter 'bucketName'" };
  }

  const storage = createStorageClient();

  try {
    const bucket = storage.bucket(bucketName);
    let prefix = folderPath ? folderPath.trim() : '';
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    const [files] = await bucket.getFiles({ prefix });
    const fileList = [];

    for (const file of files) {
      if (file.name === prefix) continue;

      const [metadata] = await file.getMetadata();
      const item = {
        name: path.basename(file.name),
        fullPath: file.name,
        size: metadata.size,
        contentType: metadata.contentType,
        updated: metadata.updated
      };

      if (downloadContent) {
        const [contentBuffer] = await file.download();
        item.content = contentBuffer.toString('utf-8');
      }

      fileList.push(item);
    }

    return {
      success: true,
      sessionid,
      bucketName,
      folderPath: prefix,
      count: fileList.length,
      files: fileList
    };
  } catch (err) {
    return {
      success: false,
      sessionid,
      bucketName,
      error: `Failed to read GCP storage folder: ${err.message}`
    };
  } finally {
    await closeStorageClient(storage);
  }
}

/**
 * Uploads files/buffers to a target GCP Cloud Storage bucket folder.
 * 
 * @param {Object} input - { sessionid, bucketName, folderPath, files: [{ fileName, content, contentType }] }
 * @returns {Promise<Object>} Upload status results
 */
async function writeGCPStorageBucketFolder(input) {
  const { sessionid = '', bucketName = '', folderPath = '', files = [] } = input || {};

  if (!bucketName) {
    return { success: false, sessionid, error: "Missing required parameter 'bucketName'" };
  }

  if (!Array.isArray(files) || files.length === 0) {
    return { success: false, sessionid, error: "No files provided to write" };
  }

  const storage = createStorageClient();

  try {
    const bucket = storage.bucket(bucketName);
    let destFolder = folderPath ? folderPath.trim() : '';
    if (destFolder && !destFolder.endsWith('/')) destFolder += '/';

    const uploadResults = [];

    for (const file of files) {
      const { fileName, content, contentType } = file;
      if (!fileName) continue;

      const destination = `${destFolder}${fileName}`;
      const gcsFile = bucket.file(destination);
      const dataBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

      await gcsFile.save(dataBuffer, {
        contentType: contentType || 'application/pdf',
        resumable: false
      });

      uploadResults.push({
        fileName,
        destination: `gs://${bucketName}/${destination}`,
        status: 'SUCCESS'
      });
    }

    return {
      success: true,
      sessionid,
      bucketName,
      folderPath: destFolder,
      files: uploadResults
    };
  } catch (err) {
    return {
      success: false,
      sessionid,
      bucketName,
      error: `Failed to write to GCP storage folder: ${err.message}`
    };
  } finally {
    await closeStorageClient(storage);
  }
}

/**
 * Simplified HTML-to-PDF pipeline:
 * 1. Reads the HTML files from the specified GCP Bucket & Folder.
 * 2. Renders each HTML file into a PDF buffer via Puppeteer.
 * 3. Uploads the generated PDF directly to the SAME GCP Bucket Folder.
 * 
 * @param {Object} input
 * @param {string} input.sessionid - Session identifier
 * @param {string} input.objectid - Associated object identifier
 * @param {string} input.bucketName - GCS bucket name
 * @param {string} input.folderName - Target folder/prefix inside the bucket
 * @param {Array<Object|string>} input.files - List of files (e.g. [{ name: 'invoice.html' }] or ['invoice.html'])
 * @returns {Promise<Object>} Conversion results with execution timing
 */
async function htmlToPdf(input) {
  const {
    sessionid = '',
    objectid = '',
    bucketName = '',
    folderName = '',
    files = []
  } = input || {};

  if (!bucketName || !folderName || !Array.isArray(files) || files.length === 0) {
    return {
      success: false,
      sessionid,
      objectid,
      files: [],
      error: "Missing required parameters: 'bucketName', 'folderName', or 'files'."
    };
  }

  const overallStartTime = new Date().toISOString();
  console.log(`\n======================================================`);
  console.log(`[HTML_TO_PDF_START] Bucket: ${bucketName} | Folder: ${folderName} | Files: ${files.length} | Start: ${overallStartTime}`);
  console.log(`======================================================`);

  // 1. Download/Read HTML files from GCP Storage Bucket Folder
  const readRes = await readGCPStorageBucketFolder({
    sessionid,
    bucketName,
    folderPath: folderName,
    downloadContent: true
  });

  if (!readRes.success) {
    console.error(`[HTML_TO_PDF_ERROR] Failed reading files from GCP: ${readRes.error}`);
    return {
      success: false,
      sessionid,
      objectid,
      error: readRes.error
    };
  }

  const processedFiles = [];
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (let i = 0; i < files.length; i++) {
      const fileEntry = files[i];
      const rawFileName = typeof fileEntry === 'string' ? fileEntry : (fileEntry.src || '');
      const rawPdfFileName = typeof fileEntry === 'string' ? fileEntry : (fileEntry.dest || '');

      const fileStartTime = new Date().toISOString();
      const startPerf = Date.now();

      // Normalize file base name and target PDF name
      const htmlFileName = rawFileName;
      const pdfFileName = rawPdfFileName;

      console.log(`--> [PROCESS_FILE_START] [${i + 1}/${files.length}] HTML: ${htmlFileName} -> PDF: ${pdfFileName} | Start: ${fileStartTime}`);

      // Locate downloaded file content from the bucket read result
      const matchedFile = (readRes.files || []).find(
        f => f.name === htmlFileName || f.name === rawFileName
      );

      if (!matchedFile || !matchedFile.content) {
        const fileEndTime = new Date().toISOString();
        const durationMs = Date.now() - startPerf;

        console.error(`<-- [PROCESS_FILE_FAILED] Source file '${htmlFileName}' not found in folder '${folderName}'`);

        processedFiles.push({
          name: rawFileName,
          pdfFileName,
          status: 'FAILED',
          error: `File '${htmlFileName}' not found in bucket folder`,
          startTime: fileStartTime,
          endTime: fileEndTime,
          durationMs
        });
        continue;
      }

      let page = null;
      try {
        page = await browser.newPage();
        await page.setContent(matchedFile.content, { waitUntil: 'networkidle0' });

        // 2. Generate PDF Buffer via Puppeteer
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
        });

        // 3. Upload to the same bucket folder
        const uploadRes = await writeGCPStorageBucketFolder({
          sessionid,
          bucketName,
          folderPath: folderName,
          files: [
            {
              fileName: pdfFileName,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });

        const fileEndTime = new Date().toISOString();
        const durationMs = Date.now() - startPerf;
        const uploadedDest = uploadRes.files?.[0]?.destination || `${folderName}/${pdfFileName}`;

        if (!uploadRes.success) {
          throw new Error(uploadRes.error || 'Upload to GCP failed');
        }

        processedFiles.push({
          name: rawFileName,
          pdfFileName,
          dest: uploadedDest,
          status: 'SUCCESS',
          startTime: fileStartTime,
          endTime: fileEndTime,
          durationMs
        });

        console.log(`<-- [PROCESS_FILE_END]   [${i + 1}/${files.length}] Output: ${uploadedDest} | End: ${fileEndTime} | Duration: ${durationMs}ms`);

      } catch (fileErr) {
        const fileEndTime = new Date().toISOString();
        const durationMs = Date.now() - startPerf;

        console.error(`<-- [PROCESS_FILE_FAILED] Error: ${fileErr.message} | Duration: ${durationMs}ms`);

        processedFiles.push({
          name: rawFileName,
          pdfFileName,
          status: 'FAILED',
          error: fileErr.message,
          startTime: fileStartTime,
          endTime: fileEndTime,
          durationMs
        });
      } finally {
        if (page) {
          try { await page.close(); } catch (_) { }
        }
      }
    }
  } catch (err) {
    console.error(`[CONVERSION_FATAL_ERROR] Browser initialization failure: ${err.message}`);
    return {
      success: false,
      sessionid,
      objectid,
      files: processedFiles,
      error: `Puppeteer failure: ${err.message}`
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) { }
    }
  }

  const overallEndTime = new Date().toISOString();
  console.log(`[HTML_TO_PDF_COMPLETE] Processed ${processedFiles.length} file(s) | End: ${overallEndTime}`);
  console.log(`======================================================\n`);

  return {
    success: processedFiles.every(f => f.status === 'SUCCESS'),
    sessionid,
    objectid,
    bucketName,
    folderName,
    startTime: overallStartTime,
    endTime: overallEndTime,
    files: processedFiles
  };
}

module.exports = {
  htmlToPdf,
  readGCPStorageBucketFolder,
  writeGCPStorageBucketFolder,
  closeStorageClient
};