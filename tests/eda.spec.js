// 1. IMPORT FROM OUR CUSTOM WRAPPER INSTEAD OF PLAYWRIGHT!
const { test, expect } = require('../base-test');
const { MongoClient } = require('mongodb');
const { allure } = require('allure-playwright');

const PRODUCER_URL = 'http://producer-svc/orders';
const CONSUMER_URL = 'http://consumer-svc/processed-orders';
const MONGO_URI = 'mongodb://mongodb-svc:27017/mydb';

test.describe.serial('Event-Driven Architecture (RabbitMQ + MongoDB)', () => {
    let orderId = '';
    const carModel = 'Mercedes-Benz Vision EQXX';

    test('1. Producer API: Drop Order into RabbitMQ', async ({ request }) => {
        // Look how clean this is! The wrapper handles ALL the Allure attachments automatically!
        const response = await request.post(PRODUCER_URL, { data: { carModel: carModel } });
        const body = await response.json();

        expect(response.ok()).toBeTruthy();
        orderId = body.order.orderId;
        expect(orderId).toBeDefined();
    });

    test('2. Consumer API: Wait for RabbitMQ to process message', async ({ request }) => {
        await expect.poll(async () => {
            const response = await request.get(CONSUMER_URL);
            const orders = await response.json();
            
            const myOrder = orders.find(o => o.orderId === orderId);
            return myOrder ? myOrder.status : 'NOT_FOUND';
        }, { timeout: 5000 }).toBe('PROCESSED');
    });

    test('3. Database: Directly verify MongoDB entry', async () => {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const savedOrder = await client.db('mydb').collection('orders').findOne({ orderId: orderId });
        await client.close();

        // We can still manually attach the Database response since it doesn't use the API request object!
        await allure.attachment("Raw MongoDB Document", JSON.stringify(savedOrder, null, 2), "application/json");

        expect(savedOrder).toBeTruthy();
        expect(savedOrder.status).toBe('PROCESSED');
    });
});
