/**
 * Ingestor Service Entry Point
 */

const { startIngestor } = require('./ingestor');

// Get sheet ID from env or command line
const sheetId = process.argv[2] || process.env.GOOGLE_SHEET_ID;

if (!sheetId) {
    console.log('ℹ️  Ingestor disabled: No GOOGLE_SHEET_ID configured');
    console.log('   To enable auto-polling:');
    console.log('   1. Set GOOGLE_SHEET_ID in .env');
    console.log('   2. Or run: npm run ingestor <SHEET_ID>');
    console.log('   For manual control, use: npm run dev:manual');

    // Exit gracefully without error
    process.exit(0);
}

// Start the ingestor
startIngestor(sheetId).catch((error) => {
    console.error('❌ Failed to start ingestor:', error);
    process.exit(1);
});
