// Simple test script to verify the check-user-updates route exists
const express = require('express');
const apiRoutes = require('./src/routes/api');

const app = express();
app.use('/api', apiRoutes);

// Get all registered routes
function getRoutes(app) {
    const routes = [];
    
    app._router.stack.forEach(function(middleware) {
        if (middleware.route) {
            // Routes registered directly on the app
            routes.push({
                method: Object.keys(middleware.route.methods)[0].toUpperCase(),
                path: middleware.route.path
            });
        } else if (middleware.name === 'router') {
            // Router middleware
            middleware.handle.stack.forEach(function(handler) {
                if (handler.route) {
                    const basePath = middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\^/g, '').replace(/\$/g, '');
                    routes.push({
                        method: Object.keys(handler.route.methods)[0].toUpperCase(),
                        path: basePath + handler.route.path
                    });
                }
            });
        }
    });
    
    return routes;
}

const routes = getRoutes(app);
console.log('📋 Registered API Routes:');
routes.forEach(route => {
    console.log(`  ${route.method} ${route.path}`);
});

const checkUpdatesRoute = routes.find(route => 
    route.path.includes('check-user-updates') && route.method === 'POST'
);

if (checkUpdatesRoute) {
    console.log('\n✅ check-user-updates route is properly registered!');
    console.log(`   Route: ${checkUpdatesRoute.method} ${checkUpdatesRoute.path}`);
} else {
    console.log('\n❌ check-user-updates route NOT found!');
    console.log('   Make sure the route is properly added to api.js');
}

console.log('\n📝 If the route exists but server returns "Route not found":');
console.log('   1. Restart the admin server');
console.log('   2. Check server logs for any startup errors');
console.log('   3. Verify the server is running on the expected port');