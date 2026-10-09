const { Pool } = require('pg');
const dbconfig = require('./dbconfig.json');

// Initialize PostgreSQL Connection Pool
const pool = new Pool(dbconfig);

const getCurrentTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Utility Function: Maps and converts string inputs into target PostgreSQL data types.
 * Catches all timestamp type variations (e.g., 'timestamp without time zone', 'timestamp(6)', 'datetime')
 * and converts empty strings (""), null, or undefined to current timestamp.
 */
function convertDataType(value, targetType = 'VARCHAR') {
  const type = (targetType || 'VARCHAR').toUpperCase().trim();

  // Pattern matching for flexible PostgreSQL data types
  const isTimestamp = type.includes('TIMESTAMP') || type.includes('DATETIME');
  const isDate = type === 'DATE' || type.startsWith('DATE');
  const isInt = type.includes('INT') || type.includes('SERIAL');
  const isFloat = type.includes('FLOAT') || type.includes('DOUBLE') || type.includes('NUMERIC') || type.includes('DECIMAL') || type.includes('REAL');
  const isBool = type.includes('BOOL');

  const strVal = (value === null || value === undefined) ? '' : String(value).trim();

  // 1. Handle TIMESTAMP fields (empty/null/undefined defaults to current timestamp)
  if (isTimestamp) {
    if (strVal === '') {
      return getCurrentTimestamp();
    }
    //const tsObj = new Date(strVal);
    // if (isNaN(tsObj.getTime())) throw new Error(`Invalid Timestamp format: ${value}`);
    return strVal;//tsObj.toISOString().replace('T', ' ').replace('Z', '');
  }

  // 2. Handle empty strings for other non-text data types -> convert to null
  if (strVal === '') {
    if (isInt || isFloat || isBool || isDate) {
      return null;
    }
    return ''; // for VARCHAR/TEXT
  }

  // 3. Process non-empty values
  if (isInt) {
    const parsedInt = parseInt(strVal, 10);
    if (isNaN(parsedInt)) throw new Error(`Invalid Integer value: ${value}`);
    return parsedInt;
  }

  if (isFloat) {
    const parsedNumber = Number(strVal);
    if (isNaN(parsedNumber)) throw new Error(`Invalid Numeric value: ${value}`);
    return parsedNumber;
  }

  if (isBool) {
    if (['true', '1', 't', 'yes'].includes(strVal.toLowerCase())) return true;
    if (['false', '0', 'f', 'no'].includes(strVal.toLowerCase())) return false;
    throw new Error(`Invalid Boolean value: ${value}`);
  }

  if (isDate || isTimestamp) {
    //const dateObj = new Date(strVal);
    const [year, month, day] = strVal.split("-");
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) throw new Error(`Invalid Date format: ${value}`);
    return strVal; //dateObj.toISOString().split('T')[0];
  }

  return strVal;
}

/**
 * Converts '?' placeholders to PostgreSQL '$1, $2, ...' syntax automatically if needed.
 */
function normalizeSqlPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * Core query execution using pg Pool.
 */
async function executeSql(sql, params = []) {
  const formattedSql = normalizeSqlPlaceholders(sql);
  //console.log("INSIDE formattedSql > ", JSON.stringify(formattedSql));
  //console.log("INSIDE params > ", JSON.stringify(params));
  const result = await pool.query(formattedSql, params);
  //console.log("INSIDE executeSql > ", JSON.stringify(result));
  return result;
}

/**
 * Execute SELECT Queries
 */
async function executeQuery(jsonInput) {
  try {
    let { sql, params = [], whereClause = [] } = jsonInput;

    const activeWhereClause = whereClause.length > 0
      ? whereClause
      : params.filter(p => p && typeof p === 'object' && 'column' in p);

    if (activeWhereClause.length > 0 && !/\bWHERE\b/i.test(sql)) {
      const conditions = activeWhereClause.map((cond, index) => {
        const operator = cond.operator || '=';
        return `${cond.column} ${operator} $${index + 1}`;
      });

      sql += ` WHERE ${conditions.join(' AND ')}`;

      params = activeWhereClause.map(p => ({
        value: p.value,
        type: p.type || 'VARCHAR'
      }));
    }

    const typedParams = params.map(p => convertDataType(p.value, p.type));

    console.log("??executeQuery > sql > ", sql);

    const result = await executeSql(sql, typedParams);

    console.log("??executeQuery > result > ", JSON.stringify(result));

    return {
      success: true,
      count: result.rowCount,
      data: result.rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Maps standard PostgreSQL errors to clean, structured responses.
 * @param {Error} err - The database error object thrown by drivers like `pg`, Prisma, or TypeORM.
 * @returns {Object} Structured error payload with status code and user-friendly message.
 */
function mapDatabaseError(err) {
  // Fallback for non-database errors or missing error codes
  if (!err || typeof err.code !== 'string' || err.code.length !== 5) {
    return {
      status: 500,
      message: err.message || 'An unexpected internal error occurred.',
    };
  }

  switch (err.code) {
    case '23505': // Unique violation (Duplicate key)
      return {
        status: 409,
        message: `Duplicate entry error. A record with this ${err.column || 'value'} already exists.`,
        constraint: err.constraint,
      };

    case '23503': // Foreign key violation (Referenced record missing or in use)
      return {
        status: 400,
        message: 'The operation failed because a referenced related record does not exist, or the record is currently in use.',
        detail: err.detail,
      };

    case '23502': // Not null violation (Missing required field)
      return {
        status: 400,
        message: `Missing required field: '${err.column || 'unknown'}'. This field cannot be null.`,
      };

    case '22P02': // Invalid text representation (e.g., malformed UUID or invalid integer format)
      return {
        status: 400,
        message: 'Invalid data format provided. Please check that IDs or input types match expected formats.',
      };

    case '42P01': // Undefined table (Schema mismatch / missing table)
      return {
        status: 500,
        message: `A database configuration error occurred: The table '${err.table || 'unknown'}' does not exist.`,
      };

    case '42703': // Undefined column (Schema mismatch / missing column)
      return {
        status: 500,
        message: 'A database configuration error occurred: An invalid column reference was provided.',
      };

    default:
      // Fallback for other unhandled SQLSTATE error codes
      return {
        status: 500,
        message: 'A database error occurred while processing your request.',
        code: err.code,
      };
  }
}


/**
 * Execute INSERT Statements
 */
async function executeInsert(jsonInput) {
  try {
    const { sql, params = [] } = jsonInput;
    const typedParams = params.map(p => convertDataType(p.value, p.type));

    const result = await executeSql(sql, typedParams);

    return {
      success: true, id: '',
      message: 'Record inserted successfully',
      affectedRows: result.rowCount
    };
  } catch (err) {
    const __err = mapDatabaseError(err);
    return { success: false, error: __err.message || err.message };
  }
}

/**
 * Execute UPDATE Statements
 */
async function executeUpdate(jsonInput) {
  try {
    const { sql, params = [] } = jsonInput;
    const typedParams = params.map(p => convertDataType(p.value, p.type));

    const result = await executeSql(sql, typedParams);

    return {
      success: true,
      message: 'Record(s) updated successfully',
      affectedRows: result.rowCount
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Execute DELETE Statements
 */
async function executeDelete(jsonInput) {
  try {
    const { sql, params = [] } = jsonInput;
    const typedParams = params.map(p => convertDataType(p.value, p.type));

    const result = await executeSql(sql, typedParams);

    return {
      success: true,
      message: 'Record(s) deleted successfully',
      affectedRows: result.rowCount
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Cleanly shutdown the pool
 */
async function closePool() {
  await pool.end();
  console.log("PostgreSQL connection pool closed.");
}

module.exports = {
  convertDataType,
  executeQuery,
  executeInsert,
  executeUpdate,
  executeDelete,
  closePool,
  mapDatabaseError
};