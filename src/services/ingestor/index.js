/**
 * Ingestor Service Entry Point
 */

const { startIngestor } = require('./ingestor');

// Get sheet ID from env or command line
const sheetId = process.argv[2] || process.env.GOOGLE_SHEET_ID;

if (!sheetId) {
    console.error('❌ Error: Sheet ID is required!');
    console.error('Usage: node src/services/ingestor/index.js <SHEET_ID>');
    console.error('   or: Set GOOGLE_SHEET_ID in .env');
    process.exit(1);
}

// Start the ingestor
startIngestor(sheetId).catch((error) => {
    console.error('❌ Failed to start ingestor:', error);
    process.exit(1);
});
