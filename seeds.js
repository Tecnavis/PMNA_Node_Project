// migration.js
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { MongoClient } = require('mongodb');

// 1. Firestore Init
admin.initializeApp({
    credential: admin.credential.cert({ "type": "service_account", "project_id": "rsapmna-de966", "private_key_id": "fbb8c038eb867240432f902f60a1de4d3197cc46", "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDoOnNXqItsz8iO\nujZbPz0tHfGWx3uV5gV/zxnrEeZCMrvOtala2FJpkW+nFpIiKWJo9tF76RiCffeE\nXVaKtlClKZ9bCtSwgTiJh3GwxIyvOAnckx2xBMNfAvAqSMI+GivrKNfsaUGO8dgJ\na2c1+QwVGJPTVSAnFq47Rcrz9RZKaHWhronxxM9GT+Gim0DbteQpy3ew7W+lgzkW\nPrePdM8kMMzecTgl6J4JOua52epbVjBZJb5nX3DhTlkSXEUQ3ZhyTitQKFYYmlro\nuHVD50bLp72D3AcigdIjRKDILrWBnkVB1HWJJAaqsjdmkb6INUFH8v2r4Tr4Ijaw\n5zsgKexzAgMBAAECggEAIof2eLVeLgrjhp2X0Y+guCG4t7Pn4401iiCweOzLcVJ7\n7KvEh/acoof2s0C+8Ad5U6RH2AX8GANFF9CNOskLStPalz4QDELatlCGjkNbq/5I\nMR1LD/RmXK1iKtdw0q0vlKMZIFUyY2AAwL3QtgzXSBfEe2swAb/0nmmtWQM7kkqX\nh1AIJIic2zQzidC/XNblD5QbH3IvAzJ/4o5rjaYLSOqieUFdouwU3fyusdzadbya\n6wfpDQ7x98e+25w1byYZnR9KPomUHqquH+Dei/44G4WbgFNQ4m09U3NI4ZQx0GUd\n67B9N66l8qLUHth6gimtz9o5Ls0dax0x+PwwqtYBMQKBgQD+cA3Zxaea5P0OZUOZ\nZllQfR7Ds0YyqwQNbJpIl20t0rURSNPAm1TV36K9xDx8DKtk7IK+7EIIPWtMxmsQ\najzH3q++RCf+/AeqM5YpmjvApuECZMdl2ilS6pvwHSixyntHcTjM1rSY/7n34zKe\nGJF9fOim54IKZ7cpdruHuWloCwKBgQDpp3xlwttqIhclkalFHWc+u0a7M1dCuLrT\nyddXdJy2poVjyxrUZdVHOmSFkp2bNposw4q/rBUAb01YcZXPw+D416/H3cwZNpyZ\neGXt6MAJwzeqIGYdGWynB0FqHFmK28I7L7h0BXpXEXsNX125oAzYUnyqHuqSadZ+\nQwT2OzSGOQKBgQDkprBbxvtjAGvFVw1Tup2C7p4KAn6QJA2FPta7a5GK/3MGsGrT\nCQRJGys13Db6x6vzC3RHvStuGjvmB93JJ5+tghpvIvLKe5UryCYnBtqxu4Yzz3s9\ntbszL3CpbJrYg30b68y+kChF4nIuKXegibWdjvXIn/3F+gSo93F5fA8UlwKBgAXz\nSvq4dKgGSDqftATbk9aIJGv+CbncRH3CRSaoBJmuMfVxpbRFB6JxvT+dlT/vqwt6\ny1zIQByruPeIpP0OivsrWwGnB1yZBHHwHABsDf/xpchCXPdev2Kdj6/pGuqrYA3r\n0DG8NfpjqpOTmypwBgO4Tg5zDRw/b8P1ZvnyVgsZAoGBANglbl8OgNOAp5LIfb/Y\n/hi55Pcr7BOh6X0L/ZLWED8jGNxEoFEvtUSeZlwT1IxPTlGNAoDgPO0/FZBFzKhv\nFFU/7H+5QTc52Is+1tZE3BAiG777mduApYzXQdihKz6yPc6GJkHM/PT7yAyWIhSG\nV8R1Ny65qd3ajI83Yg3ow5i2\n-----END PRIVATE KEY-----\n", "client_email": "firebase-adminsdk-5871a@rsapmna-de966.iam.gserviceaccount.com", "client_id": "112626555896244448551", "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs", "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-5871a%40rsapmna-de966.iam.gserviceaccount.com", "universe_domain": "googleapis.com" })
});

const firestore = admin.firestore();

// 2. MongoDB Init
// const mongoUri = 'mongodb+srv://<user>:<password>@cluster.mongodb.net/mydb';
// const mongoClient = new MongoClient(mongoUri);
// const mongoDbName = 'mydb'; // your target DB
// const mongoCollection = 'users'; // your target collection

// 3. Field map: Firestore ➜ Mongo
// const fieldMap = {
//     name: 'fullName',
//     age: 'userAge',
//     email: 'emailAddress',
// };

// function transformDoc(doc) {
//     const transformed = {};
//     for (const [fsField, mongoField] of Object.entries(fieldMap)) {
//         if (doc[fsField] !== undefined) {
//             transformed[mongoField] = doc[fsField];
//         }
//     }
//     return transformed;
// }

async function migrateCollection(collectionName) {
    const snapshot = await firestore.collection(collectionName).get();
    const documents = snapshot.docs.map(doc => transformDoc(doc.data()));
    console.log(snapshot)
    // await mongoClient.connect();
    // const db = mongoClient.db(mongoDbName);
    // const collection = db.collection(mongoCollection);
    // const result = await collection.insertMany(documents);
    // console.log(`✅ Migrated ${result.insertedCount} documents`);
    // await mongoClient.close();
}

migrateCollection('showroom') // Firestore collection name
    .then(() => console.log('🎉 Migration completed'))
    .catch(console.error);
