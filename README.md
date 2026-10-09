# Node.js IBM DB2 Integration

This repository contains a modular Node.js setup to execute CRUD operations on an IBM DB2 database with connection pooling and string-to-datatype conversion.

## Included Files

- `dbconfig.json`: Database configuration file (hostname, port, database, credentials).
- `dbengine.js`: DB2 core driver interface managing connection pool, data conversion, and CRUD execution functions (`executeQuery`, `executeInsert`, `executeUpdate`, `executeDelete`).
- `calldbapi.js`: Application script invoking `dbengine.js` using JSON inputs/outputs.

## Supported Data Type Conversions

- `INT` / `INTEGER`
- `FLOAT`
- `DOUBLE` / `DECIMAL` / `NUMERIC`
- `BOOLEAN`
- `DATE` (Formats to `YYYY-MM-DD`)
- `TIMESTAMP` (Formats to `YYYY-MM-DD HH:mm:ss.sss`)
- `STRING` / `VARCHAR` / `CHAR`

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Update `dbconfig.json` with your actual DB2 database credentials.
3. Run the application:
   ```bash
   npm start
   ```

-- install nginx
brew install nginx

brew services start nginx
