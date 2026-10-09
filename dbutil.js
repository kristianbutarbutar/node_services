const calldbapi = require('./calldbapi');
const ip_api = require('./host');

/**
 * Queries object records by sending a POST request to http://localhost:3000/api/query-object.
 * 
 * @param {Object} input - Input parameter object.
 * @param {string} input.objectid - Target object/table ID.
 * @param {string} [input.sessionid=''] - Session identifier.
 * @param {Array<Object>} [input.columns=[]] - Array of column filter objects [{ col_name: '', value: '' }, ...].
 * @returns {Promise<Object>} The JSON response returned by the API endpoint.
 */
async function getObjectRecords(input) {
  const { objectid, sessionid = '', columns = [], filterColumns = [] } = input || {};

  const payload = {
    tableName: objectid,
    whereClause: columns,
    filterColumns: filterColumns
  };

  try { //'http://localhost:3000/api/query-object'
    const response = await fetch(`${ip_api.api_3000}/api/query-object`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log("getObjectRecords response:", JSON.stringify(data));

    return data;
  } catch (err) {
    console.error("getObjectRecords error:", err.message);
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: `Failed to call /api/query-object: ${err.message}`
    };
  }
}

/**
 * Sends a POST request to the local API endpoint to query an object by table name and where clause.
 * 
 * @param {Object} input - Input parameter object.
 * @param {string} input.tableName - Target table/form name.
 * @param {Array<Object>} [input.whereClause=[]] - Array of WHERE conditions (e.g. [{ column: 'id', value: '123' }]).
 * @param {string} [input.sessionid=''] - Optional session tracker.
 * @returns {Promise<Object>} The JSON response returned by http://localhost:3000/api/query-object.
 */
async function getObject(input) {
  const { tableName, whereClause, filterColumns, sessionid } = input || {};

  if (!tableName) {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: "Missing required parameter 'tableName'"
    };
  }

  const payload = {
    tableName,
    whereClause,
    filterColumns,
    sessionid
  };

  try {//'http://localhost:3000/api/query-object'
    const response = await fetch(`${ip_api.api_3000}/api/query-object`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  } catch (err) {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: `Failed to call /api/query-object: ${err.message}`
    };
  }
}

/**
 * Fetches group members (id, description) filtering by pid equal to groupid.
 * 
 * @param {Object} input - Input JSON object containing { groupid, checked, sessionid }.
 * @param {string} input.groupid - Target group ID to filter by pid.
 * @param {string|boolean} [input.checked] - Checked state indicator.
 * @param {string} [input.sessionid] - Optional session identifier.
 * @returns {Promise<Object>} Query result from calldbapi.executeQuery() formatted as JSON.
 */
async function getList(input) {
  const { groupid, checked, sessionid = '' } = input || {};

  if (!groupid) {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: "Missing required parameter 'groupid'"
    };
  }

  const queryPayload = {
    sql: "SELECT id, description FROM t_group_members WHERE pid = $1 order by seq",
    params: [
      { value: groupid, type: "VARCHAR" }
    ]
  };

  const response = await calldbapi.executeQuery(queryPayload);
  console.log("getList > queryPayload > ", JSON.stringify(queryPayload));
  console.log("getList > response ", JSON.stringify(response));

  return {
    ...response,
    sessionid
  };
}

/**
 * Maps a column ID to a group ID or custom SQL via t_col_list_map, then fetches the list records.
 * 
 * @param {Object} input - Input JSON object containing { col_id, sessionid }.
 * @param {string} input.col_id - Column ID to map to a list_group_id or sql definition.
 * @param {string} [input.sessionid] - Optional session identifier.
 * @returns {Promise<Object>} JSON response containing list items.
 */
async function getListForColumnId(input) {
  const { col_id, sessionid = '' } = input || {};

  if (!col_id) {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: "Missing required parameter 'col_id'"
    };
  }

  // 1. Fetch list_group_id mapping and optional raw/JSON SQL for the given col_id
  const queryPayload = {
    sql: "SELECT list_group_id, sql FROM t_col_list_map WHERE col_id = $1",
    params: [
      { value: col_id, type: 'VARCHAR' }
    ]
  };

  const mapResult = await calldbapi.executeQuery(queryPayload);
  //console.log("getListForColumnId > mapResult > ", JSON.stringify(mapResult));

  if (!mapResult.success) {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: mapResult.error || "Failed to query t_col_list_map"
    };
  }

  const records = mapResult.data || [];
  if (records.length === 0) {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: `No mapping found in t_col_list_map for col_id '${col_id}'`
    };
  }

  const listGroupId = (records[0].list_group_id || '').trim();
  const sqlList = (records[0].sql || '').trim();

  let listResponse;

  // 2. Fetch via list_group_id from t_group_members
  if (listGroupId.length > 0) {
    listResponse = await getList({ groupid: listGroupId, sessionid });
  }
  // 3. Fallback: Fetch via direct or JSON-formatted SQL statement
  else if (sqlList.length > 0) {
    try {
      if (sqlList.startsWith('{') && sqlList.endsWith('}')) {

        //console.log("getListForColumnId > before > sqlList > ", sqlList);

        listResponse = await getObject(JSON.parse(sqlList));

        //console.log("getListForColumnId > after > sqlList > listResponse > ", JSON.stringify(listResponse));
      }
    } catch (parseErr) {
      return {
        success: false,
        sessionid,
        data: [],
        count: 0,
        error: `Failed to execute custom SQL for col_id '${col_id}': ${parseErr.message}`
      };
    }
  } else {
    return {
      success: false,
      sessionid,
      data: [],
      count: 0,
      error: `Neither 'list_group_id' nor 'sql' defined for col_id '${col_id}' in t_col_list_map`
    };
  }

  return {
    ...listResponse,
    sessionid
  };
}

module.exports = {
  getObjectRecords,
  getObject,
  getList,
  getListForColumnId
};