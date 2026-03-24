const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const { allure } = require('allure-playwright');

const PRODUCER_URL = 'http://producer-svc/orders';
const CONSUMER_URL = 'http://consumer-svc/processed-orders';
const MONGO_URI = 'mongodb://mongodb-svc:27017/mydb';

test.describe.serial('Event-Driven Architecture (RabbitMQ + MongoDB)', () => {
    let orderId = '';
    const carModel = 'Mercedes-Benz Vision EQXX';

    test('1. Producer API: Drop Order into RabbitMQ', async ({ request }) => {
        const reqPayload = { carModel: carModel };
        
        // 📊 1. Attach the Request Payload to Allure
        await allure.attachment("Request Payload", JSON.stringify(reqPayload, null, 2), "application/json");

        const response = await request.post(PRODUCER_URL, { data: reqPayload });
        const body = await response.json();

        // 📊 2. Attach the Response Status and Body to Allure
        await allure.attachment("Response Status", `${response.status()}`, "text/plain");
        await allure.attachment("Response Body", JSON.stringify(body, null, 2), "application/json");

        expect(response.ok()).toBeTruthy();
        orderId = body.order.orderId;
        expect(orderId).toBeDefined();
        expect(body.message).toBe("Order placed in queue successfully!");
    });

    test('2. Consumer API: Wait for RabbitMQ to process message', async ({ request }) => {
        await expect.poll(async () => {
            const response = await request.get(CONSUMER_URL);
            const orders = await response.json();
            
            // 📊 3. Attach the Polling State to Allure so you can see the queue!
            await allure.attachment("Consumer DB State", JSON.stringify(orders, null, 2), "application/json");

            const myOrder = orders.find(o => o.orderId === orderId);
            return myOrder ? myOrder.status : 'NOT_FOUND';
        }, { timeout: 5000 }).toBe('PROCESSED');
    });

    test('3. Database: Directly verify MongoDB entry', async () => {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const savedOrder = await client.db('mydb').collection('orders').findOne({ orderId: orderId });
        await client.close();

        // 📊 4. Attach the raw MongoDB Document to Allure!
        await allure.attachment("Raw MongoDB Document", JSON.stringify(savedOrder, null, 2), "application/json");

        expect(savedOrder).toBeTruthy();
        expect(savedOrder.carModel).toBe(carModel);
        expect(savedOrder.status).toBe('PROCESSED');
    });
});
