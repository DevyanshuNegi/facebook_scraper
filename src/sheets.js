const { GoogleSpreadsheet } = require('google-spreadsheet');
const { log, logError } = require('./utils');

/**
 * Load and authenticate with Google Sheet
 * @param {string} sheetId - Google Sheet ID
 * @returns {GoogleSpreadsheet} Authenticated sheet object
 */
async function loadSheet(sheetId) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
        throw new Error('Missing Google Sheets credentials in .env');
    }

    // Replace literal \n with actual newlines for v3 API
    key = key.replace(/\\n/g, '\n');

    const doc = new GoogleSpreadsheet(sheetId);

    try {
        await doc.useServiceAccountAuth({
            client_email: email,
            private_key: key,
        });

        await doc.loadInfo();
    } catch (error) {
        logError('Failed to authenticate with Google Sheets', error);
        throw new Error(`Google Sheets auth failed: ${error.message}`);
    }

    return doc.sheetsByIndex[0]; // Return first sheet
}

/**
 * Get pending rows from Google Sheet (rows where url exists but status is empty)
 * @param {string} sheetId - Google Sheet ID
 * @returns {Array} Array of { row, index, url }
 */
async function getPendingRows(sheetId) {
    try {
        const sheet = await loadSheet(sheetId);
        const rows = await sheet.getRows();

        const pending = rows
            .map((row, index) => ({
                row,
                index: index + 2, // +2 to account for header row (1-indexed)
                url: row.url
            }))
            .filter(({ row, url }) => url && !row.status);

        log(`Found ${pending.length} pending rows in sheet ${sheetId}`);
        return pending;
    } catch (error) {
        logError('Failed to get pending rows', error);
        throw error;
    }
}

/**
 * Update row status and email
 * @param {string} sheetId - Google Sheet ID
 * @param {number} rowIndex - Row index (1-indexed, including header)
 * @param {string|null} email - Email to set (or null to skip)
 * @param {string} status - Status to set (Processing/Done/Failed)
 */
async function updateRowStatus(sheetId, rowIndex, email, status) {
    try {
        const sheet = await loadSheet(sheetId);
        const rows = await sheet.getRows();
        const row = rows[rowIndex - 2]; // Adjust for header row

        if (!row) {
            throw new Error(`Row ${rowIndex} not found`);
        }

        if (email !== null && email !== undefined) {
            row.email = email;
        }
        row.status = status;
        await row.save();

        log(`Updated row ${rowIndex}: status=${status}, email=${email || 'N/A'}`);
    } catch (error) {
        logError(`Failed to update row ${rowIndex}`, error);
        throw error;
    }
}

/**
 * Mark row as processing
 * @param {string} sheetId - Google Sheet ID
 * @param {number} rowIndex - Row index (1-indexed, including header)
 */
async function markAsProcessing(sheetId, rowIndex) {
    await updateRowStatus(sheetId, rowIndex, null, 'Processing');
}

module.exports = {
    getPendingRows,
    updateRowStatus,
    markAsProcessing
};
