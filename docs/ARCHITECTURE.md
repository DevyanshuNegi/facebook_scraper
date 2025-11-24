# System Architecture & Code Flow

## 🏗️ Architecture Overview

This is an **API-triggered polling system** that scrapes Facebook business pages for email addresses and updates a Google Sheet with results.

### High-Level Architecture

```mermaid
graph TB
    User[👤 User/Client] -->|POST /api/start| API[🌐 Express API Server]
    API -->|Create Job| JM[📊 Job Manager]
    JM -->|Start Polling| SE[🤖 Scraper Engine]
    SE -->|Read Rows| GS[📊 Google Sheets API]
    SE -->|5 Parallel Contexts| BC[🌐 Browser Contexts]
    BC -->|Scrape| FB[📘 Facebook Pages]
    FB -->|Extract Email| BC
    BC -->|Return Data| SE
    SE -->|Update Status| GS
    User -->|GET /api/status/:jobId| API
    API -->|Query Stats| JM
```

---

## 📁 File Structure & Responsibilities

### Entry Point
- **[src/index.js](file:///home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/src/index.js)** - Application entry point
  - Loads environment variables
  - Starts Express API server
  - Sets up graceful shutdown

### API Layer
- **[src/server.js](file:///home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/src/server.js)** - Express HTTP server
  - `POST /api/start` - Start new polling job
  - `GET /api/status/:jobId` - Get job status
  - `POST /api/stop/:jobId` - Stop running job
  - `GET /api/jobs` - List all jobs
  - `GET /health` - Health check

### Orchestration Layer
- **[src/jobManager.js](file:///home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/src/jobManager.js)** - Job orchestration
  - Manages multiple concurrent polling jobs
  - Tracks job states and statistics
  - Handles job lifecycle (start, stop, cleanup)

### Data Layer
- **[src/sheets.js](file:///home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/src/sheets.js)** - Google Sheets integration
  - `getPendingRows()` - Fetch rows to process
  - `updateRowStatus()` - Update row with results
  - `markAsProcessing()` - Mark row as in-progress

### Scraping Layer
- **[src/scraper.js](file:///home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/src/scraper.js)** - Core scraping engine
  - Manages persistent browser instance
  - Handles parallel processing (5 concurrent URLs)
  - Extracts emails from Facebook pages
  - Cookie management and rotation

### Utilities
- **[src/utils.js](file:///home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/src/utils.js)** - Logging utilities

---

## 🔄 Complete Code Flow

### Step 1: User Starts a Job

```mermaid
sequenceDiagram
    participant User
    participant API as Express Server
    participant JM as Job Manager
    participant SE as Scraper Engine
    
    User->>API: POST /api/start<br/>{sheetId: "123"}
    API->>JM: jobManager.startJob(sheetId)
    JM->>SE: new ScraperEngine()
    SE->>SE: init() - Launch browser
    JM->>SE: startPolling(sheetId, 12000ms)
    SE-->>SE: Start polling loop
    JM-->>API: Return jobId
    API-->>User: {jobId: "uuid", status: "started"}
```

**Code Path:**
1. **index.js:6** → `startServer(port)`
2. **server.js:34** → `POST /api/start` handler
3. **jobManager.js:18** → `startJob(sheetId)`
4. **scraper.js:11** → `init()` - Launch browser
5. **jobManager.js:135** → `runPollingLoop()`
6. **scraper.js:50** → `startPolling()`

---

### Step 2: Polling Loop Begins

```mermaid
flowchart TD
    Start([Polling Loop Starts]) --> Fetch[Fetch Pending Rows<br/>sheets.getPendingRows]
    Fetch --> Check{Rows Found?}
    Check -->|No| Sleep[Sleep 12 seconds]
    Sleep --> Fetch
    Check -->|Yes| Batch[Take First 5 Rows<br/>Parallel Batch]
    Batch --> Parallel[Process in Parallel<br/>Promise.allSettled]
    Parallel --> P1[Process URL 1]
    Parallel --> P2[Process URL 2]
    Parallel --> P3[Process URL 3]
    Parallel --> P4[Process URL 4]
    Parallel --> P5[Process URL 5]
    P1 --> Complete[All Complete]
    P2 --> Complete
    P3 --> Complete
    P4 --> Complete
    P5 --> Complete
    Complete --> Sleep2[Sleep 12 seconds]
    Sleep2 --> Fetch
```

**Code Path:**
1. **scraper.js:50** → `while (this.isPolling)`
2. **scraper.js:65** → `getPendingRows(sheetId)`
3. **sheets.js:35** → Fetch rows from Google Sheets
4. **scraper.js:83** → `Promise.allSettled(batch.map(...))`
5. **scraper.js:84** → `processRow()` for each URL (in parallel)

---

### Step 3: Processing a Single URL

```mermaid
sequenceDiagram
    participant SE as Scraper Engine
    participant GS as Google Sheets
    participant BC as Browser Context
    participant FB as Facebook Page
    
    SE->>GS: markAsProcessing(rowIndex)
    GS-->>GS: Set status = "Processing"
    SE->>BC: newContext() - Create isolated browser
    BC->>FB: Navigate to URL
    FB-->>BC: Load page HTML + JSON blobs
    BC->>BC: Extract email from JSON scripts
    BC-->>SE: Return email
    SE->>GS: updateRowStatus(rowIndex, email, "Done")
    GS-->>GS: Set email + status = "Done"
    SE->>BC: close() - Cleanup context
```

**Code Path:**
1. **scraper.js:106** → `processRow(sheetId, row, rowIndex, url)`
2. **sheets.js:91** → `markAsProcessing()` - Set status to "Processing"
3. **scraper.js:115** → `processUrl(url)` - Main scraping logic
4. **scraper.js:168** → `browser.newContext()` - Create isolated context
5. **scraper.js:209** → `page.goto(url)` - Navigate to Facebook
6. **scraper.js:225** → `page.evaluate()` - Extract email from page
7. **scraper.js:327** → Return extracted email
8. **scraper.js:122** → `updateRowStatus()` - Save results
9. **scraper.js:350** → `context.close()` - Cleanup

---

## ⚡ Parallel Processing Deep Dive

### How 5 URLs Process Concurrently

```mermaid
gantt
    title Parallel Processing Timeline (5 URLs)
    dateFormat mm:ss
    axisFormat %M:%S
    
    section Polling Cycle
    Fetch pending rows         :00:00, 01s
    
    section URL 1
    Mark Processing           :00:01, 01s
    Create Context            :00:02, 01s
    Navigate + Scrape         :00:03, 08s
    Update Sheet              :00:11, 01s
    
    section URL 2
    Mark Processing           :00:01, 01s
    Create Context            :00:02, 01s
    Navigate + Scrape         :00:03, 07s
    Update Sheet              :00:10, 01s
    
    section URL 3
    Mark Processing           :00:01, 01s
    Create Context            :00:02, 01s
    Navigate + Scrape         :00:03, 09s
    Update Sheet              :00:12, 01s
    
    section URL 4
    Mark Processing           :00:01, 01s
    Create Context            :00:02, 01s
    Navigate + Scrape         :00:03, 06s
    Update Sheet              :00:09, 01s
    
    section URL 5
    Mark Processing           :00:01, 01s
    Create Context            :00:02, 01s
    Navigate + Scrape         :00:03, 10s
    Update Sheet              :00:13, 01s
    
    section Wait
    Sleep 12 seconds          :00:13, 12s
```

### Key Points:
- ✅ **Single Browser** - One persistent browser instance (launched once)
- ✅ **Multiple Contexts** - 5 isolated browser contexts (like incognito tabs)
- ✅ **Promise.allSettled** - All URLs process simultaneously, failures don't block others
- ✅ **Independent Timelines** - Each URL takes different time (6-10 seconds)
- ✅ **Total Time** - ~13 seconds for 5 URLs (vs ~45 seconds sequential)

### Code Implementation

**scraper.js:83-85:**
```javascript
await Promise.allSettled(
    batch.map(({ row, index, url }) => this.processRow(sheetId, row, index, url))
);
```

**What this does:**
1. Takes first 5 pending rows
2. Creates 5 promises (one per row)
3. Executes all 5 simultaneously
4. Waits for ALL to complete (even if some fail)
5. Each promise:
   - Creates its own browser context
   - Scrapes independently
   - Updates Google Sheet
   - Closes its context

---

## 📊 Data Flow Through the System

### Google Sheet Structure

```
Row 1 (Headers):
┌─────────────────────────┬──────────────────┬──────────┐
│ url                     │ email            │ status   │
├─────────────────────────┼──────────────────┼──────────┤
│ facebook.com/business1  │                  │          │ ← Pending
│ facebook.com/business2  │                  │ Processing│ ← In Progress
│ facebook.com/business3  │ contact@biz.com  │ Done     │ ← Completed
│ facebook.com/business4  │ Not found        │ Done     │ ← No Email
│ facebook.com/business5  │                  │ Failed   │ ← Error
└─────────────────────────┴──────────────────┴──────────┘
```

### Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Empty: Row Created
    Empty --> Processing: Job picks up row
    Processing --> Done: Email found/not found
    Processing --> Failed: Error occurred
    Done --> [*]
    Failed --> [*]
```

### Data Flow in Code

```mermaid
flowchart LR
    GS[Google Sheet<br/>url=X, status=empty] -->|Read| SE[Scraper Engine]
    SE -->|Update| GS1[status = Processing]
    SE -->|Scrape| FB[Facebook Page]
    FB -->|Email Data| SE
    SE -->|Update| GS2[email = Y, status = Done]
    
    style GS fill:#e1f5ff
    style GS1 fill:#fff4e1
    style GS2 fill:#e8f5e9
```

---

## 🔧 Component Interactions

### Job Manager ↔ Scraper Engine

```mermaid
sequenceDiagram
    participant JM as Job Manager
    participant SE as Scraper Engine
    
    JM->>SE: new ScraperEngine()
    JM->>SE: init() - Launch browser
    JM->>SE: startPolling(sheetId, interval, statsCallback)
    
    loop Every polling cycle
        SE->>SE: Process batch of 5 URLs
        SE->>JM: statsCallback({processed, pending, failed})
        JM->>JM: Update job.stats
    end
    
    JM->>SE: stopPolling()
    SE->>SE: this.isPolling = false
    JM->>SE: close() - Cleanup browser
```

**Code Locations:**
- **jobManager.js:26** → Create ScraperEngine
- **jobManager.js:29** → `scraper.init()`
- **jobManager.js:135** → `scraper.startPolling()`
- **scraper.js:73** → `statsCallback(this.stats)` updates Job Manager
- **jobManager.js:66** → `scraper.stopPolling()`

---

### Scraper Engine ↔ Google Sheets

```mermaid
sequenceDiagram
    participant SE as Scraper Engine
    participant S as sheets.js
    participant GA as Google API
    
    SE->>S: getPendingRows(sheetId)
    S->>GA: sheet.getRows()
    GA-->>S: All rows
    S->>S: Filter: url exists && !status
    S-->>SE: [{row, index, url}, ...]
    
    SE->>S: markAsProcessing(sheetId, rowIndex)
    S->>GA: row.set('status', 'Processing')
    S->>GA: row.save()
    
    SE->>S: updateRowStatus(sheetId, rowIndex, email, 'Done')
    S->>GA: row.set('email', email)
    S->>GA: row.set('status', 'Done')
    S->>GA: row.save()
```

**Code Locations:**
- **scraper.js:65** → Call `getPendingRows()`
- **sheets.js:35-53** → Fetch and filter rows
- **scraper.js:112** → Call `markAsProcessing()`
- **sheets.js:91-93** → Update to "Processing"
- **scraper.js:122** → Call `updateRowStatus()`
- **sheets.js:66-82** → Update email and status

---

## 🚀 Performance Characteristics

### Throughput

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Polling Interval** | 12 seconds | Configurable via `POLLING_INTERVAL_MS` |
| **Batch Size** | 5 URLs | Configurable via `PARALLEL_BATCH_SIZE` |
| **Scrape Time** | ~6-10 seconds/URL | Depends on page complexity |
| **Cycle Time** | ~13 seconds | Max(scrape_times) + overhead |
| **Throughput** | ~23 URLs/min | (60s / 13s) × 5 URLs |
| **Hourly Rate** | ~1,380 URLs/hour | 23 × 60 minutes |

### Resource Usage

```mermaid
graph LR
    B[1 Browser Instance<br/>~300MB RAM] --> C1[Context 1<br/>~50MB]
    B --> C2[Context 2<br/>~50MB]
    B --> C3[Context 3<br/>~50MB]
    B --> C4[Context 4<br/>~50MB]
    B --> C5[Context 5<br/>~50MB]
    
    style B fill:#e1f5ff
    style C1 fill:#fff4e1
    style C2 fill:#fff4e1
    style C3 fill:#fff4e1
    style C4 fill:#fff4e1
    style C5 fill:#fff4e1
```

**Total RAM**: ~550MB (1 browser + 5 contexts)

---

## 🔐 Environment Configuration

```bash
# Server
PORT=3000                    # Express server port

# Polling
POLLING_INTERVAL_MS=12000    # 12s between polls
PARALLEL_BATCH_SIZE=5        # 5 URLs at once

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL # Service account email
GOOGLE_PRIVATE_KEY          # Private key for auth

# Facebook Cookies (Optional)
FACEBOOK_COOKIES=[]         # Empty = no auth (public pages)
# FACEBOOK_COOKIES=[...]    # Uncomment for authenticated scraping
```

---

## 🎯 Key Design Decisions

### 1. Why Persistent Browser?
- ✅ **Performance**: Launch once, reuse (~5s saved per batch)
- ✅ **Resource Efficient**: Shared browser process
- ✅ **Cookie Management**: Centralized session handling

### 2. Why Isolated Contexts?
- ✅ **Privacy**: Each URL gets clean state (like incognito)
- ✅ **Parallel Safe**: No cookie/cache contamination
- ✅ **Error Isolation**: One page crash doesn't affect others

### 3. Why Promise.allSettled?
- ✅ **Resilience**: Failures don't block others
- ✅ **Transparency**: See all results (success + failures)
- ✅ **Simplicity**: Built-in error handling

### 4. Why In-Memory Job Management?
- ✅ **Simplicity**: No database needed
- ✅ **Speed**: Instant state access
- ✅ **Sufficient**: Single Railway instance handles 1000s of URLs
- ⚠️ **Limitation**: Jobs lost on restart (acceptable for this use case)

### 5. Why Status Flag Pattern?
- ✅ **Simple**: Google Sheet is both input AND state database
- ✅ **Visible**: Users can see progress in real-time
- ✅ **Resumable**: Can restart without re-processing completed rows
- ✅ **No External DB**: One less service to manage

---

## 📈 Scalability Path

### Current (Phase 1) - Single Node
- **Capacity**: ~1,380 URLs/hour
- **Architecture**: In-memory job management
- **Best for**: Up to 10k URLs/day

### Future (Phase 2) - Distributed
```mermaid
graph TB
    API[API Server] --> Redis[Redis Queue]
    Redis --> W1[Worker 1<br/>Browser Instance]
    Redis --> W2[Worker 2<br/>Browser Instance]
    Redis --> W3[Worker 3<br/>Browser Instance]
    W1 --> GS[Google Sheets]
    W2 --> GS
    W3 --> GS
```

- **Capacity**: ~8,000+ URLs/hour (3 workers)
- **Architecture**: Redis + Multiple workers
- **Best for**: 100k+ URLs/day

---

## 🐛 Error Handling Flow

```mermaid
flowchart TD
    Start[Process URL] --> Try{Try Scrape}
    Try -->|Success| Email[Email Found?]
    Email -->|Yes| Done1[Update: email, Done]
    Email -->|No| Done2[Update: Not found, Done]
    Try -->|Error| Catch[Catch Error]
    Catch --> Log[Log Error]
    Log --> Failed[Update: status = Failed]
    Done1 --> Close[Close Context]
    Done2 --> Close
    Failed --> Close
    Close --> End[Next URL]
```

**Code Path:**
- **scraper.js:108** → `try { ... }`
- **scraper.js:122** → Success path
- **scraper.js:126** → `catch (error) { ... }`
- **scraper.js:128** → Update status to "Failed"

---

## 📝 Summary

### Architecture Highlights
✅ **API-Driven** - REST API to trigger jobs  
✅ **Parallel Processing** - 5 URLs concurrently  
✅ **Persistent Browser** - Launched once, reused  
✅ **Isolated Contexts** - Privacy + error isolation  
✅ **Status Flags** - Google Sheet as state database  
✅ **Resilient** - Failures don't block other URLs  
✅ **Scalable** - Can handle 1000s of URLs  

### Code Flow Summary
1. **User** → API request
2. **API** → Job Manager (create job)
3. **Job Manager** → Scraper Engine (start polling)
4. **Scraper** → Google Sheets (get pending rows)
5. **Scraper** → Process 5 URLs in parallel
6. **Scraper** → Update Google Sheet with results
7. **Repeat** every 12 seconds

### File Hierarchy
```
src/
├── index.js          # Entry point
├── server.js         # API endpoints
├── jobManager.js     # Job orchestration
├── scraper.js        # Parallel scraping engine
├── sheets.js         # Google Sheets integration
└── utils.js          # Logging
```

That's the complete architecture! 🚀
