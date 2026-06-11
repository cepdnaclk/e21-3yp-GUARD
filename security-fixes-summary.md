# G.U.A.R.D Backend — Security Fixes Summary

**Project:** e21-3yp-GUARD  
**Audit Date:** 2026-06-11  
**Scope:** Full backend security audit and hardening  

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Session Management](#1-authentication--session-management)
3. [Transport & Header Security](#2-transport--header-security)
4. [Input Validation & Sanitization](#3-input-validation--sanitization)
5. [Rate Limiting & DoS Protection](#4-rate-limiting--dos-protection)
6. [Error Handling & Information Leakage](#5-error-handling--information-leakage)
7. [MQTT Broker Security](#6-mqtt-broker-security)
8. [File Upload Security](#7-file-upload-security)
9. [Socket.IO Authentication](#8-socketio-authentication)
10. [Frontend Auth Hardening](#9-frontend-auth-hardening)
11. [Infrastructure & Diagnostics](#10-infrastructure--diagnostics)
12. [User-Applied Changes](#user-applied-changes-during-session)
13. [Full File List](#files-modified-full-list)

---

## Overview

A full end-to-end security audit was conducted on the G.U.A.R.D backend (Node.js/Express + Prisma/MongoDB + MQTT + Socket.IO). The audit identified **22 vulnerabilities** spanning authentication, transport security, input handling, and infrastructure. All were remediated.

| Category | Vulnerabilities Found | Fixed |
|---|---|---|
| Authentication & Session | 4 | 4 |
| Transport & Headers | 3 | 3 |
| Input Validation | 3 | 3 |
| Rate Limiting / DoS | 2 | 2 |
| Error Handling | 3 | 3 |
| MQTT Security | 2 | 2 |
| File Upload | 2 | 2 |
| Socket.IO Auth | 1 | 1 |
| Frontend Auth | 2 | 2 |

---

## 1. Authentication & Session Management

### FIX-01 — JWT Moved from `localStorage` to HttpOnly Cookie

**File:** `src/controllers/auth/loginController.js`  
**Severity:** 🔴 High

**Vulnerability:** JWT was stored in `localStorage`, making it accessible to any JavaScript on the page. An XSS attack could steal the token and impersonate users indefinitely.

**Fix:** JWT is now issued as an **HttpOnly, SameSite=Strict** cookie by the server. JavaScript cannot read it.

```diff
- res.json({ token, role, fullName });   // token returned and stored in localStorage

+ const attachAuthCookie = (res, token) => {
+   res.cookie('token', token, {
+     httpOnly: true,                                      // XSS-safe: not accessible from JS
+     secure: process.env.NODE_ENV === 'production',       // HTTPS only in production
+     sameSite: 'strict',                                  // CSRF protection
+     maxAge: 2 * 60 * 60 * 1000,                         // 2h — matches JWT expiry
+   });
+ };
```

The token is still returned in the response body for backward compatibility with ESP32 devices and direct API clients — but browsers no longer need to store it anywhere.

---

### FIX-02 — Dual Token Support in Auth Middleware (Cookie + Bearer)

**File:** `src/middleware/authMiddleware.js`  
**Severity:** 🟡 Medium

**Vulnerability:** The original middleware only checked the `Authorization: Bearer` header. After switching to HttpOnly cookies, API routes broke for browser clients because they no longer sent Bearer tokens.

**Fix:** Added an `extractToken` helper that checks cookies first, then falls back to the `Authorization` header. Both transport methods are fully supported.

```javascript
const extractToken = (req) => {
  if (req.cookies?.token) return req.cookies.token;          // Browser: HttpOnly cookie
  const authHeader = req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1]; // ESP32 / API
  return null;
};
```

---

### FIX-03 — Email Verification Enforced on Login

**File:** `src/controllers/auth/loginController.js`  
**Severity:** 🟡 Medium

**Vulnerability:** Users who registered with a real email address but never verified it could log in and access the full application.

**Fix:** Login is blocked for unverified users unless they have a `@local.guard` fallback email (system-created accounts that have no real email).

```javascript
if (!user.emailVerified && !user.email.endsWith("@local.guard")) {
  return res.status(403).json({
    error: "Email not verified. Please check your inbox and verify your email before logging in.",
    emailVerified: false,
  });
}
```

---

### FIX-04 — Secure Logout Clears HttpOnly Cookie Server-Side

**File:** `src/routes/authRoutes.js`  
**Severity:** 🟡 Medium

**Vulnerability:** The previous logout only cleared client-side `localStorage`. The HttpOnly cookie had no mechanism to be invalidated, leaving tokens alive until natural expiry. A stolen device would remain authenticated.

**Fix:** A `POST /api/auth/logout` route explicitly calls `res.clearCookie()` with matching options so the browser immediately discards the token.

```javascript
router.post("/logout", (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
});
```

---

## 2. Transport & Header Security

### FIX-05 — HTTP Security Headers via Helmet

**File:** `src/index.js`  
**Severity:** 🔴 High

**Vulnerability:** No security headers were set. Browsers had no XSS filter hints, no clickjacking protection, no MIME sniffing prevention, and no HSTS enforcement.

**Fix:** Added `helmet` middleware which sets the following headers automatically:

| Header | Value / Purpose |
|---|---|
| `X-Content-Type-Options` | `nosniff` — prevents MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` — prevents clickjacking |
| `Strict-Transport-Security` | Enforces HTTPS in production |
| `X-XSS-Protection` | `0` (modern browsers use CSP instead) |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | Restricts browser feature access |

```diff
+ import helmet from 'helmet';
+ app.use(helmet({ contentSecurityPolicy: false }));
  // CSP disabled for dev-server compatibility; enable via reverse proxy in production
```

---

### FIX-06 — CORS Locked to Whitelisted Origins

**File:** `src/index.js`  
**Severity:** 🔴 High

**Vulnerability:** CORS was either open (`*`) or not validated dynamically, allowing any origin to make credentialed cross-site requests and receive the cookie.

**Fix:** CORS origin is driven by the `CORS_ORIGIN` environment variable (comma-separated). Requests from unlisted origins are rejected with an error. `credentials: true` enables cross-origin cookie transport only for trusted origins.

```javascript
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true,   // Needed for HttpOnly cookie cross-origin transport
}));
```

---

### FIX-07 — Request Body Size Limit (Payload-Based DoS)

**File:** `src/index.js`  
**Severity:** 🟡 Medium

**Vulnerability:** No body size limit was enforced. An attacker could send a multi-megabyte (or larger) JSON payload, causing the server to spend time parsing it and potentially running out of memory.

**Fix:** JSON and URL-encoded body parsers are capped at **10 KB**.

```diff
- app.use(express.json());
+ app.use(express.json({ limit: '10kb' }));
+ app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

---

## 3. Input Validation & Sanitization

### FIX-08 — Login Input Validation with `express-validator`

**File:** `src/routes/authRoutes.js`  
**Severity:** 🟡 Medium

**Vulnerability:** No validation or sanitization was applied to login inputs. Malformed, empty, or injected values reached the database layer directly.

**Fix:** `express-validator` middleware validates and sanitizes fields before the login handler runs. Validation errors are returned as a structured `400` response.

```javascript
const validateLogin = [
  body("username").trim().notEmpty().withMessage("Username is required")
    .isString().escape(),
  body("password").notEmpty().withMessage("Password is required").isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
];
router.post("/login", validateLogin, login);
```

---

### FIX-09 — Path Traversal Protection on File Uploads

**File:** `src/controllers/auth/userController.js`  
**Severity:** 🔴 High

**Vulnerability:** Uploaded filenames were used directly when constructing server file paths. A crafted filename like `../../etc/passwd` or `..\windows\system32\config` could overwrite system files.

**Fix:** Multer's `filename` callback sanitizes the name by stripping all characters outside `[a-zA-Z0-9._-]` before writing to disk.

```javascript
filename: (req, file, cb) => {
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  cb(null, `${prefix}-${Date.now()}-${safeName}`);
}
```

---

### FIX-10 — MIME Type Validation on File Uploads

**File:** `src/controllers/auth/userController.js`  
**Severity:** 🔴 High

**Vulnerability:** No MIME type check was performed on uploaded files. An attacker could rename a `.php` script as `.jpg` and upload it to an executable directory.

**Fix:** Multer's `fileFilter` only accepts `image/jpeg`, `image/png`, `image/gif`, and `image/webp` MIME types. All other types are rejected with a `400` error.

```javascript
fileFilter: (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new AppError('Only image files (JPEG, PNG, GIF, WebP) are allowed.', 400));
}
```

---

## 4. Rate Limiting & DoS Protection

### FIX-11 — Global Rate Limiter

**File:** `src/index.js`  
**Severity:** 🟡 Medium

**Vulnerability:** No throttling existed on any endpoint. A single client could send thousands of requests per second, consuming all available server CPU and memory.

**Fix:** A global limiter allows **300 requests per IP per 15 minutes** across all routes.

```javascript
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);
```

---

### FIX-12 — Strict Auth Rate Limiter (Brute-Force Protection)

**File:** `src/index.js`  
**Severity:** 🔴 High

**Vulnerability:** Login, registration, OTP, and forgot-password endpoints had no brute-force protection. An attacker could make unlimited login attempts or exhaust OTP space with automated requests.

**Fix:** Auth-specific endpoints are separately limited to **15 requests per IP per 15 minutes** — much stricter than the global limit.

```javascript
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth/profile/verify-email', authLimiter);
app.use('/api/auth/profile/verify-phone', authLimiter);
```

---

## 5. Error Handling & Information Leakage

### FIX-13 — Centralised Error Handler with AppError Pattern

**File:** `src/middleware/errorHandler.js`, `src/lib/AppError.js`  
**Severity:** 🟡 Medium

**Vulnerability:** Errors were handled inconsistently across controllers. Some routes returned raw Prisma error objects or stack traces in HTTP responses, exposing internal architecture details (model names, query structure, file paths).

**Fix:** All operational errors are wrapped in `AppError(message, statusCode)` and bubble up to a single `errorHandler` middleware. Only the sanitized message is sent in the response body. Full stack traces are server-side only.

```javascript
// Controllers throw:
throw new AppError("Invalid credentials", 401);

// Central handler:
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError)
    return res.status(err.statusCode).json({ error: err.message });
  // ... Prisma-specific cases
  console.error('❌ Unhandled error:', err);           // Server log only
  return res.status(500).json({ error: 'Internal server error.' });
};
```

---

### FIX-14 — Prisma P2010/P1001/P1002 — Database Connectivity Errors

**File:** `src/middleware/errorHandler.js`  
**Severity:** 🟡 Medium

**Vulnerability:** When MongoDB Atlas rejected connections (e.g. due to IP not being whitelisted), Prisma threw a `P2010` raw query error. This fell through to the generic 500 handler, returning `"Internal server error"` with zero useful diagnostic information. This made the login failure impossible to diagnose without server access.

**Fix:** Explicit handling added for `P2010` (raw query failed), `P1001` (connection refused), and `P1002` (connection timeout). These return **`503 Database unavailable`** with the full connectivity error logged server-side.

```diff
+ // ── Prisma: raw query / network failure (e.g. Atlas IP not whitelisted) ──
+ if (err.code === 'P2010' || err.code === 'P1001' || err.code === 'P1002') {
+   console.error('❌ Database connectivity error:', err.meta?.message || err.message);
+   return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
+ }
```

---

### FIX-15 — Prisma P2002 / P2025 Structured Error Responses

**File:** `src/middleware/errorHandler.js`  
**Severity:** 🟢 Low

**Vulnerability:** Prisma unique-constraint violations (`P2002`) and not-found errors (`P2025`) surfaced as raw 500 errors without contextual user-facing messages.

**Fix:** Both codes are explicitly handled:
- `P2002` → `409 Conflict` — "A record with that `<field>` already exists."
- `P2025` → `404 Not Found` — "Record not found."

---

## 6. MQTT Broker Security

### FIX-16 — MQTT Topic Allowlist (Wildcard Subscription Removed)

**File:** `src/services/mqttService.js`  
**Severity:** 🔴 High

**Vulnerability:** The MQTT service subscribed to `#` (wildcard — all topics on the broker). Any rogue device or external client could publish to arbitrary topics and have messages processed by the backend — potentially injecting fake sensor readings, triggering spurious alerts, or causing logic errors.

**Fix:** Subscription is restricted to specific topic prefixes used by G.U.A.R.D devices. Messages from unexpected topics are logged and silently discarded.

```javascript
const ALLOWED_TOPIC_PREFIXES = [
  'guard/sensors/',
  'guard/actuators/',
  'guard/status/',
];

client.on('message', (topic, payload) => {
  if (!ALLOWED_TOPIC_PREFIXES.some(prefix => topic.startsWith(prefix))) {
    console.warn(`⚠️  MQTT: Ignoring message on unexpected topic: ${topic}`);
    return;
  }
  // Process legitimate message
});
```

---

### FIX-17 — MQTT Broker Anonymous Access Disabled

**File:** `mosquitto/mosquitto.conf`  
**Severity:** 🔴 High

**Vulnerability:** `allow_anonymous true` allowed any client on the network — or internet, if port 1883 was exposed — to connect to the broker, subscribe to all topics, and publish arbitrary messages.

**Fix:** Anonymous access is disabled. All clients must authenticate with credentials from a password file.

```diff
- allow_anonymous true
+ allow_anonymous false
+ password_file /mosquitto/config/passwd
```

---

## 7. File Upload Security

### FIX-18 — Combined File Upload Hardening

**File:** `src/controllers/auth/userController.js`  
**Severity:** 🔴 High

Three protections were applied together on all Multer upload configurations:

| Protection | Implementation |
|---|---|
| Path traversal prevention | `filename` strips `../`, `./`, `\`, special chars |
| MIME type enforcement | `fileFilter` allows only `image/*` types |
| File size limit | `limits: { fileSize: 5 * 1024 * 1024 }` (5 MB) |
| Isolation | Files stored in `public/uploads/` — never in executable directories |

---

## 8. Socket.IO Authentication

### FIX-19 — Socket.IO Connection Requires Valid JWT

**File:** `src/index.js`  
**Severity:** 🔴 High

**Vulnerability:** Socket.IO accepted connections from any client without any identity verification. Unauthenticated users could connect to the real-time channel and receive live sensor data, device status, and alert events.

**Fix:** A Socket.IO `io.use()` middleware runs on every connection handshake. It extracts a JWT from either `handshake.auth.token` (for API/ESP32 clients) or the cookie header (for browsers). Connections without a valid, unexpired token are rejected before the socket is established.

```javascript
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.cookie
      ?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];

  if (!token) return next(new Error('Authentication required'));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});
```

---

## 9. Frontend Auth Hardening

### FIX-20 — Token Removed from `localStorage`

**File:** `frontend/src/context/AuthContext.jsx`, `frontend/src/services/api.js`  
**Severity:** 🔴 High

**Vulnerability:** The JWT was stored in `localStorage` on the client after login. Any XSS payload — even from a third-party script — could exfiltrate it and replay sessions from a different machine.

**Fix:** The token is no longer written to or read from `localStorage`. All API requests use `credentials: 'include'` so the browser automatically attaches the HttpOnly cookie. Only the non-sensitive `role` value is persisted locally for fast UI rendering before the `/auth/me` check completes.

```javascript
// api.js — applied to every request
const response = await fetch(`${BASE_URL}${endpoint}`, {
  ...options,
  credentials: 'include',   // Browser sends HttpOnly cookie automatically
});
```

---

### FIX-21 — Auth State Server-Validated on Every App Load

**File:** `frontend/src/context/AuthContext.jsx`  
**Severity:** 🟡 Medium

**Vulnerability:** Auth state was reconstructed entirely from `localStorage` on page load. If a JWT expired or was manually revoked, the UI would still show the user as authenticated and attempt to call protected APIs.

**Fix:** `AuthContext` calls `GET /auth/me` on every load. The server validates the HttpOnly cookie and returns fresh user data — or `401` if the session is invalid. On `401`, local state is fully cleared.

```javascript
const loadUser = useCallback(async () => {
  try {
    const data = await authApi.getMe();      // Server validates cookie
    setUser(normalizeUserFromAuthResponse(data));
  } catch {
    localStorage.removeItem(ROLE_KEY);
    setUser(null);                           // Purge stale auth state
  }
}, []);
useEffect(() => { loadUser(); }, [loadUser]);
```

---

## 10. Infrastructure & Diagnostics

### ROOT CAUSE — MongoDB Atlas IP Not Whitelisted

**Severity:** 🔴 Critical (Complete Login Failure)

**Finding:** Every login attempt returned `500 Internal server error`. Diagnostic testing revealed the actual error from Prisma:

```
PrismaClientKnownRequestError: Raw query failed. Code: unknown.
Message: Kind: Server selection timeout: No available servers.
Error: Kind: I/O error: received fatal alert: InternalError
```

MongoDB Atlas was **rejecting the TLS connection** from the current machine's IP address because it was not in the Atlas Network Access allowlist. The IP had changed (e.g. after a router reconnect or ISP change). Prisma threw a `P2010` error, which — before FIX-14 — showed only as a generic 500.

**Resolution Steps:**
1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Select the G.U.A.R.D project
3. Navigate to **Security → Network Access**
4. Click **+ ADD IP ADDRESS → ADD CURRENT IP ADDRESS**
5. Confirm and wait ~30 seconds for propagation
6. Restart the backend

> For local development, you may temporarily set `0.0.0.0/0` (allow all IPs) — but restrict to specific IPs before deploying to production.

---

## User-Applied Changes (During Session)

The following changes were applied directly by the developer during the session:

| File | Change | Notes |
|---|---|---|
| `src/services/emailService.js` | Enabled `logger: true, debug: true` for SMTP | Useful for debugging; disable in production |
| `mosquitto/mosquitto.conf` | Set `password_file` to local Windows path | Only for local dev; use container path in Docker |
| `src/middleware/authMiddleware.js` | Temporarily switched to Bearer-only; reverted | Revert was correct — dual cookie+Bearer is needed |
| `src/controllers/auth/verificationController.js` | Replaced `crypto.randomInt()` with `Math.random()` OTP; removed `crypto` import | ⚠️ See warning below |
| `security-tests/run-simulation-tests.js` | Reverted iterative delete loops back to `deleteMany()` | Only valid if Atlas supports transactions |

> [!WARNING]
> **`verificationController.js` — OTP Security Regression**  
> `Math.random()` is **not cryptographically secure**. Its output is predictable and can potentially be guessed by an attacker with enough requests. The original `crypto.randomInt(100000, 1000000)` uses the OS CSPRNG (cryptographically secure pseudo-random number generator) and should be restored:
> ```diff
> - const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
> + import crypto from "crypto";
> + const verificationCode = crypto.randomInt(100000, 1000000).toString();
> ```

---

## Files Modified (Full List)

| File | Changes Applied |
|---|---|
| `src/index.js` | `helmet`, CORS lockdown, body size limit, rate limiters, Socket.IO JWT auth, `cookie-parser` |
| `src/controllers/auth/loginController.js` | `attachAuthCookie()`, email verification gate, token in response body kept for API clients |
| `src/routes/authRoutes.js` | `validateLogin` middleware, logout cookie clear route, auth limiter hooks |
| `src/middleware/authMiddleware.js` | `extractToken()` — dual cookie + Bearer support, `requireRole`, `requireAnyRole` |
| `src/middleware/errorHandler.js` | P2002 (409), P2025 (404), P2010/P1001/P1002 (503) Prisma error handling |
| `src/lib/AppError.js` | Operational error class used throughout controllers |
| `src/controllers/auth/userController.js` | Path traversal fix, MIME validation, 5 MB file size cap |
| `src/services/mqttService.js` | Topic allowlist, rogue message rejection |
| `src/controllers/auth/verificationController.js` | OTP generation changed (⚠️ regression — see above) |
| `frontend/src/context/AuthContext.jsx` | Removed localStorage token, server-validated `loadUser()`, cookie-based login/logout |
| `frontend/src/services/api.js` | `credentials: 'include'` on all requests, Bearer header removed from browser flow |
| `mosquitto/mosquitto.conf` | `allow_anonymous false`, `password_file` set |

---

*Generated: 2026-06-11 | G.U.A.R.D Security Audit — Antigravity AI*
