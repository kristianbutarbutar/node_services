const express = require('express');
const HeaderWrapper = require('./headerwrapper');

const router = express.Router();

/**
 * POST /api/v1/secure-headers
 * Body: { publickey, privatekey, channel, payload }
 */
router.post('/secure-headers', (req, res) => {
    try {
        const { publickey, privatekey, channel, payload } = req.body;

        // Basic validation
        if (!channel || !payload) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing required fields: "channel" and "payload" are mandatory.'
            });
        }

        // Generate secure headers and encrypted payload package
        const securePackage = HeaderWrapper.generateSecurePackage({
            publickey,
            privatekey,
            channel,
            payload
        });

        return res.status(200).json({
            status: 'success',
            code: 200,
            data: securePackage
        });

    } catch (error) {
        console.error('Secure Header Generation Error:', error.message);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

module.exports = router;