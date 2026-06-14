const twilio = require('twilio');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhoneNumber) {
        return res.status(500).json({ error: 'Twilio credentials not configured in environment variables.' });
    }

    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing "to" phone number or "message" text.' });
    }

    try {
        const client = twilio(accountSid, authToken);
        const twilioMessage = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: to
        });

        return res.status(200).json({ success: true, sid: twilioMessage.sid });
    } catch (error) {
        console.error('Twilio error:', error);
        return res.status(500).json({ error: error.message });
    }
};
