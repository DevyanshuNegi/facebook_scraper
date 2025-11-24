/**
 * Queue configuration and exports
 * Central place to import all queues
 */

const scrapeQueue = require('./scrapeQueue');
const resultsQueue = require('./resultsQueue');

module.exports = {
    scrapeQueue,
    resultsQueue,
};
