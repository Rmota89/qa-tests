const { test, expect } = require('../base-test');
const { allure } = require('allure-playwright');

test('AWS Secrets Manager Verification', async ({ request }) => {
    const token = process.env.X_API_TOKEN;
    
    expect(token).toBeDefined();
    expect(token).toBe('super-secret-mb-token-123');

    // Attach it to Allure just to prove it worked! 
    await allure.attachment("AWS Secret Retrieved", `Token successfully injected: ${token}`, "text/plain");
});
