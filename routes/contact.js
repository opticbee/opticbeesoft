const express = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('./db'); // Import MySQL connection pool

const router = express.Router();

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.example.com', // Your SMTP host
    port: 587,
    secure: false, 
    auth: {
        user: 'spltechnologycorp@gmail.com', // Your email address
        pass: 'cbkm ntdm cuvp vygh'           // Your email password or app password
    },
    tls: {
        rejectUnauthorized: false
    }
});

// ✅ Ensure contacts table exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error('Error creating contacts table:', err);
    } else {
        console.log('✅ Contacts table ready');
    }
});

// Contact API
router.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const submissionId = uuidv4();
    const submissionDate = new Date();

    try {
        // --- 1. Save to MySQL ---
        const insertQuery = `
            INSERT INTO contacts (id, name, email, subject, message, submittedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.query(insertQuery, [
            submissionId,
            name,
            email,
            subject,
            message,
            submissionDate
        ]);

        console.log('✅ Contact form saved to MySQL:', submissionId);

        // --- 2. Send Confirmation Email to User ---
        const userMailOptions = {
            from: '"Optic Bee" <no-reply@opticbee.in>',
            to: email,
            subject: 'Thank you for contacting us!',
            html: `
                <p>Hi ${name},</p>
                <p>Thank you for reaching out to Optic Bee. We have received your message and will get back to you shortly.</p>
                <p><strong>Your Submission Summary:</strong></p>
                <ul>
                    <li><strong>Subject:</strong> ${subject}</li>
                    <li><strong>Message:</strong> ${message}</li>
                </ul>
                <p>Best regards,<br>The Optic Bee Team</p>
            `
        };
        await transporter.sendMail(userMailOptions);
        console.log(`📧 Confirmation email sent to ${email}`);

        // --- 3. Send Notification Email to HR ---
        const hrMailOptions = {
            from: `"Contact Form" <form-notifications@opticbee.in>`,
            to: 'hr@opticbee.in',
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <p>A new message has been submitted through the contact form.</p>
                <p><strong>Submission Details:</strong></p>
                <ul>
                    <li><strong>Unique ID:</strong> ${submissionId}</li>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Subject:</strong> ${subject}</li>
                    <li><strong>Message:</strong></li>
                </ul>
                <pre>${message}</pre>
            `
        };
        await transporter.sendMail(hrMailOptions);
        console.log(`📧 Notification email sent to hr@opticbee.in`);

        res.status(200).json({ message: 'Your message has been sent successfully. Thank you!' });

    } catch (error) {
        console.error('❌ Error processing contact form:', error);
        res.status(500).json({ message: 'There was an error sending your message. Please try again later.' });
    }
});

module.exports = router;
