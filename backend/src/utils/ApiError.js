// Error with an HTTP status code; the central error handler turns it into JSON.
class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
module.exports = ApiError;
