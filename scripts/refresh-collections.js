const mongoose = require('mongoose');
require('dotenv').config();

async function refreshCollections() {
    try {
        console.log('🔄 Refreshing MongoDB Collections...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas\n');
        
        // Force create collections by inserting and removing a test document
        const collections = ['users', 'billitems', 'stocktransactions', 'stocks', 'customers', 'products', 'bills'];
        
        for (const collectionName of collections) {
            try {
                // Insert a test document
                await mongoose.connection.db.collection(collectionName).insertOne({
                    _test_refresh: true,
                    timestamp: new Date()
                });
                
                // Remove the test document
                await mongoose.connection.db.collection(collectionName).deleteOne({
                    _test_refresh: true
                });
                
                console.log(`✅ Refreshed collection: ${collectionName}`);
            } catch (error) {
                console.log(`⚠️  Collection ${collectionName} already exists`);
            }
        }
        
        console.log('\n📊 Final Collection Status:');
        const finalCollections = await mongoose.connection.db.listCollections().toArray();
        finalCollections.forEach(col => {
            console.log(`- ${col.name}`);
        });
        
        console.log('\n🎉 Collections refreshed!');
        console.log('💡 Now check your MongoDB Atlas dashboard:');
        console.log('   1. Go to your cluster');
        console.log('   2. Click "Browse Collections"');
        console.log('   3. Select "smart-billing" database');
        console.log('   4. You should see all 7 collections');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

refreshCollections(); 