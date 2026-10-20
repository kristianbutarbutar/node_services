/**
 * Common Regex Patterns Reference for Node.js:
 * 
 * 1. Alphanumeric only (letters and digits, no special characters):
 *    /^[a-zA-Z0-9]+$/
 * 
 * 2. Characters only (alphabetic only, including spaces):
 *    /^[a-zA-Z\s]+$/
 * 
 * 3. Numbers only (digits only):
 *    /^\d+$/
 * 
 * 4. Minimum 10 characters (any characters):
 *    /^.{10,}$/
 * 
 * 5. Date format YYYY-MM-DD (strict syntax check):
 *    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
 */

/**
 * Validates form field values against regex rules defined in metadata columns.
 * 
 * @param {Object} params
 * @param {Array<{col_name: string, value: any}>} params.fieldsValue - Incoming values from client app.
 * @param {Array<{col_name: string, validateValue?: string}>} params.cols - Form column metadata definitions.
 * @returns {string} - Returns "valid" if all checks pass, or an error message if a check fails.
 */
function validateValue({ fieldsValue = [], cols = [] }) {
  // Map column metadata by col_name for fast O(1) lookup
  const colMap = new Map(cols.map(col => [col.col_name, col]));

  for (const item of fieldsValue) {
    const colDef = colMap.get(item.col_name);

    // Skip if column isn't found or validateValue rule is empty/null/undefined
    if (!colDef || !colDef.validateValue || colDef.validateValue.trim() === '') {
      continue;
    }

    const patternString = colDef.validateValue.trim();
    const rawValue = item.value === null || item.value === undefined ? '' : String(item.value);

    try {
      const regex = new RegExp(patternString);
      const isValid = regex.test(rawValue);

      if (!isValid) {
        return "invalid value, format expected is " + patternString;
      }
    } catch (error) {
      console.error(`Invalid RegExp sequence in column "${item.col_name}":`, error.message);
      return "invalid value, format expected is " + patternString;
    }
  }

  return "valid";
}

module.exports = {
  validateValue
};