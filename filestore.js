const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

/**
 * Ensures a directory path exists, creating all missing parent directories.
 * 
 * @param {string} dirPath - Absolute or relative directory path.
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Writes or saves uploaded files to the target destination path inside an optional subfolder.
 * Supports:
 *  - Base64 data strings / Data URLs ({ fileName, data / base64 / content })
 *  - Buffer objects ({ fileName, buffer })
 *  - Multer / Form-data file objects with temp paths ({ originalname, path })
 * 
 * @param {Object} input - Parameter object.
 * @param {string} [input.destPath='./uploads'] - Target base directory.
 * @param {string} [input.folderName=''] - Optional nested folder name inside destPath.
 * @param {Array<Object>} [input.files=[]] - Array of file descriptors or objects.
 * @param {string} [input.sessionid=''] - Optional session identifier.
 * @returns {Promise<Object>} Status report with saved file metadata.
 */
async function uploadFile(input) {
  const {
    destPath = './uploads',
    folderName = '',
    files = [],
    sessionid = ''
  } = input || {};

  if (!Array.isArray(files) || files.length === 0) {
    return {
      success: false,
      sessionid,
      savedFiles: [],
      error: "No files provided in 'files' array."
    };
  }

  // Construct target directory path
  const targetDir = path.resolve(destPath, folderName);
  await ensureDir(targetDir);

  const savedFiles = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fileName = file.fileName || file.originalname || file.name || `file_${Date.now()}_${i}`;
      const destinationFilePath = path.join(targetDir, fileName);

      // Case 1: Multer temp file path uploaded via multipart/form-data
      if (file.path && fsSync.existsSync(file.path)) {
        await fs.copyFile(file.path, destinationFilePath);
        // Optional cleanup of temp file
        try { await fs.unlink(file.path); } catch (_) {}
      }
      // Case 2: In-memory Buffer
      else if (file.buffer && Buffer.isBuffer(file.buffer)) {
        await fs.writeFile(destinationFilePath, file.buffer);
      }
      // Case 3: Base64 / Data URI string
      else if (typeof (file.data || file.base64 || file.content) === 'string') {
        let rawBase64 = file.data || file.base64 || file.content;
        // Strip Data-URI prefix if present (e.g. data:application/pdf;base64,...)
        if (rawBase64.includes(';base64,')) {
          rawBase64 = rawBase64.split(';base64,')[1];
        }
        const fileBuffer = Buffer.from(rawBase64, 'base64');
        await fs.writeFile(destinationFilePath, fileBuffer);
      }
      // Case 4: Plain text / String buffer
      else if (typeof file.content === 'object') {
        await fs.writeFile(destinationFilePath, JSON.stringify(file.content, null, 2));
      } else {
        throw new Error(`Unsupported file payload format for '${fileName}'.`);
      }

      const fileStats = await fs.stat(destinationFilePath);

      savedFiles.push({
        fileName,
        filePath: destinationFilePath,
        relativeDir: path.join(destPath, folderName),
        size: fileStats.size,
        savedAt: new Date().toISOString()
      });
    } catch (err) {
      errors.push({
        fileIndex: i,
        fileName: file.fileName || file.originalname || `index_${i}`,
        error: err.message
      });
    }
  }

  return {
    success: errors.length === 0,
    sessionid,
    targetDirectory: targetDir,
    totalReceived: files.length,
    totalSaved: savedFiles.length,
    savedFiles,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Copies a list of files from a source directory to one or more destination directories.
 * 
 * @param {Object} input - Parameter object.
 * @param {string} [input.srcPath=''] - Source directory path.
 * @param {string} [input.folderName=''] - Optional subfolder within srcPath.
 * @param {Array<string|Object>} [input.files=[]] - List of file names or { fileName: string } to copy.
 * @param {Array<string>|string} [input.destPath=[]] - Single target path or array of destination directory paths.
 * @param {string} [input.sessionid=''] - Optional session identifier.
 * @returns {Promise<Object>} Status report with copied files.
 */
async function copyFile(input) {
  const {
    srcPath = '',
    folderName = '',
    files = [],
    destPath = [],
    sessionid = ''
  } = input || {};

  if (!srcPath) {
    return {
      success: false,
      sessionid,
      error: "Missing required parameter 'srcPath'."
    };
  }

  if (!Array.isArray(files) || files.length === 0) {
    return {
      success: false,
      sessionid,
      error: "Missing or empty 'files' array."
    };
  }

  // Normalize destPath into an array
  const destPathsArray = Array.isArray(destPath) ? destPath : [destPath].filter(Boolean);
  if (destPathsArray.length === 0) {
    return {
      success: false,
      sessionid,
      error: "Missing required parameter 'destPath'."
    };
  }

  const sourceDir = path.resolve(srcPath, folderName);
  const copiedFiles = [];
  const errors = [];

  // Ensure all destination directories exist
  for (const targetDest of destPathsArray) {
    await ensureDir(path.resolve(targetDest));
  }

  for (const item of files) {
    const fileName = typeof item === 'string' ? item : (item.fileName || item.name || '');
    if (!fileName) continue;

    const sourceFilePath = path.join(sourceDir, fileName);

    try {
      // Check source file existence
      await fs.access(sourceFilePath);

      for (const targetDest of destPathsArray) {
        const destDirectory = path.resolve(targetDest);
        const destinationFilePath = path.join(destDirectory, fileName);

        await fs.copyFile(sourceFilePath, destinationFilePath);

        copiedFiles.push({
          fileName,
          from: sourceFilePath,
          to: destinationFilePath,
          copiedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      errors.push({
        fileName,
        sourcePath: sourceFilePath,
        error: err.message
      });
    }
  }

  return {
    success: errors.length === 0,
    sessionid,
    sourceDirectory: sourceDir,
    destinations: destPathsArray,
    totalCopied: copiedFiles.length,
    copiedFiles,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = {
  uploadFile,
  copyFile
};