const { test, expect } = require('@playwright/test');
const { MongoClient, ObjectId } = require('mongodb');

const API_URL = 'http://my-microservice-svc/items';
const MONGO_URI = 'mongodb://mongodb-svc:27017/mydb';

test('Test 1: Check 200 OK', async ({ request }) => {
    const response = await request.get(API_URL);
    // INTENTIONAL FAILURE: We expect it to be false, but it will be true!
    expect(response.ok()).toBeFalsy(); 
});

test('Test 2: POST and verify in MongoDB', async ({ request }) => {
    const itemName = `Item_${Date.now()}`;
    await request.post(API_URL, { data: { name: itemName } });

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const itemInDb = await client.db('mydb').collection('items').findOne({ name: itemName });
    await client.close();

    expect(itemInDb).toBeTruthy();
    expect(itemInDb.name).toBe(itemName);
});

test('Test 3: Update entry and verify in MongoDB', async ({ request }) => {
    const createRes = await request.post(API_URL, { data: { name: 'OldName' } });
    const createdItem = await createRes.json();
    const id = createdItem._id;

    await request.put(`${API_URL}/${id}`, { data: { name: 'NewName' } });

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const updatedDbItem = await client.db('mydb').collection('items').findOne({ _id: new ObjectId(id) });
    await client.close();

    expect(updatedDbItem).toBeTruthy();
    expect(updatedDbItem.name).toBe('NewName');
});
