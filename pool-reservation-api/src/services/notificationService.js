require('dotenv').config();
const sibApi = require('sib-api-v3-sdk');

// Configure Brevo client
const client = sibApi.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new sibApi.TransactionalEmailsApi();
const sender = {
    email: process.env.BREVO_SENDER_EMAIL,
    name: process.env.BREVO_SENDER_NAME,
};

/**
 * Sends an email notification using the Brevo API.
 * @param {string} recipientEmail - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} htmlContent - The HTML body of the email.
 */
const sendEmailNotification = async (recipientEmail, subject, htmlContent) => {
    const sendSmtpEmail = {
        sender,
        to: [{ email: recipientEmail }],
        subject,
        htmlContent,
    };

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`[Brevo] Notification sent to ${recipientEmail} for: ${subject}`);
        return { success: true };
    } catch (error) {
        console.error(`[Brevo ERROR] Failed to send email to ${recipientEmail}:`, error.response ? error.response.text : error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmailNotification };