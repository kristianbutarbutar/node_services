console.log("1. Starting test...");
try {
  const ibmdb = require('ibm_db');
  console.log("2. ibm_db module loaded successfully!");
} catch (err) {
  console.error("Failed to load ibm_db:", err.message);
}
