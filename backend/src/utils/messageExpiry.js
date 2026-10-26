/**
 * Expiry helper for Snapchat-style temporary messaging.
 * Default is strictly 24 hours (86,400,000 ms).
 * In test environments, MESSAGE_EXPIRY_SECONDS can override this.
 */
const DEFAULT_EXPIRY_HOURS = 24;

function getExpiryDurationMs() {
  if (process.env.MESSAGE_EXPIRY_SECONDS) {
    const parsed = parseInt(process.env.MESSAGE_EXPIRY_SECONDS, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed * 1000;
    }
  }
  return DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000;
}

function calculateExpiryDate(readAt = new Date()) {
  return new Date(readAt.getTime() + getExpiryDurationMs());
}

function isMessageExpired(message) {
  if (!message || !message.expiresAt) return false;
  return new Date(message.expiresAt).getTime() <= Date.now();
}

module.exports = {
  getExpiryDurationMs,
  calculateExpiryDate,
  isMessageExpired,
};
