# React Scraper MVP

A high-performance web scraper built with [Playwright](https://playwright.dev/), designed specifically for React-based single-page applications (SPAs). It utilizes a persistent browser instance, resource blocking, and network interception to efficiently extract data.
# Facebook Scraper API

Production-ready microservices architecture for scraping Facebook pages with Google Sheets integration.

## Architecture

**Microservices Pattern** with BullMQ queue-based job processing:

```
API → scrape-queue → Worker → results-queue → Syncer → Google Sheets
```

**Services:**
- **API Server** - REST endpoints, job triggers, Bull Board monitoring
- **Worker** - Consumes scrape jobs, extracts emails (3 parallel)
- **Syncer** - Buffers results, batch writes to Sheets (50 items/30s)

## Project Structure

```
src/
├── api/          # Express.js API server
├── services/
│   ├── worker/   # Scraping service
│   └── syncer/   # Batch writer
├── queues/       # BullMQ queue configs
├── config/       # Redis connection
└── tests/        # Test scripts
```

- **Persistent Browser**: Reuses a single browser instance to minimize overhead.
- **Resource Blocking**: Blocks images, media, and fonts to speed up page loads.
- **Network Interception**: Listens for `application/json` responses to capture raw data directly from API calls (bypassing the need for complex DOM parsing).
- **Google Sheets Integration**: Fetches the list of URLs to scrape directly from a Google Sheet.
- **Authenticated Scraping**: Supports Facebook cookie injection and automatic session rotation upon login redirects.

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Configuration**
    Create a `.env` file in the root directory (see `.env.example`):

    ```env
    GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    GOOGLE_SHEET_ID=your_google_sheet_id_here
    # JSON array of arrays for cookie rotation
    FACEBOOK_COOKIES=[[{ "name": "c_user", "value": "..." }], ...]
    ```

3.  **Quick Setup Guide**
    
    For first-time setup, follow the comprehensive checklist:
    ```bash
    # See SETUP_CHECKLIST.md for step-by-step instructions
    ```

## Docker

### Quick Start with Docker

```bash
# Build the image
docker build -t facebook-scraper-api .

# Run the container
docker run -d -p 3000:3000 --env-file .env facebook-scraper-api

# Or use docker-compose
docker-compose up -d
```

### Docker Testing

See [DOCKER_TESTING.md](./DOCKER_TESTING.md) for comprehensive Docker testing guide including:
- Building and running containers
- Testing API endpoints
- Troubleshooting common issues
- Production deployment strategies



## Usage

### API Server (Recommended)

Start the API server to manage polling jobs:

```bash
# Start the server
node src/index.js

# Or with Docker
docker-compose up -d

# API will be available at http://localhost:3000
```

**API Endpoints**:
- `POST /api/start` - Start a new polling job
- `GET /api/status/:jobId` - Get job status
- `POST /api/stop/:jobId` - Stop a polling job
- `GET /api/jobs` - List all jobs
- `GET /health` - Health check

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Batch Scraping (Google Sheets)

Run the scraper to process URLs from the configured Google Sheet:

```bash
node src/index.js
```

### Manual Testing

To test the scraper against a single URL (useful for debugging cookies):

```bash
# Run with a specific URL
node src/test_manual.js "https://www.facebook.com/your-target-page"

# Or run with the default URL (hardcoded in the script)
node src/test_manual.js
```

## Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete REST API reference
- [Docker Testing Guide](./DOCKER_TESTING.md) - Docker build, test, and deployment
- [Development Challenges](./DEVELOPMENT_CHALLENGES.md) - Challenges faced and solutions
- [Setup Checklist](./SETUP_CHECKLIST.md) - First-time setup guide
- [Google Sheets Setup](./GOOGLE_SERVICE_ACCOUNT_SETUP.md) - Service account configuration
- [Google Sheet Structure](./GOOGLE_SHEET_STRUCTURE.md) - Required sheet format
- [Facebook Cookies Setup](./FACEBOOK_COOKIES_SETUP.md) - Cookie extraction guide
- [Railway Deployment](./RAILWAY_DEPLOYMENT.md) - Cloud deployment guide
- [Postman Guide](./POSTMAN_GUIDE.md) - API testing with Postman

## Deployment

### Railway
See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for deployment to Railway platform.

### Docker
See [DOCKER_TESTING.md](./DOCKER_TESTING.md) for Docker deployment options.

## API & Architecture

### ScraperEngine (`src/scraper.js`)

The core logic is encapsulated in the `ScraperEngine` class.

#### Methods

-   **`init()`**: Launches the persistent Chromium browser instance. Loads cookies from the environment.
-   **`scrapeBatch(urls)`**: Takes an array of URLs and processes them sequentially.
-   **`processUrl(url)`**:
    -   Creates a new isolated browser context (incognito-like).
    -   Injects cookies (if available).
    -   Sets up request interception.
    -   Navigates to the URL.
    -   **Rotation Logic**: If a redirect to a login page is detected, it rotates to the next available cookie session and retries.
    -   Closes the context after processing to free up memory.
-   **`close()`**: Closes the browser instance.

### Intercepted Endpoints

The scraper listens to network responses to extract data.

-   **Event**: `page.on('response')`
-   **Filter**: `content-type` includes `application/json`
-   **Logic**:
    -   The scraper automatically captures JSON responses.
    -   *Note*: In a production environment, you should add specific logic in `src/scraper.js` (inside the response listener) to filter for specific API endpoints (e.g., `/api/v1/users`, `/graphql`) and save the data.

### Data Extraction

The scraper uses a hybrid approach for robustness:
1.  **Network Interception**: Listens for JSON responses to capture API data.
2.  **Embedded JSON Parsing**: Extracts profile data (Name, Followers, Likes) directly from the page's embedded JSON blobs (Relay/GraphQL state), which is more reliable than DOM scraping for React apps.
3.  **DOM Fallback**: Uses standard selectors as a backup.

### Cookie Format

The `FACEBOOK_COOKIES` environment variable expects a JSON string representing an array of cookie sessions (Array of Arrays).

**Key Requirements:**
-   **Format**: `[[{...}, {...}], [{...}]]` (Array of sessions, where each session is an array of cookies).
-   **SameSite**: The scraper automatically normalizes `sameSite` values (e.g., converts `no_restriction` to `None`, `unspecified` to `Lax`, and capitalizes values) to match Playwright's requirements.
-   **URL Encoding**: The scraper automatically decodes URL-encoded cookie values (containing `%`).

**Example:**
```json
[
  [
    { "name": "c_user", "value": "12345", "domain": ".facebook.com", "path": "/", "sameSite": "no_restriction" },
    { "name": "xs", "value": "...", "domain": ".facebook.com", "path": "/" }
  ]
]
```
