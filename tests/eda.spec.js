const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');

const PRODUCER_URL = 'http://producer-svc/orders';
const CONSUMER_URL = 'http://consumer-svc/processed-orders';
const MONGO_URI = 'mongodb://mongodb-svc:27017/mydb';

// .serial ensures tests run in exact order so we can pass the orderId between them!
test.describe.serial('Event-Driven Architecture (RabbitMQ + MongoDB)', () => {
    let orderId = '';
    const carModel = 'Mercedes-Benz Vision EQXX';

    test('1. Producer API: Drop Order into RabbitMQ', async ({ request }) => {
        const response = await request.post(PRODUCER_URL, {
            data: { carModel: carModel }
        });
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        orderId = body.order.orderId;
        
        expect(orderId).toBeDefined();
        expect(body.message).toBe("Order placed in queue successfully!");
    });

    test('2. Consumer API: Wait for RabbitMQ to process message', async ({ request }) => {
        // expect.poll will keep retrying this block until it passes (or hits the 5-second timeout)
        // This is much safer than a hardcoded "sleep"!
        await expect.poll(async () => {
            const response = await request.get(CONSUMER_URL);
            const orders = await response.json();
            const myOrder = orders.find(o => o.orderId === orderId);
            
            return myOrder ? myOrder.status : 'NOT_FOUND';
        }, { timeout: 5000 }).toBe('PROCESSED');
    });

    test('3. Database: Directly verify MongoDB entry', async () => {
        // Connect directly to the Kubernetes Database
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        
        // Search the "orders" collection for the exact ID RabbitMQ processed
        const savedOrder = await client.db('mydb').collection('orders').findOne({ orderId: orderId });
        await client.close();

        // Assertions!
        expect(savedOrder).toBeTruthy();
        expect(savedOrder.carModel).toBe(carModel);
        expect(savedOrder.status).toBe('PROCESSED');
    });
});
