```text
C:\Users\Renaldi\phenotype-r\PROJECT_CONTEXT.md
```

````md
# PHENOTYPE - Complete Project Context

> This document is the single source of truth for developers and AI Agents working on the PHENOTYPE project.
>
> IMPORTANT:
> - The correct project name is **PHENOTYPE**.
> - NEVER call this project PHENONODE.
> - This project consists of a Next.js frontend, Express.js backend, Python SVM ML service, and Supabase PostgreSQL database.
> - Before modifying any code, inspect the existing implementation and understand the current architecture.
> - Do not redesign the existing UI unless explicitly requested.
> - Do not change the ML methodology/model unless explicitly requested.
> - Do not replace Express.js with FastAPI.
> - Do not create duplicate authentication systems.
> - Do not invent API endpoints, database fields, ML metrics, or system behavior.

---

# 1. PROJECT IDENTITY

Project name:

**PHENOTYPE**

PHENOTYPE is an IoT-based multi-sensor research platform for collecting sensor measurements, storing measurement data, processing the data through a machine learning service, and presenting measurement and analytical results through a web dashboard.

The system is intended for:

- research
- academic final project / thesis
- prototype demonstration
- IoT experimentation
- multi-sensor data acquisition
- machine learning experimentation
- measurement history and analytics

The system must avoid unsupported biological, medical, racial, ethnic, or identity-related claims.

If experimental labels are used, such as:

```text
Class_A
Class_B
Class_C
````

they must be treated as research labels unless scientifically validated ground truth exists.

Do not invent biological meaning for these labels.

---

# 2. HIGH-LEVEL SYSTEM ARCHITECTURE

The overall system consists of four major software components and one hardware component:

```text
ESP32-S3 IoT Device
        |
        | Wi-Fi / HTTP
        v
Express.js + TypeScript Backend
        |
        +--------------------+
        |                    |
        v                    v
Supabase PostgreSQL     Python SVM ML Service
        ^                    |
        |                    |
        +---------+----------+
                  |
                  v
        Next.js Frontend
```

More detailed architecture:

```text
                  PHENOTYPE SYSTEM
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
    IoT Device       Web Platform       ML Service
        |                |                |
        |                |                |
   ESP32-S3          Next.js          Python
   Sensors           React            scikit-learn
        |                |                |
        +---------> Express API <--------+
                         |
                         v
                    Supabase
                    PostgreSQL
```

---

# 3. COMPONENTS

## 3.1 IoT Hardware

Main MCU:

```text
ESP32-S3
```

Sensors:

```text
AS7341
TCS34725
VL53L1X
```

Optional:

```text
OLED
```

Input:

```text
Momentary Push Button
```

The primary ML feature set contains exactly 15 features.

---

# 4. SENSOR FEATURES

## AS7341

AS7341 contributes 10 features:

```text
F1
F2
F3
F4
F5
F6
F7
F8
Clear
NIR
```

## TCS34725

TCS34725 contributes 4 features:

```text
R
G
B
Clear
```

## VL53L1X

VL53L1X contributes 1 feature:

```text
Distance_mm
```

Total:

```text
10 + 4 + 1 = 15 features
```

These 15 features represent the current SVM input feature set.

---

# 5. IMPORTANT SENSOR LIMITATIONS

The sensors do NOT inherently detect a "palm".

They measure:

```text
AS7341
→ spectral/optical response

TCS34725
→ RGB/color response

VL53L1X
→ distance
```

The intended measurement procedure requires controlled positioning.

The system may use VL53L1X to validate that the measured object is within the expected distance range.

Typical measurement positioning:

```text
35 - 50 mm
```

This value should be configurable rather than duplicated throughout the code.

A controlled measurement area and consistent acquisition procedure are required for reliable research data.

Do not claim that the sensors directly identify biological identity.

---

# 6. CURRENT ML METHODOLOGY

The primary ML model is:

```text
Support Vector Machine (SVM)
```

SVM is a:

```text
Supervised Classification
```

method.

Do not describe SVM as clustering or anomaly detection.

Other research team approaches may use:

```text
K-Means
→ Unsupervised Clustering

Isolation Forest
→ Anomaly Detection
```

These are different methodologies.

Do not mix their purposes.

---

# 7. CURRENT SVM FEATURES

The SVM model expects:

```text
15 features
```

Feature groups:

```text
AS7341:
F1
F2
F3
F4
F5
F6
F7
F8
Clear
NIR

TCS34725:
R
G
B
Clear

VL53L1X:
Distance_mm
```

Do not add or remove ML features without explicitly updating:

* dataset
* preprocessing
* model
* inference API
* backend contract
* frontend types
* documentation
* evaluation

---

# 8. VALIDATED SVM RESULTS

The currently validated SVM results are approximately:

```text
Accuracy:          80.00%
Macro Precision:   78.21%
Macro Recall:      78.94%
Macro F1:          78.41%
Weighted F1:       80.30%
```

Do NOT replace these with fabricated values.

For example, do NOT display:

```text
Accuracy: 94.2%
Precision: 93.5%
Recall: 94.8%
F1: 94.1%
```

unless those values are actually generated from a validated experiment.

The frontend must not hardcode fake model performance values.

If model performance is displayed, it should preferably come from actual experiment metadata/results or backend data.

---

# 9. ML DATASET RULES

The ML project uses subject/group-aware evaluation where applicable.

If multiple measurements belong to the same subject, avoid subject leakage.

Example:

```text
Subject 001
Measurement 1
Measurement 2
Measurement 3
Measurement 4
Measurement 5
```

Measurements belonging to the same subject should not accidentally be split across train and test when evaluating generalization to unseen subjects.

Do not perform a naive random row split without considering subject identity.

---

# 10. DATA PRIVACY

The project must NOT require confidential or proprietary data.

Never make the following mandatory:

* confidential client data
* internal company data
* proprietary institutional databases
* private consultation results
* STIFIn database
* INOU proprietary database
* confidential customer profiles
* confidential employee data

Use:

* synthetic data
* dummy data
* researcher-generated data
* public data permitted for research
* explicitly authorized research data

Do not add confidential information into source code, datasets, environment files, screenshots, documentation, or GitHub repositories.

---

# 11. REPOSITORY STRUCTURE

The project is organized into separate applications:

```text
phenotype-r/
|
+-- frontend/
|
+-- backend/
|
+-- ml/
|
+-- PROJECT_CONTEXT.md
```

The three applications may have separate GitHub repositories.

Example:

```text
phenotype-frontend
phenotype-backend
svm-phenotype
```

Do not merge the repositories unless explicitly requested.

---

# 12. FRONTEND

Frontend technology:

```text
Next.js
React
TypeScript
Tailwind CSS
Lucide React
REST API
```

The frontend communicates with the Express backend through HTTP.

The frontend should not directly expose:

* database secrets
* JWT secrets
* Supabase service-role keys
* device keys
* ML service secrets

---

# 13. FRONTEND ROUTES

## Public Routes

```text
/
/login
/register
```

## Protected Routes

```text
/dashboard
/measurement
/history
/device
/analytics
/settings
```

All protected routes require valid authentication.

---

# 14. FRONTEND AUTHENTICATION

The project uses an existing authentication architecture.

Use the existing:

```text
AuthContext
```

and existing API client.

Do NOT create another AuthContext.

Do NOT create a second authentication mechanism.

Authentication must have one source of truth.

---

# 15. AUTHENTICATION BEHAVIOR

The application MUST handle:

1. Manual logout
2. Manual token deletion
3. Manual session deletion
4. Invalid token
5. Expired token
6. HTTP 401
7. Direct protected route access
8. Refresh after authentication is removed
9. Browser Back after logout
10. Multi-tab authentication changes where possible

Expected behavior:

```text
Valid authentication
        |
        v
Authenticated
        |
        v
Protected routes accessible
```

If authentication disappears:

```text
Token/session deleted
        |
        v
Authentication invalid
        |
        v
Clear auth state
        |
        v
Redirect to /
```

IMPORTANT:

The user MUST NOT need to click the Logout button after manually deleting the authentication credential.

Example:

```text
Login
  ↓
Dashboard
  ↓
Open DevTools
  ↓
Delete authentication token/session/cookie
  ↓
Application detects missing authentication
  ↓
Clear auth state
  ↓
Automatically redirect to /
```

---

# 16. STORAGE EVENT LIMITATION

Do not rely only on:

```text
window.storage
```

The browser storage event does not reliably detect same-tab modifications.

Therefore authentication validation must also be performed through appropriate application lifecycle/request/route validation.

If multi-tab support is possible, use storage events for cross-tab changes.

---

# 17. LOGOUT FLOW

Logout must be centralized.

Expected:

```text
User clicks Sign Out
        ↓
Centralized logout()
        ↓
Remove authentication token/session
        ↓
Clear authenticated user
        ↓
Set authentication state to false
        ↓
Redirect to /
```

After logout:

```text
token = absent
user = null
isAuthenticated = false
```

Do not leave stale authentication state.

---

# 18. API 401 HANDLING

HTTP:

```text
401 Unauthorized
```

should normally mean the authentication is no longer valid.

Expected:

```text
API request
    ↓
401
    ↓
Clear authentication
    ↓
Clear user state
    ↓
Redirect /
```

Do not treat every API error as a logout.

For example:

```text
400
403
404
409
500
```

should not automatically trigger logout unless explicitly required by the existing architecture.

---

# 19. PROTECTED ROUTE BEHAVIOR

When unauthenticated user opens:

```text
/dashboard
```

redirect to:

```text
/
```

Same for:

```text
/measurement
/history
/device
/analytics
/settings
```

The protected route must not render authenticated content before authentication is confirmed.

---

# 20. AUTHENTICATION LOADING

During initial authentication checking:

```text
INITIALIZING
    ↓
CHECK AUTH
    ↓
VALID
or
INVALID
```

Do not immediately render the protected page while authentication is still being checked.

Avoid:

```text
Dashboard appears
    ↓
Authentication check
    ↓
Dashboard disappears
    ↓
Redirect
```

Use existing loading/skeleton mechanisms where available.

Do not redesign the UI.

---

# 21. BROWSER REFRESH

Scenario:

```text
Login
→ Dashboard
→ Refresh
```

Expected:

```text
Valid authentication
→ remain authenticated
→ Dashboard
```

Scenario:

```text
Login
→ Delete token/session
→ Refresh /dashboard
```

Expected:

```text
No authentication
→ /
```

---

# 22. BROWSER BACK BUTTON

Scenario:

```text
Dashboard
→ Logout
→ /
→ Browser Back
```

The browser must NOT allow the user to access protected content as an authenticated user.

The route guard must check authentication again.

Do not manipulate browser history unnecessarily.

---

# 23. FRONTEND API ENVIRONMENT

The frontend uses:

```env
NEXT_PUBLIC_API_URL=
```

Local example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Production example:

```env
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-DOMAIN
```

Never hardcode the production backend URL directly into components.

---

# 24. FRONTEND PAGES

## Landing

Route:

```text
/
```

Purpose:

Research/product showcase.

The landing page is public.

---

## Login

Route:

```text
/login
```

Purpose:

Authenticate users.

---

## Register

Route:

```text
/register
```

Purpose:

Create an account through the existing backend authentication API.

---

## Dashboard

Route:

```text
/dashboard
```

Purpose:

Provide a concise system overview.

Possible content:

* Device status
* Sensor health
* Total measurements
* Measurement success rate
* Latest prediction
* Latest confidence
* Recent measurements
* New Measurement action

Do not overload the dashboard with all 15 sensor features.

---

## Measurement

Route:

```text
/measurement
```

Purpose:

Create and process a measurement.

Expected lifecycle:

```text
IDLE
→ START_REQUESTED
→ DISTANCE_VALIDATION
→ MEASURING
→ PROCESSING
→ COMPLETED
```

Measurement can be started through:

1. Physical ESP32 button
2. Web interface

Both should ultimately use the same measurement workflow/state machine.

---

## History

Route:

```text
/history
```

Purpose:

Show historical measurements.

Recommended information:

```text
Measurement ID
Date
Time
Result
Confidence
Quality
Sample count
```

Measurement details may include:

```text
Timestamp
Distance
All 15 sensor features
Sample count
Quality
SVM result
Class probabilities
```

---

## Device

Route:

```text
/device
```

Purpose:

Monitor ESP32-S3.

Possible information:

```text
Device ID
Online/offline status
IP
Wi-Fi status
RSSI
Uptime
Sensor connection state
Last communication
Packet information
I2C information
```

---

## Analytics

Route:

```text
/analytics
```

Purpose:

Display research and model analytics.

Recommended sections:

```text
SVM Model Overview
Confusion Matrix
Classification Report
Feature Importance
Multi-Sensor Fusion
Ablation Study
Dataset Overview
Prediction Analytics
Model Configuration
```

Do not hardcode fake performance metrics.

---

## Settings

Route:

```text
/settings
```

Possible settings:

```text
Account
Sample count
Acquisition timeout
Minimum distance
Maximum distance
Heartbeat frequency
AS7341 auto-gain
Model information
```

Model information should preferably be read-only.

---

# 25. BACKEND

Backend technology:

```text
Node.js
Express.js
TypeScript
Supabase
PostgreSQL
Axios
Zod
JWT
RBAC
```

IMPORTANT:

The backend is Express.js.

Do NOT replace the backend with FastAPI.

Python is only for the ML service.

---

# 26. BACKEND ARCHITECTURE

The backend follows a layered architecture:

```text
Routes
   ↓
Controllers
   ↓
Services
   ↓
Repositories
   ↓
Supabase / External Services
```

ML communication:

```text
Controller
   ↓
Service
   ↓
ML Client
   ↓
Python SVM API
```

Controllers should not contain large amounts of business logic.

Services should contain business logic.

Repositories should handle database access.

---

# 27. BACKEND AUTHENTICATION

Authentication uses JWT and Supabase-related authentication infrastructure.

Available roles:

```text
ADMIN
OPERATOR
USER
```

Frontend authentication is NOT a replacement for backend authorization.

Backend must remain the security authority.

---

# 28. DEVICE AUTHENTICATION

IoT requests use device credentials such as:

```text
x-device-id
x-device-key
```

Device credentials must not be exposed in frontend JavaScript.

---

# 29. BACKEND API

Current API structure:

## Auth

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Users

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

## Devices

```text
GET   /api/devices
POST  /api/devices
GET   /api/devices/:id
PATCH /api/devices/:id
```

## IoT

```text
POST /api/iot/measurements
POST /api/iot/heartbeat
POST /api/iot/device-status
```

## Measurements

```text
POST  /api/measurements
GET   /api/measurements
GET   /api/measurements/:id
PATCH /api/measurements/:id/status
GET   /api/measurements/:id/sensors
```

## ML

```text
GET /api/ml/predictions/:measurementId
GET /api/ml/models
```

## Analytics

```text
GET /api/analytics/measurements
GET /api/analytics/predictions
GET /api/analytics/devices
GET /api/analytics/model-performance
```

## Audit Logs

```text
GET /api/audit-logs
```

IMPORTANT:

These routes are documentation/context only.

Before modifying or integrating an endpoint, inspect the actual backend implementation.

The actual source code is the final source of truth.

---

# 30. ML API INTEGRATION

Backend communicates with the Python ML service using:

```text
ML_SERVICE_URL
```

Example local:

```env
ML_SERVICE_URL=http://localhost:8000
```

Production:

```env
ML_SERVICE_URL=https://PUBLIC-ML-SERVICE-DOMAIN
```

Never use localhost for the production ML service.

Incorrect production configuration:

```env
ML_SERVICE_URL=http://localhost:8000
```

because localhost would refer to the backend server itself.

---

# 31. ML PREDICTION FLOW

Expected:

```text
Measurement
    ↓
Backend receives sensor data
    ↓
Validate sensor data
    ↓
Send 15 features to Python ML service
    ↓
SVM prediction
    ↓
Prediction result
    ↓
Backend stores prediction
    ↓
Frontend retrieves prediction
```

If ML processing fails:

```text
Raw measurement
    ↓
Still stored if existing backend behavior allows it
    ↓
Prediction status marked failed
```

Do not silently discard raw measurement data.

---

# 32. SUPABASE

Database platform:

```text
Supabase PostgreSQL
```

Backend communicates with Supabase.

Do not expose private Supabase credentials to the frontend.

Do not place service-role keys in:

```text
NEXT_PUBLIC_*
```

or client-side source code.

---

# 33. ENVIRONMENT VARIABLES

Backend may contain:

```env
PORT=
SUPABASE_URL=
SUPABASE_ANON_KEY=
JWT_SECRET=
ML_SERVICE_URL=
```

Frontend may contain:

```env
NEXT_PUBLIC_API_URL=
```

Never commit real `.env` files.

Use:

```text
.env.example
```

with placeholders.

Example:

```env
PORT=5000
SUPABASE_URL=
SUPABASE_ANON_KEY=
JWT_SECRET=
ML_SERVICE_URL=
```

Never put actual secrets into `.env.example`.

---

# 34. GIT RULES

Before making Git changes:

```powershell
git status
git remote -v
```

If changes exist:

```powershell
git add .
git commit -m "Update project"
git push origin main
```

Do NOT run:

```powershell
git init
```

if the repository already exists.

---

# 35. GIT SECURITY

Never commit:

```text
.env
.env.local
.env.production
```

Never commit:

```text
API keys
JWT secrets
passwords
Supabase service-role keys
device keys
private credentials
```

Check:

```powershell
git status
```

before committing.

---

# 36. FRONTEND AND BACKEND CONTRACT

Frontend and backend must agree on:

* endpoint
* HTTP method
* request body
* response body
* status code
* authentication requirements
* TypeScript types
* error format

Before changing an API:

1. Inspect route.
2. Inspect controller.
3. Inspect service.
4. Inspect repository.
5. Inspect validation schema.
6. Inspect frontend API client.
7. Inspect frontend types.
8. Update both sides consistently.

Do not blindly use:

```ts
any
```

to hide API mismatches.

---

# 37. ERROR HANDLING

Expected HTTP semantics:

```text
400 = Bad Request / validation
401 = Unauthenticated
403 = Forbidden
404 = Not Found
409 = Conflict
500 = Server Error
```

HTTP 401 normally triggers frontend authentication reset.

Other errors should be handled according to their actual meaning.

Do not convert all errors into logout.

---

# 38. HEALTH CHECK

The backend should preferably provide:

```text
GET /api/health
```

Example:

```json
{
  "status": "ok",
  "service": "phenotype-backend"
}
```

This endpoint is useful for:

* deployment
* monitoring
* debugging
* uptime checks

If `/api/health` does not currently exist, inspect the backend before adding it.

---

# 39. LOCAL DEVELOPMENT

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
npm install
npm run dev
```

ML:

```text
cd ml
activate Python environment
run Python ML service
```

Typical local architecture:

```text
Next.js
localhost:3000
      ↓
Express
localhost:5000
      ↓
Python SVM
localhost:8000
      ↓
Supabase
```

Actual ports must be determined from the project configuration.

Do not assume ports without checking `.env`, package scripts, or source code.

---

# 40. DEPLOYMENT ARCHITECTURE

Potential production architecture:

```text
                 Internet
                    |
                    v
             Vercel / Frontend
              Next.js Application
                    |
                    | HTTPS
                    v
             Backend Hosting
              Express.js API
               /          \
              /            \
             v              v
       Supabase        Python ML
       PostgreSQL       Service
```

Possible hosting:

```text
Frontend:
Vercel

Backend:
Koyeb / Render / VPS

ML:
Separate Python-capable hosting

Database:
Supabase
```

Do not assume one platform can run both Express and Python efficiently on a free tier.

---

# 41. DEPLOYMENT ENVIRONMENT

Production frontend:

```env
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-DOMAIN
```

Production backend:

```env
ML_SERVICE_URL=https://YOUR-ML-DOMAIN
```

The backend must NOT use:

```text
localhost
```

to reach a separately deployed ML service.

---

# 42. CORS

Because frontend and backend may have different domains:

```text
Frontend:
https://YOUR-PHENOTYPE-DOMAIN

Backend:
https://YOUR-BACKEND-DOMAIN
```

backend CORS must allow the actual frontend origin.

Local development may allow:

```text
http://localhost:3000
```

Production should use the actual deployed frontend domain.

Do not use unrestricted:

```text
origin: "*"
```

for authenticated production APIs unless there is a specific and justified reason.

---

# 43. UI RULES

Existing UI should be preserved.

Do not redesign:

* landing page
* dashboard
* sidebar
* topbar
* measurement
* history
* device
* analytics
* settings
* login
* register

unless explicitly requested.

When fixing logic:

```text
Change behavior
NOT appearance
```

Do not unnecessarily modify:

* colors
* spacing
* typography
* layout
* animations
* component structure

---

# 44. ANALYTICS RULES

Analytics should distinguish:

```text
Live Device Data
```

from:

```text
Research / Experiment Results
```

Do not mix live telemetry with validated ML evaluation metrics.

Recommended analytics:

```text
SVM Model Overview
Confusion Matrix
Classification Report
Feature Importance
Multi-Sensor Fusion
Ablation Study
Dataset Overview
Prediction Analytics
Model Configuration
```

Feature importance should reflect actual model/experiment output.

Do not create fake charts or fake statistics.

---

# 45. MEASUREMENT QUALITY

Measurement quality may consider:

* distance validity
* sample count
* sensor availability
* communication status
* missing values
* acquisition completeness

Do not claim a measurement is valid solely because the request reached the backend.

---

# 46. SECURITY PRINCIPLES

Never expose:

```text
JWT_SECRET
Supabase service role key
Device key
Private API key
Database password
```

Never log secrets.

Never return passwords in API responses.

Do not store passwords in frontend localStorage.

Authentication tokens must be handled according to the existing authentication architecture.

---

# 47. AI AGENT DEVELOPMENT RULES

When an AI Agent is asked to modify PHENOTYPE:

## FIRST

Inspect the actual project.

Do not immediately rewrite code.

Inspect:

```text
package.json
tsconfig.json
.env.example
source files
API routes
AuthContext
API client
database integration
ML integration
```

as relevant.

## SECOND

Identify the root cause.

## THIRD

Make the smallest appropriate change.

## FOURTH

Run validation.

## FIFTH

Report exactly what changed.

---

# 48. DO NOT MAKE UNRELATED CHANGES

If asked to fix authentication:

DO NOT:

* redesign dashboard
* modify SVM
* modify database schema
* change sensor features
* rewrite backend architecture
* change API contracts unnecessarily
* install unrelated packages

If asked to fix backend:

DO NOT modify frontend unless the backend change requires a corresponding contract update.

If asked to fix frontend:

DO NOT modify ML methodology.

---

# 49. CODE QUALITY CHECK

After code changes, run relevant checks.

Frontend:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Backend:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Use the actual scripts available in `package.json`.

ML:

```text
Run available Python tests
Run pipeline validation
Check inference
Check model loading
```

Do not claim tests passed if they were not actually run.

---

# 50. CODEBASE HEALTH CHECK

When asked to check whether the code has errors, inspect the entire relevant codebase.

Check:

```text
TypeScript errors
JavaScript errors
ESLint
Build errors
Broken imports
Missing files
Unused imports
Unused variables
React errors
Next.js errors
Runtime risks
API mismatch
Authentication issues
Environment variables
Dependency issues
Broken routes
Null/undefined issues
State management issues
Error handling
Production build
```

Run:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

if those scripts exist.

Do not assume:

```text
build passed = application has no bugs
```

A build can pass while runtime or business logic is still incorrect.

---

# 51. CODEBASE HEALTH REPORT FORMAT

When performing a health check, report:

```text
## CODEBASE HEALTH CHECK

### Overall Status
PASS / WARNING / FAIL

### TypeScript
PASS / WARNING / FAIL

### ESLint
PASS / WARNING / FAIL

### Build
PASS / WARNING / FAIL

### Runtime / Logic
PASS / WARNING / FAIL

### API Integration
PASS / WARNING / FAIL

### Authentication
PASS / WARNING / FAIL

### Routes
PASS / WARNING / FAIL

### Environment Variables
PASS / WARNING / FAIL

### Dependencies
PASS / WARNING / FAIL

### Critical Issues
...

### Non-Critical Issues
...

### Final Verdict
SAFE TO CONTINUE / NEEDS FIX / CRITICAL ERROR
```

Do not invent issues.

Clearly distinguish:

```text
ERROR
WARNING
INFO
```

---

# 52. AUTHENTICATION TEST CHECKLIST

Test:

```text
1. Login → Dashboard → Logout → /

2. Login → Dashboard → manually delete auth credential
   → automatic redirect /

3. Logout → manually open /dashboard
   → /

4. Logout → manually open /measurement
   → /

5. Logout → manually open /history
   → /

6. Logout → manually open /device
   → /

7. Logout → manually open /analytics
   → /

8. Logout → manually open /settings
   → /

9. Login → refresh Dashboard
   → remain authenticated

10. Delete authentication → refresh Dashboard
    → /

11. API returns 401
    → clear authentication
    → /

12. Logout → Browser Back
    → protected route remains blocked
```

---

# 53. DEPLOYMENT READINESS CHECKLIST

Before deployment:

```text
[ ] Frontend builds successfully
[ ] Backend builds successfully
[ ] ML service starts successfully
[ ] Supabase connection works
[ ] Frontend can call backend
[ ] Backend can call ML service
[ ] Backend can access Supabase
[ ] CORS configured
[ ] Production environment variables configured
[ ] No secrets committed
[ ] Health check works
[ ] Authentication works
[ ] Logout works
[ ] Expired authentication is handled
[ ] API 401 is handled
[ ] Measurement workflow works
[ ] SVM prediction works
[ ] Prediction is stored
[ ] History works
[ ] Analytics works
[ ] Device status works
```

---

# 54. FINAL SYSTEM FLOW

The intended end-to-end flow is:

```text
                    USER
                     |
                     v
              Next.js Frontend
                     |
                     | HTTPS
                     v
              Express Backend
                     |
          +----------+----------+
          |                     |
          v                     v
      Supabase              Python SVM
      PostgreSQL             ML Service
          ^                     |
          |                     |
          +----------+----------+
                     |
                     |
                  ESP32-S3
                     |
          +----------+----------+
          |          |          |
          v          v          v
       AS7341    TCS34725    VL53L1X
```

Measurement flow:

```text
ESP32
  ↓
Collect sensor data
  ↓
Backend
  ↓
Validate measurement
  ↓
Store raw data
  ↓
Send 15 features to SVM
  ↓
SVM prediction
  ↓
Store prediction
  ↓
Frontend retrieves result
  ↓
Dashboard / History / Analytics
```

---

# 55. GOLDEN RULES FOR PHENOTYPE

1. The project name is PHENOTYPE.
2. Do not call it PHENONODE.
3. Existing code is the source of truth.
4. Inspect before modifying.
5. Do not redesign UI unless explicitly requested.
6. Do not replace Express.js with FastAPI.
7. Python is the separate ML service.
8. SVM is supervised classification.
9. Current ML feature count is 15.
10. Do not fabricate ML metrics.
11. Do not expose confidential data.
12. Do not commit secrets.
13. Do not create duplicate authentication systems.
14. Protected routes require valid authentication.
15. Missing/invalid/expired authentication must redirect to `/`.
16. Manual deletion of authentication credentials must be detected.
17. HTTP 401 must invalidate authentication.
18. Frontend authentication does not replace backend authorization.
19. Do not use localhost for communication between separately deployed production services.
20. Do not claim unsupported biological or medical capabilities.
21. Make minimal, targeted code changes.
22. Run tests/build/type checks after changes.
23. Report actual results, not assumed results.
24. Never claim something was tested if it was not actually tested.
25. Preserve the existing PHENOTYPE architecture unless explicitly instructed otherwise.

---

# 56. CURRENT SOURCE-OF-TRUTH PRIORITY

When information conflicts, use this priority:

```text
1. Actual source code
2. Actual database/schema
3. Actual API implementation
4. Actual ML model/pipeline
5. Environment configuration
6. This PROJECT_CONTEXT.md
7. Assumptions
```

Never override actual implementation based only on this document.

If this document conflicts with the current code, inspect the code and report the discrepancy before making major changes.

---

# END OF PHENOTYPE PROJECT CONTEXT

````

**Ini yang saya sarankan jadi satu-satunya `.md` utama untuk Agent.** Taruh di:

```text
phenotype-r/
├── frontend/
├── backend/
├── ml/
└── PROJECT_CONTEXT.md
````
