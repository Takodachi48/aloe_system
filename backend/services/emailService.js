const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Create a test account if in development
let transporter;

if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    // Use ethereal.email for testing
    (async () => {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('Using test email account:', testAccount.user);
    })();
} else {
    // Use production SMTP
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'Aloe System'}" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
            to,
            subject,
            html
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

const sendVerificationEmail = async (user, token) => {
    // Use the API endpoint directly instead of frontend route
    const apiBaseUrl = process.env.API_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${apiBaseUrl}/api/auth/verify-email/${token}`;
    
    // Try to load email template
    let emailTemplate;
    try {
        emailTemplate = await fs.readFile(
            path.join(__dirname, '../templates/email/verification.html'), 
            'utf8'
        );
    } catch (error) {
        console.warn('Using default email template');
        emailTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Your Email Address</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>Thank you for registering with Aloe System. Please click the button below to verify your email address:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                        Verify Email
                    </a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>If you did not create an account, please ignore this email.</p>
                <p>Best regards,<br>The Aloe System Team</p>
            </div>
        `;
    }

    return sendEmail(
        user.email,
        'Verify Your Email - Aloe System',
        emailTemplate
    );
};

module.exports = {
    sendEmail,
    sendVerificationEmail
};
