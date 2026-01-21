// create-migration.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Executive = require('./models/Executive');

async function migratePasswords() {
    try {
        await mongoose.connect('your-mongodb-uri', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to database');

        // Find all executives with plain text passwords
        const executives = await Executive.find();
        
        for (const executive of executives) {
            // Check if password is already hashed
            const isHashed = executive.password.startsWith('$2a$') || 
                            executive.password.startsWith('$2b$') ||
                            executive.password.startsWith('$2y$');
            
            if (!isHashed) {
                console.log(`Hashing password for: ${executive.userName}`);
                
                // Hash the plain text password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(executive.password, salt);
                
                // Update the executive
                executive.password = hashedPassword;
                await executive.save();
                
                console.log(`Updated: ${executive.userName}`);
            }
        }

        console.log('Migration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migratePasswords();