require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize Twilio client if credentials exist
let client = null;
if (accountSid && authToken && accountSid !== 'your_account_sid_here') {
    client = twilio(accountSid, authToken);
}

app.post('/api/send-sms', async (req, res) => {
    const { to, message } = req.body;

    if (!client) {
        return res.status(500).json({ error: 'Twilio credentials not configured in the .env file.' });
    }

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing "to" phone number or "message" text.' });
    }

    try {
        const twilioMessage = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: to
        });
        
        console.log(`SMS sent successfully to ${to}. SID: ${twilioMessage.sid}`);
        res.status(200).json({ success: true, sid: twilioMessage.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`SMS Backend server running at http://localhost:${port}`);
    if (!client) {
        console.warn('WARNING: Twilio credentials missing in .env file. SMS will fail.');
    }
});
