// backend/scripts/update_notification_schema.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/Database.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read SQL script file
const sqlFilePath = path.join(__dirname, 'update_notification_schema.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

// Split SQL statements and execute them
const statements = sql.split(';').filter(statement => statement.trim() !== '');

async function runMigration() {
    console.log('⏳ Running notification schema migration...');
    
    try {
        // Start a transaction
        const transaction = await db.transaction();
        
        try {
            // Execute each SQL statement
            for (const statement of statements) {
                if (statement.trim()) {
                    await db.query(statement, { transaction });
                    console.log('✅ Executed SQL statement successfully');
                }
            }
            
            // Commit the transaction
            await transaction.commit();
            console.log('🎉 Migration completed successfully!');
        } catch (error) {
            // Rollback the transaction if any statement fails
            await transaction.rollback();
            console.error('❌ Migration failed:', error.message);
        }
    } catch (error) {
        console.error('❌ Failed to start transaction:', error.message);
    } finally {
        // Close the database connection
        await db.close();
    }
}

// Run the migration
runMigration();
