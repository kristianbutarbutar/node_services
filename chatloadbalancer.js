const http = require('http');

// Global process error handlers to prevent sudden background crashes
process.on('uncaughtException', (err) => {
    console.error('[Load Balancer] CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Load Balancer] CRITICAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Define your backend API service instances
const backendServers = [
    { host: 'localhost', port: 3031 },
    { host: 'localhost', port: 3032 },
    { host: 'localhost', port: 3033 }
];

let currentIndex = 0;

const server = http.createServer((req, res) => {
    // 1. Select the next server using Round-Robin algorithm
    const target = backendServers[currentIndex];
    currentIndex = (currentIndex + 1) % backendServers.length;

    console.log(`[Load Balancer] Routing ${req.method} ${req.url} -> http://${target.host}:${target.port}`);

    // 2. Forward incoming request to the chosen backend server
    const proxyReq = http.request(
        {
            hostname: target.host,
            port: target.port,
            path: req.url,
            method: req.method,
            headers: req.headers
        },
        (proxyRes) => {
            // Send the response back to the original client
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    );

    // Handle connection errors (e.g., if a backend server crashes)
    proxyReq.on('error', (err) => {
        console.error(`[Load Balancer Error] Failed to reach http://${target.host}:${target.port}:`, err.message);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bad Gateway: Backend service is unavailable' }));
        }
    });

    // Pipe the request body through (supports POST, PUT, PATCH payloads)
    req.pipe(proxyReq, { end: true });
});

const PORT = 3003;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`API Load Balancer running on port ${PORT}`);
});