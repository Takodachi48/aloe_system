const crypto = require('crypto');

/**
 * Generates a secure random token for email verification
 * @returns {string} A secure random token
 */
const generateVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = {
    generateVerificationToken
};
