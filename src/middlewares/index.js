'use strict';

const { logger } = require('./../libs/logger');

/**
 * retae limiter middleware
 * @param {object} rateLimiter the rate limiter create with rate-limiter-flexible module
 * @return {Function} rate limiter middleware, (req, res, next) => {}
 */
function rateLimiterMiddleware(rateLimiter) {
  return async (req, res, next) => {
    rateLimiter
      .consume(req.ip)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).send('Too Many Requests');
      });
  };
}

/**
 * log middleware, to output basic request descritpion
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
function logMiddleware(req, res, next) {
  if (req.body.operationName !== 'IntrospectionQuery')
    logger.Info(
      'App',
      'api',
      `${req.method} ${req.originalUrl} params=${JSON.stringify(req.params)} query=${JSON.stringify(req.query)} body=${JSON.stringify(req.body)}`
    );
  next();
}

/**
 * auth apiKey middleware, compare apikey value
 * @param {string} apiKeyValue
 * @return {Function} apiKey Middleware, (req, res, next) => {}
 */
function apiKeyMiddleware(apiKeyValue) {
  return (req, res, next) => {
    if (!apiKeyValue) {
      next();
    } else {
      const apiKey = req.get('X-API-KEY');
      if (apiKey === apiKeyValue) {
        next();
      } else {
        res.status(401).send('Unauthorized');
      }
    }
  };
}

/**
 * set resquestId in Header of response
 * @param {Error|string} err
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
// eslint-disable-next-line no-unused-vars
function setRequestIdInResponseHeader(req, res, next) {
  res.set('X-REQUEST-ID', req.get('X-REQUEST-ID'));
  next();
}

/**
 * error handler middleware
 * @param {Error|string} err
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof Error) {
    logger.Error('App', 'errorHandler', `${err.stack}`);
    res.status(err.status || 500).json({
      data: err.message
    });
  } else {
    logger.Error('App', 'errorHandler', `${err}`); // maybe just log as info message, because it is not server-side bug error
    res.status(400).json({
      data: err
    });
  }
}

module.exports = {
  rateLimiterMiddleware,
  logMiddleware,
  apiKeyMiddleware,
  setRequestIdInResponseHeader,
  errorHandler
};
