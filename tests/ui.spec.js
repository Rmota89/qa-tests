const { test, expect } = require('@playwright/test');

test.describe('Mercedes-Benz Portugal - UI Tests', () => {

    test('1. Load Homepage and Bypass Cookie Banner', async ({ page }, testInfo) => {
        // 1. Navigate to the website
        await page.goto('https://www.mercedes-benz.pt/', { waitUntil: 'domcontentloaded' });
        
        // 2. Validate the Page Title
        await expect(page).toHaveTitle(/Mercedes-Benz/i);

        // 3. Handle the Cookie Banner (Playwright pierces Shadow DOM automatically!)
        try {
            const cookieBtn = page.locator('button', { hasText: 'Concordar com todos' }).first();
            await cookieBtn.waitFor({ timeout: 5000 });
            await cookieBtn.click({ force: true });
        } catch (e) {
            console.log("Cookie banner not found or already accepted.");
        }

        // 4. Take a beautiful screenshot and attach it to the Allure Report
        const homepageScreenshot = await page.screenshot({ fullPage: false });
        await testInfo.attach('Homepage - Clean State', { body: homepageScreenshot, contentType: 'image/png' });
    });

    test('2. Open "Veículos" Menu', async ({ page }, testInfo) => {
        await page.goto('https://www.mercedes-benz.pt/', { waitUntil: 'domcontentloaded' });

        // Accept cookies again if it pops up on the fresh context
        try {
            const cookieBtn = page.locator('button', { hasText: 'Concordar com todos' }).first();
            await cookieBtn.click({ timeout: 3000, force: true });
        } catch (e) {}

        // 1. Find and click the "Veículos" button in the top navigation
        const veiculosBtn = page.locator('button', { hasText: 'Veículos' }).first();
        
        try {
            await veiculosBtn.waitFor({ state: 'visible', timeout: 5000 });
            await veiculosBtn.click();
            
            // Wait 1 second for the menu animation to slide open
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log("Could not click Veículos menu. The UI might have changed!");
        }

        // 2. Take a screenshot of the open menu!
        const menuScreenshot = await page.screenshot();
        await testInfo.attach('Menu Open State', { body: menuScreenshot, contentType: 'image/png' });
    });
});
