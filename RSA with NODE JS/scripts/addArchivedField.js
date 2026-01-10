// // scripts/addArchivedField.js
// const mongoose = require('mongoose');
// require('dotenv').config();

// async function addArchivedField() {
//     try {
//         // Connect to your database
//         await mongoose.connect(process.env.MONGO_URI);
//         console.log('Connected to MongoDB');

//         const Booking = require('../Model/booking');
        
//         // Count documents without archived field
//         const countBefore = await Booking.countDocuments({ archived: { $exists: false } });
//         console.log(`Found ${countBefore} documents without archived field`);

//         if (countBefore > 0) {
//             // Add archived field to all documents that don't have it
//             const result = await Booking.updateMany(
//                 { archived: { $exists: false } },
//                 { $set: { archived: false } }
//             );
            
//             console.log(`Updated ${result.modifiedCount} documents`);
//             console.log(`Matched ${result.matchedCount} documents`);
//         } else {
//             console.log('All documents already have archived field');
//         }

//         // Verify
//         const countAfter = await Booking.countDocuments({ archived: { $exists: false } });
//         console.log(`Documents without archived field after update: ${countAfter}`);

//         console.log('Migration completed successfully');
//         process.exit(0);
//     } catch (error) {
//         console.error('Migration failed:', error);
//         process.exit(1);
//     }
// }

// // Run the migration
// addArchivedField();