const net = require('net');

const PORT = 3333;
const HOST = '127.0.0.1';

// Helper function to send individual TCP requests to the C++ server
function sendRequest(payload) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let dataBuffer = '';

        client.connect(PORT, HOST, () => {
            client.write(JSON.stringify(payload));
        });

        client.on('data', (data) => {
            dataBuffer += data.toString();
        });

        client.on('close', () => {
            try {
                resolve(JSON.parse(dataBuffer));
            } catch (e) {
                resolve({ raw: dataBuffer });
            }
        });

        client.on('error', (err) => {
            reject(err);
        });
    });
}

// Multi-request test suite handling multiple UIDs concurrently
async function runMultiClientSimulations() {
    console.log('--- Starting Multi-UID Chat Server Simulation ---\n');

    try {
        // 1. User u1 writes a message to user u2
        console.log('Sending message: u1 -> u2');
        const writeRes1 = await sendRequest({
            action: "write_message",
            uid: "u1",
            touid: "u2",
            message: "Hey Bob, are you available for a code review?",
            timestamp: new Date().toISOString()
        });
        console.log('Response:', writeRes1);

        // 2. User u3 writes a message to user u2 concurrently
        console.log('\nSending message: u3 -> u2');
        const writeRes2 = await sendRequest({
            action: "write_message",
            uid: "u3",
            touid: "u2",
            message: "Hello Bob, check out the latest pull request.",
            timestamp: new Date().toISOString()
        });
        console.log('Response:', writeRes2);

        // 3. Read incoming messages for user u2 (should fetch messages from both u1 and u3)
        console.log('\nFetching incoming messages for user: u2');
        const readRes = await sendRequest({
            action: "read_message",
            uid: "u2"
        });
        console.log('Incoming Messages for u2:\n', JSON.stringify(readRes, null, 2));

    } catch (error) {
        console.error('Client simulation error:', error.message);
    }
}

runMultiClientSimulations();