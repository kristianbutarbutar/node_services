const crypto = require('crypto');
const dbEngine = require('./dbengine');

/**
 * Generates and returns a 45-character unique string.
 * 
 * @returns {string} 45-character unique identifier.
 */
function getUUID() {
  return crypto.randomBytes(32).toString('hex').substring(0, 45);
}

/**
 * Looks up the tableName corresponding to a given ID from t_form.
 * 
 * @param {Object} json - Input JSON { id: '', sessionid: '' }
 * @returns {Promise<Object>} Execution result returned from dbEngine.executeQuery()
 */
async function getTableName(json) {
  try {
    const { id } = json || {};

    if (!id) {
      return {
        success: false,
        data: [],
        count: 0,
        error: "Missing required parameter 'id'"
      };
    }

    const queryPayload = {
      sql: "select tableName, label from t_form where upper(id) = upper($1)",
      params: [
        { value: id, type: "VARCHAR" }
      ]
    };

    const response = await dbEngine.executeQuery(queryPayload);
    
    console.log("getTableName: ", JSON.stringify(response), " => ", response.data[0].tablename);

    return response.data[0];
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Utility function to escape HTML special characters for safe rendering.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Utility function to convert an array of objects into an HTML table string.
 * - 1st column: Radio button with value from the record's 'id' column.
 * - 2nd column: 'Row No' sequence index.
 * - Ignores 'id' and 'pid' columns from standard display columns.
 * - Restricts rendering to rows between row_start and row_end (1-based sequence numbering).
 * 
 * @param {Array<Object>} data - Array of record objects.
 * @param {number} [row_start=1] - 1-based start row sequence number.
 * @param {number|null} [row_end=null] - 1-based end row sequence number.
 * @returns {string} Rendered HTML table string.
 */
function convertArrayToHtmlTable(data, row_start = 1, row_end = null) {

  if (!Array.isArray(data) || data.length === 0) {
    return '<table class="db-table"><thead><tr><th>Select</th><th>Row No</th><th>No Data</th></tr></thead><tbody><tr><td>-</td><td>-</td><td>No records found</td></tr></tbody></table>';
  }

  // Filter out 'id' and 'pid' columns (case-insensitive) for main table content
  const excludedKeys = ['id', 'pid'];
  const headers = Object.keys(data[0]).filter(
    key => !excludedKeys.includes(key.toLowerCase())
  );

  if (headers.length === 0) {
    return '<table class="db-table"><thead><tr><th>Select</th><th>Row No</th><th>No Displayable Columns</th></tr></thead><tbody><tr><td>-</td><td>-</td><td>All columns are hidden</td></tr></tbody></table>';
  }

  // Calculate slice indices (convert 1-based sequence numbers to 0-based array slice)
  const parsedStart = parseInt(row_start, 10) || 1;
  const startIdx = Math.max(0, parsedStart - 1);
  const endIdx = (row_end !== null && row_end !== undefined)
    ? Math.min(data.length, parseInt(row_end, 10))
    : data.length;

  const slicedData = data.slice(startIdx, endIdx);

  if (slicedData.length === 0) {
    return '<table class="db-table"><thead><tr><th>Select</th><th>Row No</th><th>No Data in Range</th></tr></thead><tbody><tr><td>-</td><td>-</td><td>No records found in specified row range</td></tr></tbody></table>';
  }

  // Build table headers starting with "Select" (Radio Column) and "Row No"
  let html = '<table class="db-table">\n  <thead>\n    <tr>\n      <th>Select</th>\n      <th>Row No</th>\n';

  headers.forEach(header => {
    html += `      <th>${escapeHtml(header)}</th>\n`;
  });
  html += '    </tr>\n  </thead>\n  <tbody>\n';

  // Render rows with radio button in 1st column and sequence number in 2nd
  slicedData.forEach((row, index) => {
    const rowNum = startIdx + index + 1; // 1-based sequence number

    // Extract the record's 'id' value case-insensitively
    const idKey = Object.keys(row).find(k => k.toLowerCase() === 'id');
    const idValue = idKey !== undefined ? row[idKey] : '';

    html += '    <tr>\n';
    html += `      <td><input type="radio" name="row_select" value="${escapeHtml(idValue)}" /></td>\n`;
    html += `      <td>${rowNum}</td>\n`;

    headers.forEach(header => {
      const cellValue = row[header];
      html += `      <td>${escapeHtml(cellValue)}</td>\n`;
    });
    html += '    </tr>\n';
  });

  html += '  </tbody>\n</table>';
  return html;
}

/**
 * Fetches column definitions for a given table name from t_t_cols_def.
 * 
 * @param {string} v_table_name - The table name to filter by pid.
 * @param {Array<string>} [filterColumns=[]] - Optional list of column names to restrict metadata selection.
 * @returns {Promise<Object>} Formatted JSON object containing column records.
 */
async function getTableColumns(v_table_name, filterColumns = []) {

  let inColumns = "";

  if (Array.isArray(filterColumns) && filterColumns.length > 0) {
    inColumns = filterColumns.join("','");
    inColumns = " and lower(col_name) in ('" + inColumns + "')";
  }

  const queryPayload = {
    sql: "SELECT * FROM t_t_cols_def WHERE pid = $1" + inColumns + " order by seq asc",
    params: [
      { value: v_table_name, type: "VARCHAR" }
    ]
  };
  console.log("getTableColumns > ", JSON.stringify(queryPayload));
  const rawResult = await dbEngine.executeQuery(queryPayload);

  return {
    success: rawResult.success,
    tableName: v_table_name,
    columns: rawResult.success ? (rawResult.data || []) : [],
    count: rawResult.success ? (rawResult.count || 0) : 0,
    error: rawResult.error || null
  };
}

/**
 * Converts column definitions and optional WHERE clause conditions into a SELECT query payload.
 * Handles reference columns (ref_col):
 * - ref_col[0] -> format: "target_table.target_col" -> generates: LEFT JOIN target_table ON target_table.target_col = current_table.col_name
 * - ref_col[1] -> display column -> aliased as col{seq} in SELECT clause
 * - Automatically appends 'ORDER BY seq ASC' if a 'seq' column exists.
 * 
 * @param {Object} columnsJson - Output from getTableColumns()
 * @param {Array<Object>} [whereClause=[]] - Array of WHERE conditions
 * @returns {Object} jsonInput payload { sql: string, params: Array } formatted for executeQuery()
 */
function __QGenerator(columnsJson, whereClause = []) {
  if (!columnsJson || !columnsJson.tableName) {
    throw new Error("Missing 'tableName' in parameter object supplied to __QGenerator");
  }
  const tableName = columnsJson.tableName;
  const columns = columnsJson.columns || [];

  let selectClause = "*";
  const referencedColumns = [];
  const ref_left_join = [];

  if (Array.isArray(columns) && columns.length > 0) {
    const colList = [];
    let refTabCtr = 1;
    let columnName = "";

    columns.forEach((col, index) => {
      columnName = '';

      // Check if ref_col is defined and not empty
      if (col && col.ref_col && String(col.ref_col).trim().length > 0) {
        const ref_col = String(col.ref_col).split(',');

        // 1. Process ref_col[0] (e.g., 'target_table.col_name') for LEFT JOIN
        if (ref_col[0] && ref_col[0].trim().length > 0) {
          const targetRef = ref_col[0].trim();
          const targetTable = targetRef.includes('.') ? targetRef.split('.')[0].trim() : targetRef;
          const targetCol = targetRef.includes('.') ? targetRef.split('.')[1].trim() : targetRef;
          const joinStatement = `LEFT JOIN ${targetTable} tab${refTabCtr} ON tab${refTabCtr}.${targetCol} = ${tableName}.${col.col_name}`;
          if (!ref_left_join.includes(joinStatement)) {
            ref_left_join.push(joinStatement);
          }
        }

        // 2. Process ref_col[1] (display column) aliased as col{seq}
        if (ref_col.length > 1 && ref_col[1] && ref_col[1].trim().length > 0) {
          const displayCol = ref_col[1].trim();
          const targetTable = displayCol.includes('.') ? displayCol.split('.')[0].trim() : displayCol;
          const targetCol = displayCol.includes('.') ? displayCol.split('.')[1].trim() : displayCol;
          const seqNum = col.seq !== undefined && col.seq !== null ? col.seq : (index + 1);
          columnName = `'[' || ${tableName}.${col.col_name} || ']' || tab${refTabCtr}.${targetCol} AS ${col.col_name}`;
          referencedColumns.push(`tab${refTabCtr}.${targetCol} AS col${refTabCtr}`);
        }
        refTabCtr += 1;
      }

      if (col && col.col_name) {
        if (columnName && columnName !== '' && col.col_name.toLowerCase() !== 'formid') {
          colList.push(`${columnName}`);
        } else {
          colList.push(`${tableName}.${col.col_name}`);
        }
      }

    });

    if (colList.length > 0) {
      selectClause = colList.join(", ");
    }
  }

  let sql = `SELECT ${selectClause} FROM ${tableName}`;

  // Append LEFT JOIN clauses if ref_left_join is not empty
  if (ref_left_join.length > 0) {
    sql += ` ${ref_left_join.join(" ")}`;
  }

  const params = [];

  if (Array.isArray(whereClause) && whereClause.length > 0) {
    const conditions = whereClause.map((cond, index) => {
      const operator = cond.operator || '=';
      const paramIndex = index + 1;
      if (!cond.value || cond.value === '') return '';
      params.push({
        value: cond.value,
        type: cond.type || 'VARCHAR'
      });

      const colPrefix = cond.col_name.includes('.') ? '' : `${tableName}.`;
      return `${colPrefix}${cond.col_name} ${operator} $${paramIndex}`;
    });

    const _sql = ` WHERE ${conditions.join(' AND ')}`;
    sql += _sql && _sql.length > 8 ? _sql : '';
  }

  // Check if columns metadata contains a 'seq' column
  if (Array.isArray(columns) && columns.length > 0) {
    let colName = "";
    const hasSeqCol = columns.some(col => {
      colName = col?.col_name || (typeof col === 'string' ? col : '');
      return String(colName).trim().toLowerCase() === 'seq' || String(colName).trim().toLowerCase() === 'seqno';
    });

    if (hasSeqCol) {
      sql += ` ORDER BY ${tableName}.${colName} DESC`;
    }
  }

  return { sql, params };
}

/**
 * Generates an INSERT query payload from form data and column definition metadata.
 * Reads column data type from col.dt_type in t_t_cols_def metadata.
 * Attaches col_name property to parameter objects for downstream mapping.
 * 
 * @param {Object} formData - JSON input { objectid: 'tableName', columns: [{ col_name: '', value: '', type: '' }] }
 * @param {Object} colsJson - Metadata JSON response from getTableColumns()
 * @returns {Object} JSON payload { sql: string, params: Array } formatted for executeInsert()
 */
function __IGenerator(formData, colsJson) {
  if (!formData || (!formData.objectid && !formData.tableName)) {
    throw new Error("Missing 'objectid' or 'tableName' parameter in formData supplied to __IGenerator");
  }

  const tableName = colsJson.tableName;
  const inputCols = formData.columns || [];

  if (!Array.isArray(inputCols) || inputCols.length === 0) {
    throw new Error("No columns supplied in formData for __IGenerator");
  }

  // Build a lookup map for data types from t_t_cols_def metadata using col.dt_type
  const metadataCols = (colsJson && Array.isArray(colsJson.columns)) ? colsJson.columns : [];
  const colTypeMap = new Map();

  metadataCols.forEach(col => {
    if (!col || typeof col !== 'object') return;

    const colName = col.col_name;
    const dataType = col.dt_type;

    if (colName && dataType) {
      colTypeMap.set(String(colName).trim().toLowerCase(), String(dataType).trim());
    }
  });

  const colNames = [];
  const placeholders = [];
  const params = [];

  inputCols.forEach((colObj) => {
    if (!colObj || typeof colObj !== 'object') return;

    const rawColName = colObj.col_name;
    if (!rawColName) return;

    const colName = String(rawColName).trim();
    const rawVal = colObj.value ?? colObj.val;

    const directType = colObj.dt_type;
    const metadataType = colTypeMap.get(colName.toLowerCase()) || directType || 'VARCHAR';
    const lowerMetadataType = String(metadataType).toLowerCase();

    colNames.push(colName);

    if ((lowerMetadataType === 'date' || lowerMetadataType.includes('timestamp')) && (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '')) {
      params.push({
        col_name: colName,
        value: rawVal,
        type: metadataType
      });

      if (lowerMetadataType === 'date') {
        placeholders.push(`TO_DATE($${params.length}, 'DD-MM-YYYY')`);
      } else if (lowerMetadataType.includes('timestamp')) {
        placeholders.push(`TO_TIMESTAMP($${params.length}, 'DD-MM-YYYY HH24:MI:SS')`);
      }
    } else if (lowerMetadataType.includes('timestamp') && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
      placeholders.push('CURRENT_TIMESTAMP');
    } else {
      params.push({
        col_name: colName,
        value: rawVal !== undefined ? rawVal : null,
        type: metadataType
      });
      placeholders.push(`$${params.length}`);
    }
  });

  if (colNames.length === 0) {
    throw new Error("No valid column names found in formData.columns");
  }

  const sql = `INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
  console.log("__IGenerator sql > ", JSON.stringify(sql));
  console.log("__IGenerator params > ", JSON.stringify(params));

  return {
    sql,
    params
  };
}

/**
 * Generates a DELETE statement and parameter payload for a given table and WHERE clause columns.
 * 
 * @param {Object} input - JSON input { tableName: 'tableName', columns: [{ col_name: '', col_type: '', value: '' }] }
 * @returns {Object} JSON payload { sql: string, params: [{ col_name: '', col_type: '', type: '', value: '' }] }
 */
function __DGenerator(input) {
  if (!input || (!input.tableName && !input.objectid)) {
    throw new Error("Missing 'tableName' parameter supplied to __DGenerator");
  }

  const tableName = input.tableName;
  const columns = input.columns;

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error("No columns supplied for WHERE clause in __DGenerator");
  }

  const whereConditions = [];
  const params = [];

  columns.forEach((colObj, index) => {
    if (!colObj || typeof colObj !== 'object') return;

    const rawColName = colObj.col_name;
    if (!rawColName) return;

    const colName = String(rawColName).trim();
    const colType = colObj.dt_type || colObj.data_type || 'VARCHAR';
    const rawVal = colObj.value;
    const paramIndex = index + 1;

    whereConditions.push(`${colName} = $${paramIndex}`);
    params.push({
      col_name: colName,
      col_type: colType,
      type: colType,
      value: rawVal
    });
  });

  if (whereConditions.length === 0) {
    throw new Error("No valid column names found in columns array for __DGenerator");
  }

  const sql = `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')}`;

  return {
    sql,
    params
  };
}

/**
 * Wrapper for SELECT queries
 */
async function executeQuery(jsonInput) {
  return await dbEngine.executeQuery(jsonInput);
}

/**
 * Automatically fetches table metadata, constructs a query with optional WHERE conditions, and fetches records.
 * Appends attribute columns: columnsJson to the returned JSON object.
 * 
 * @param {string} tableName - The name of the table to query.
 * @param {Array<Object>} [whereClause=[]] - Optional JSON array of WHERE clause conditions.
 * @param {Array<string>} [filterColumns=[]] - Optional list of column names to filter.
 * @returns {Promise<Object>} Query result records returned by executeQuery() with columns metadata attached.
 */
async function queryObject(tableName, whereClause = [], filterColumns = []) {
  const columnsJson = await getTableColumns(tableName, filterColumns);
  const tableDBName = await getTableName({ id: tableName });

  columnsJson.tableName = tableDBName.tablename;
  const queryPayload = __QGenerator(columnsJson, whereClause);

  //console.log("queryObject > queryPayload > ", JSON.stringify(queryPayload));

  var queryResult = await executeQuery(queryPayload);

  //console.log("queryObject > queryResult > ", JSON.stringify(queryResult));

  if (queryResult.count == 1) {
    queryResult.view = await recordAttributes(queryResult, columnsJson.columns);
  }

  return {
    ...queryResult,
    columns: columnsJson,
    objectLabel:tableDBName.label
  };
}

async function recordAttributes(objectItem, columns) {
  if (!objectItem && !columns) return { success: 'failed' };

  var arecord = [];

  columns.forEach((column) => {
    var acolumn = { col_name: column.col_name, value: '', html_type: column.html_type };
    arecord.push(acolumn);
  });

  if (objectItem.data && arecord.length > 0) {
    Object.entries(objectItem.data[0]).forEach(([key, value]) => {
      arecord.forEach((oItem) => {
        if (oItem.col_name.toLowerCase() === key.toLowerCase()) {
          oItem.value = value;
        }
      });
    });
  }
  return arecord;
}

/**
 * Calls queryObject and converts the returned records array into an HTML table string
 * for the specified row sequence range (row_start to row_end).
 * 
 * @param {string} tableName - Target table name.
 * @param {Array<Object>} [whereClause=[]] - Optional array of WHERE clause filters.
 * @param {number} [row_start=1] - 1-based start row sequence number.
 * @param {number|null} [row_end=null] - 1-based end row sequence number.
 * @returns {Promise<Object>} JSON containing success status, contentType, HTML table string, row range, totalRecords, and count.
 */
async function queryObjectInTable(tableName, whereClause = [], row_start = 1, row_end = null) {

  const queryResult = await queryObject(tableName, whereClause);
  let records = [];
  let totalRecords = 0;
  let htmlTable = '';

  if (!queryResult.success) {
    return {
      success: false,
      contentType: 'TABLE',
      tableName: tableName,
      htmlTable: `<div class="error">Error fetching data: ${escapeHtml(queryResult.error)}</div>`,
      row_start: row_start,
      row_end: row_end,
      totalRecords: 0,
      count: 0,
      error: queryResult.error
    };
  } else if (queryResult.count === 0) {
    totalRecords = queryResult.count;
    htmlTable = '<table class="db-table"><thead><tr><td>No records found</td></tr></thead></table>';
  } else {

    console.log("queryObjectInTable > queryObject > ", JSON.stringify(queryResult));

    records = queryResult.data || [];
    totalRecords = records.length;
    htmlTable = convertArrayToHtmlTable(records, row_start, row_end);
  }

  return {
    success: true,
    contentType: 'TABLE',
    tableName: tableName,
    htmlTable: htmlTable,
    row_start: row_start,
    row_end: row_end ?? totalRecords,
    totalRecords: totalRecords,
    count: totalRecords,
    error: null
  };
}

/**
 * Wrapper for INSERT operations
 */
async function executeInsert(jsonInput) {
  return await dbEngine.executeInsert(jsonInput);
}

/**
 * Automatically fetches table metadata, builds an INSERT query payload via __IGenerator,
 * overrides the value for attribute 'id' in the params array with getUUID(),
 * and executes the insert.
 * 
 * @param {Object} formData - Input JSON { objectid: 'tableName', columns: [{ col_name: '', value: '', type: '' }] }
 * @returns {Promise<Object>} Execution result returned from executeInsert().
 */
async function saveForm(formData) {
  try {
    const objectid = formData ? (formData.objectid || formData.tableName) : null;

    if (!objectid) {
      return {
        success: false,
        error: "Missing required parameter 'objectid' in formData."
      };
    }

    if (formData && Array.isArray(formData.columns)) {
      const hasIdCol = formData.columns.some(col => {
        const name = col.col_name;
        return name && String(name).toLowerCase() === 'id';
      });

      if (!hasIdCol) {
        formData.columns.push({ col_name: 'id', value: '', type: 'VARCHAR' });
      }
    }

    const colsJson = await getTableColumns(objectid);

    const tableDBName = await getTableName({ id: objectid });
    colsJson.tableName = tableDBName.tablename;

    const insertPayload = __IGenerator(formData, colsJson);
    const id_uuid = getUUID();

    if (insertPayload && Array.isArray(insertPayload.params)) {
      const idParam = insertPayload.params.find(
        p => p.col_name && String(p.col_name).toLowerCase() === 'id'
      );

      if (idParam) {
        idParam.value = id_uuid;
      }
    }
    //console.log(" await SaveForm => ", JSON.stringify(insertPayload));

    const insertResult = await executeInsert(insertPayload);

    insertResult.id = id_uuid;

    return insertResult;

  } catch (err) {
    return {
      success: false,
      error:  err.message
    };
  }
}

/**
 * Wrapper for UPDATE operations
 */
async function executeUpdate(jsonInput) {
  return await dbEngine.executeUpdate(jsonInput);
}

/**
 * Wrapper for DELETE operations
 */
async function executeDelete(jsonInput) {
  return await dbEngine.executeDelete(jsonInput);
}


/**
 * Fetches table column definitions, constructs a DELETE SQL statement by record ID,
 * executes it via dbEngine.executeDelete, and returns the execution result.
 * 
 * @param {Object} input - Input parameter { tableName: '', recordid: '', sessionid: '' }
 * @returns {Promise<Object>} Execution result JSON from dbEngine.executeDelete() with sessionid.
 */
async function dropObject(input) {
  try {
    const tableName = input ? (input.tableName || input.objectid) : null;
    const recordid = input ? (input.recordid ?? input.id) : null;
    const sessionid = input ? (input.sessionid || '') : '';

    console.log("dropObject ", JSON.stringify(input));

    if (!tableName) {
      return {
        success: false,
        sessionid: sessionid,
        error: "Missing required parameter 'tableName' in input payload."
      };
    }

    if (recordid === null || recordid === undefined || recordid === '') {
      return {
        success: false,
        sessionid: sessionid,
        error: "Missing required parameter 'recordid' in input payload."
      };
    }

    const colsJson = await getTableColumns(tableName);

    let idType = 'INT';
    if (colsJson && Array.isArray(colsJson.columns)) {
      const idCol = colsJson.columns.find(col => {
        const name = col.col_name || col.column_name || col.columnname || col.name || col.colname;
        return name && String(name).toLowerCase() === 'id';
      });

      if (idCol) {
        idType = idCol.dt_type || idCol.data_type || idCol.datatype || idCol.type || idCol.col_type || 'INT';
      }
    }
    console.log("dropObject tableName ", tableName);

    const deletePayload = {
      sql: `DELETE FROM ${tableName} WHERE id = $1`,
      params: [
        { value: recordid, type: idType }
      ]
    };

    const deleteResult = await dbEngine.executeDelete(deletePayload);

    return {
      ...deleteResult,
      sessionid: sessionid
    };
  } catch (err) {
    return {
      success: false,
      sessionid: input?.sessionid || '',
      error: err.message
    };
  }
}

/**
 * Generates a DELETE query payload using __DGenerator and executes it via executeDelete.
 * 
 * @param {Object} input - JSON input { tableName: '', sessionid: '', column: [{ col_name: '', col_type: '', value: '' }] }
 * @returns {Promise<Object>} Execution result JSON from executeDelete() with sessionid attached.
 */
async function dropObjectItems(input) {
  try {
    const tableName = input ? (input.tableName || input.objectid) : null;
    const sessionid = input ? (input.sessionid || '') : '';
    const columns = input ? (input.column || input.columns || []) : [];

    if (!tableName) {
      return {
        success: false,
        sessionid: sessionid,
        error: "Missing required parameter 'tableName' in input payload."
      };
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return {
        success: false,
        sessionid: sessionid,
        error: "No columns supplied in 'column' array for dropObjectItems."
      };
    }

    const tableDBName = await getTableName({ id: tableName });

    const deletePayload = __DGenerator({
      tableName: tableDBName.tablename,
      columns: columns
    });

    const deleteResult = await executeDelete(deletePayload);

    return {
      ...deleteResult,
      sessionid: sessionid
    };
  } catch (err) {
    return {
      success: false,
      sessionid: input?.sessionid || '',
      error: err.message
    };
  }
}

/**
 * Fetches table column definitions, constructs an UPDATE SQL statement excluding
 * ('id', 'pid', 'createby', 'createddate'), executes it via dbEngine.executeUpdate,
 * and returns the execution result with sessionid.
 * 
 * @param {Object} input - Input JSON { tableName: '', recordid: '', columns: [{ col_id: '', col_name: '', value: '' }], sessionid: '' }
 * @returns {Promise<Object>} Execution result JSON from dbEngine.executeUpdate() with sessionid.
 */
async function updateObject(input) {
  try {
    const tableName = input ? (input.tableName || input.objectid) : null;
    const recordid = input ? input.recordid : null;
    const inputCols = input ? (input.columns || []) : [];
    const sessionid = input ? (input.sessionid || '') : '';

    if (!tableName) {
      return {
        success: false,
        sessionid: sessionid,
        error: "Missing required parameter 'tableName' in input payload."
      };
    }

    if (recordid === null || recordid === undefined || recordid === '') {
      return {
        success: false,
        sessionid: sessionid,
        error: "Missing required parameter 'recordid' in input payload."
      };
    }

    if (!Array.isArray(inputCols) || inputCols.length === 0) {
      return {
        success: false,
        sessionid: sessionid,
        error: "No columns supplied for update in input payload."
      };
    }

    const colsJson = await getTableColumns(tableName);
    const tableDBName = await getTableName({ id: tableName });
    const metadataCols = (colsJson && Array.isArray(colsJson.columns)) ? colsJson.columns : [];

    const colTypeMap = new Map();
    let idType = 'INT';

    metadataCols.forEach(col => {
      if (!col || typeof col !== 'object') return;
      const colName = col.col_name;
      const dataType = col.dt_type;

      if (colName && dataType) {
        const lowerName = String(colName).trim().toLowerCase();
        colTypeMap.set(lowerName, String(dataType).trim());
        if (lowerName === 'id') {
          idType = String(dataType).trim();
        }
      }
    });

    const excludedCols = ['id', 'pid', 'createby', 'createddate'];

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    inputCols.forEach((colObj) => {
      if (!colObj || typeof colObj !== 'object') return;

      const rawColName = colObj.col_name;
      if (!rawColName) return;

      const colName = String(rawColName).trim();

      if (excludedCols.includes(colName.toLowerCase())) return;

      const rawVal = colObj.value ?? colObj.val;
      const directType = colObj.type || colObj.dt_type || colObj.data_type || colObj.datatype || colObj.col_type;
      const metadataType = colTypeMap.get(colName.toLowerCase()) || directType || 'VARCHAR';
      const lowerMetadataType = String(metadataType).toLowerCase();

      if ((lowerMetadataType === 'date' || lowerMetadataType.includes('timestamp')) && (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '')) {
        params.push({
          value: rawVal,
          type: metadataType
        });
        if (lowerMetadataType === 'date') {
          setClauses.push(`${colName} = TO_DATE($${paramIndex}, 'YYYY-MM-DD')`);
        } else {
          setClauses.push(`${colName} = TO_TIMESTAMP($${paramIndex}, 'YYYY-MM-DD HH24:MI:SS')`);
        }
      } else if (lowerMetadataType.includes('timestamp') && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
        setClauses.push(`${colName} = CURRENT_TIMESTAMP`);
      } else {
        setClauses.push(`${colName} = $${paramIndex}`);
        params.push({
          value: rawVal !== undefined ? rawVal : null,
          type: metadataType
        });
      }
      paramIndex++;
    });

    if (setClauses.length === 0) {
      return {
        success: false,
        sessionid: sessionid,
        error: "No valid updatable columns provided (all provided columns were excluded or invalid)."
      };
    }

    const sql = `UPDATE ${tableDBName.tablename} SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;
    params.push({
      value: recordid,
      type: idType
    });

    console.log("updated Object 1> ", sql);
    console.log("updated Object 2> ", JSON.stringify(params));

    const updateResult = await dbEngine.executeUpdate({ sql, params });

    return {
      ...updateResult,
      sessionid: sessionid
    };
  } catch (err) {
    return {
      success: false,
      sessionid: input?.sessionid || '',
      error: err.message
    };
  }
}

// Standalone CLI execution demo
async function runDemo() {
  console.log("=== Testing getTableName Function ===\n");

  const createFormTable = {
    sql: `
      CREATE TABLE IF NOT EXISTS t_form (
        id VARCHAR(50) PRIMARY KEY,
        tableName VARCHAR(100)
      );

      INSERT INTO t_form (id, tableName) VALUES
        ('FORM_EMP_01', 'employees')
      ON CONFLICT DO NOTHING;
    `,
    params: []
  };

  await dbEngine.executeInsert(createFormTable);

  const result = await getTableName({ id: 'FORM_EMP_01', sessionid: 'SESS_TEST_01' });
  console.log("getTableName Output:", JSON.stringify(result, null, 2));

  await dbEngine.closePool();
}

if (require.main === module) {
  runDemo();
}

module.exports = {
  getUUID,
  getTableName,
  getTableColumns,
  __QGenerator,
  __IGenerator,
  __DGenerator,
  queryObject,
  queryObjectInTable,
  convertArrayToHtmlTable,
  executeQuery,
  executeInsert,
  saveForm,
  executeUpdate,
  executeDelete,
  dropObject,
  dropObjectItems,
  updateObject
};