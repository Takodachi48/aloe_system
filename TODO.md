# Add Logging Middleware to Treatment Plans Router

## Tasks
- [x] Add logging middleware function to log request method, path, and timestamp
- [x] Apply the middleware to the router using router.use()
- [ ] Test the logging by running the server and making requests to the routes

## Information Gathered
- File: backend/routes/treatmentPlans.js
- Express router with multiple endpoints (POST /, GET /, GET /:planId, PATCH routes, etc.)
- Some routes have console.log, but no global logging middleware
- Router exported at the end

## Plan
- Add a logging middleware function after router creation
- Middleware logs: timestamp, method, path
- Use router.use(loggingMiddleware) to apply it

## Dependent Files
- None, changes only in backend/routes/treatmentPlans.js

## Followup Steps
- Run the server and test routes to verify logging output
