// scripts/fixArchivedFields.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixArchivedFields() {
    console.log('🚀 Starting archived fields fix...');
    
    try {
        const mongoUri = process.env.MONGO_URI;
        console.log('Connecting to MongoDB...');
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        
        const Booking = require('../Model/booking');
        
        console.log('\n🔍 Checking current status...');
        
        // Count documents without archived field
        const withoutArchived = await Booking.countDocuments({ 
            archived: { $exists: false } 
        });
        
        const withoutArchivedAt = await Booking.countDocuments({ 
            archivedAt: { $exists: false } 
        });
        
        console.log(`Documents without 'archived' field: ${withoutArchived}`);
        console.log(`Documents without 'archivedAt' field: ${withoutArchivedAt}`);
        
        if (withoutArchived > 0) {
            console.log('\n🔄 Adding "archived: false" to all documents...');
            
            // Add archived: false to ALL documents
            const result = await Booking.updateMany(
                { archived: { $exists: false } },
                { $set: { archived: false } },
                { multi: true }
            );
            
            console.log(`✅ Updated ${result.modifiedCount} documents with archived=false`);
            console.log(`📋 Matched ${result.matchedCount} documents`);
        }
        
        if (withoutArchivedAt > 0) {
            console.log('\n🔄 Adding "archivedAt: null" to all documents...');
            
            // Add archivedAt: null to ALL documents
            const result2 = await Booking.updateMany(
                { archivedAt: { $exists: false } },
                { $set: { archivedAt: null } },
                { multi: true }
            );
            
            console.log(`✅ Updated ${result2.modifiedCount} documents with archivedAt=null`);
        }
        
        // Verify the fix
        console.log('\n✅ Verification:');
        const withArchivedFalse = await Booking.countDocuments({ archived: false });
        const withArchivedTrue = await Booking.countDocuments({ archived: true });
        const stillMissingArchived = await Booking.countDocuments({ archived: { $exists: false } });
        
        console.log(`  - archived=false: ${withArchivedFalse}`);
        console.log(`  - archived=true: ${withArchivedTrue}`);
        console.log(`  - still missing archived field: ${stillMissingArchived}`);
        
        // Show some samples
        console.log('\n📋 Sample documents after fix:');
        const samples = await Booking.find()
            .limit(3)
            .select('fileNumber archived archivedAt createdAt')
            .sort({ createdAt: 1 })
            .lean();
            
        samples.forEach((doc, i) => {
            console.log(`${i+1}. ${doc.fileNumber}`);
            console.log(`   archived: ${doc.archived}`);
            console.log(`   archivedAt: ${doc.archivedAt}`);
            console.log(`   createdAt: ${doc.createdAt}`);
            console.log('');
        });
        
        await mongoose.disconnect();
        console.log('🎉 Migration completed successfully!');
        console.log('\n🚀 Next: Now run the archive process again.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the migration
fixArchivedFields();