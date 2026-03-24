const base = require('@playwright/test');
const { allure } = require('allure-playwright');

// We extend Playwright's native 'test' block
exports.test = base.test.extend({
    request: async ({ request }, use) => {
        
        // This function intercepts the API call, logs it, and then runs it!
        const wrapMethod = (method) => async (url, options) => {
            if (options && options.data) {
                await allure.attachment(`[${method.toUpperCase()}] Request: ${url}`, JSON.stringify(options.data, null, 2), "application/json");
            }
            
            // Actually execute the request
            const response = await request[method](url, options);
            
            await allure.attachment(`[${method.toUpperCase()}] Status`, `${response.status()} ${response.statusText()}`, "text/plain");
            
            const body = await response.text();
            if (body) {
                try {
                    await allure.attachment(`[${method.toUpperCase()}] Response`, JSON.stringify(JSON.parse(body), null, 2), "application/json");
                } catch(e) {
                    await allure.attachment(`[${method.toUpperCase()}] Response`, body, "text/plain");
                }
            }
            return response;
        };

        // Replace the default methods with our wrapped methods
        await use({
            get: wrapMethod('get'),
            post: wrapMethod('post'),
            put: wrapMethod('put'),
            delete: wrapMethod('delete'),
            patch: wrapMethod('patch'),
            fetch: request.fetch.bind(request)
        });
    }
});

// Export the native expect so tests can use it
exports.expect = base.expect;
