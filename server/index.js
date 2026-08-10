// ============================================================================
// Standalone HTTPS Server — Website Enquiries → CRM Connector
// ============================================================================
// Run: node server/index.js
// Requires: SSL certificates in server/certs/ (or set env vars for paths)
// ============================================================================

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.ENQUIRIES_PORT || '3443', 10);
const HOST = process.env.ENQUIRIES_HOST || '0.0.0.0';
const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// SSL Certificate paths
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'certs', 'server.key');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'certs', 'server.cert');

// ---------------------------------------------------------------------------
// Input Validation & Sanitization
// ---------------------------------------------------------------------------
const MAX_LENGTHS = { name: 100, email: 254, subject: 200, message: 5000, phone: 30 };

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, '').trim();
}

function validateEnquiry(body) {
  const errors = [];

  if (!body.company_id || typeof body.company_id !== 'string') {
    errors.push('company_id is required — enquiries must be associated with a workspace');
  }

  if (!body.name || typeof body.name !== 'string') {
    errors.push('name is required and must be a string');
  } else if (body.name.length > MAX_LENGTHS.name) {
    errors.push(`name must be <= ${MAX_LENGTHS.name} characters`);
  }

  if (!body.email || typeof body.email !== 'string') {
    errors.push('email is required and must be a string');
  } else if (!isValidEmail(body.email)) {
    errors.push('email format is invalid');
  } else if (body.email.length > MAX_LENGTHS.email) {
    errors.push(`email must be <= ${MAX_LENGTHS.email} characters`);
  }

  if (!body.message || typeof body.message !== 'string') {
    errors.push('message is required and must be a string');
  } else if (body.message.length > MAX_LENGTHS.message) {
    errors.push(`message must be <= ${MAX_LENGTHS.message} characters`);
  }

  if (body.phone && typeof body.phone === 'string' && body.phone.length > MAX_LENGTHS.phone) {
    errors.push(`phone must be <= ${MAX_LENGTHS.phone} characters`);
  }

  if (body.subject && typeof body.subject === 'string' && body.subject.length > MAX_LENGTHS.subject) {
    errors.push(`subject must be <= ${MAX_LENGTHS.subject} characters`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Firebase RTDB Write (minimal — uses REST API to avoid SDK dependency)
// ---------------------------------------------------------------------------
async function saveEnquiry(enquiry) {
  const timestamp = Date.now();
  const id = `enq_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  const record = {
    id,
    company_id: sanitize(enquiry.company_id),
    name: sanitize(enquiry.name),
    email: sanitize(enquiry.email),
    phone: sanitize(enquiry.phone || ''),
    subject: sanitize(enquiry.subject || 'New Website Enquiry'),
    message: sanitize(enquiry.message),
    status: 'new',
    source: 'website_webhook',
    created_at: new Date().toISOString(),
  };

  // Write enquiry to Firebase RTDB
  const dbUrl = `${FIREBASE_DB_URL}/enquiries/${id}.json`;
  const data = JSON.stringify(record);

  const result = await new Promise((resolve, reject) => {
    const url = new URL(dbUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(record);
          } else {
            reject(new Error(`Firebase write failed: ${res.statusCode} ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  // Also create a Lead so it appears in the CRM pipeline
  if (enquiry.company_id) {
    try {
      const leadId = `ld_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
      const leadRecord = {
        id: leadId,
        company_id: sanitize(enquiry.company_id),
        name: sanitize(enquiry.name),
        email: sanitize(enquiry.email),
        phone: sanitize(enquiry.phone || ''),
        status: 'new',
        source: 'Website',
        owner_id: '',
        notes: sanitize(enquiry.message || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const leadUrl = `${FIREBASE_DB_URL}/leads/${leadId}.json`;
      const leadData = JSON.stringify(leadRecord);
      await new Promise((resolve, reject) => {
        const url = new URL(leadUrl);
        const req = https.request(
          {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(leadData),
            },
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve());
          }
        );
        req.on('error', reject);
        req.write(leadData);
        req.end();
      });
    } catch (leadError) {
      console.error('[enquiries] Failed to create lead:', leadError.message);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// HTTP Request Handler
// ---------------------------------------------------------------------------
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleRequest(req, res) {
  setCorsHeaders(res);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    sendJson(res, 200, {
      status: 'ok',
      service: 'website-enquiries-webhook',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // POST /api/enquiries or POST /enquiries
  if (req.method === 'POST' && (req.url === '/api/enquiries' || req.url === '/enquiries')) {
    try {
      const body = await parseBody(req);

      // Validate
      const errors = validateEnquiry(body);
      if (errors.length > 0) {
        sendJson(res, 400, { error: 'Validation failed', details: errors });
        return;
      }

      // Save to CRM
      const record = await saveEnquiry(body);
      sendJson(res, 201, { success: true, id: record.id, message: 'Enquiry saved to CRM' });
    } catch (err) {
      console.error('[enquiries] Error:', err.message);
      sendJson(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not found' });
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------
function startServer() {
  let server;

  // Check for SSL certificates
  if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    const options = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
    };
    server = https.createServer(options, handleRequest);
    console.log(`[HTTPS] SSL certificates loaded`);
  } else {
    console.log(`[WARNING] SSL certificates not found at ${SSL_KEY_PATH}`);
    console.log(`[WARNING] Starting HTTP server (not secure). Use HTTPS in production.`);
    console.log(`[INFO] Generate self-signed certs: openssl req -x509 -newkey rsa:2048 -keyout server/certs/server.key -out server/certs/server.cert -days 365 -nodes`);
    server = http.createServer(handleRequest);
  }

  server.listen(PORT, HOST, () => {
    const protocol = fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH) ? 'https' : 'http';
    console.log(`\n========================================`);
    console.log(` Website Enquiries Webhook Server`);
    console.log(`========================================`);
    console.log(` URL:    ${protocol}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(` Health: ${protocol}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
    console.log(` POST:   ${protocol}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/enquiries`);
    console.log(` NOTE:   Requests must include "company_id" field`);
    console.log(`========================================\n`);
  });
}

startServer();
