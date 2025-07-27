# Ableton Rack Analyzer API Documentation

## API Version
**Current Version:** v1.0.0

### Version History
- **v1.0.0** (2025-07-27)
  - Initial release
  - Rack analysis with file upload
  - MongoDB integration for persistence
  - User information fields (description, producer_name)
  - Search functionality
  - Recent racks retrieval

### Versioning Strategy
This API currently uses URL path versioning. Future versions will follow the pattern:
- Current (v1): `/api/endpoint`
- Future: `/api/v2/endpoint`

The API follows semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

## Base URL
- Local: `http://localhost:5001`
- Production: `https://your-app.railway.app`

## Authentication
Currently, the API does not require authentication. All endpoints are publicly accessible.

## Content Types
- Request: `multipart/form-data` (for file uploads), `application/json` (for other requests)
- Response: `application/json`

## Response Headers
All API responses include:
- `X-API-Version`: Current API version (e.g., "1.0.0")
- `Content-Type`: "application/json" (except file downloads)

---

## Endpoints

### 1. Health Check
Check if the API is running and healthy.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "message": "Ableton Rack Analyzer API is running"
}
```

**Status Codes:**
- `200 OK` - Service is healthy

---

### 2. Analyze Rack
Upload and analyze an Ableton rack file (.adg or .adv).

**Endpoint:** `POST /api/analyze`

**Request:**
- Content-Type: `multipart/form-data`
- Form Fields:
  - `file` (required): The rack file (.adg or .adv)
  - `description` (optional): Description of what the rack does
  - `producer_name` (optional): Name of the rack creator

**Example Request (cURL):**
```bash
curl -X POST http://localhost:5001/api/analyze \
  -F "file=@MyRack.adg" \
  -F "description=This rack creates amazing glitch effects" \
  -F "producer_name=DJ Example"
```

**Success Response:**
```json
{
  "success": true,
  "analysis": {
    "rack_name": "Slipster",
    "chains": [
      {
        "name": "Clean",
        "is_soloed": false,
        "devices": []
      },
      {
        "name": "Fine Res",
        "is_soloed": false,
        "devices": [
          {
            "name": "Beat Repeat",
            "type": "BeatRepeat",
            "is_on": true,
            "preset_name": "Fine Repeater"
          }
        ]
      }
    ],
    "macro_controls": [
      {
        "index": 0,
        "name": "Clean Amount",
        "value": 0.0
      },
      {
        "index": 1,
        "name": "Fine Chop",
        "value": 0.0
      }
    ],
    "user_info": {
      "description": "This rack creates amazing glitch effects",
      "producer_name": "DJ Example"
    }
  },
  "filename": "MyRack.adg",
  "stats": {
    "total_chains": 3,
    "total_devices": 2,
    "macro_controls": 8
  },
  "rack_id": "507f1f77bcf86cd799439011",
  "download_ids": {
    "xml": "MyRack.xml",
    "json": "MyRack_analysis.json"
  }
}
```

**Error Responses:**
- `400 Bad Request` - No file provided, invalid file type, or file not selected
- `500 Internal Server Error` - Failed to analyze the rack

**Status Codes:**
- `200 OK` - Rack successfully analyzed
- `400 Bad Request` - Invalid request
- `500 Internal Server Error` - Server error during analysis

---

### 3. Get Recent Racks
Retrieve recently analyzed racks from the database.

**Endpoint:** `GET /api/racks`

**Query Parameters:**
- `limit` (optional, default: 10): Number of racks to return

**Example Request:**
```
GET /api/racks?limit=5
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "racks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "filename": "MyRack.adg",
      "rack_name": "Slipster",
      "created_at": "2025-07-27T21:42:26.000Z",
      "description": "This rack creates amazing glitch effects",
      "producer_name": "DJ Example",
      "stats": {
        "total_chains": 3,
        "total_devices": 2,
        "macro_controls": 8
      },
      "analysis": { ... }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Successfully retrieved racks
- `500 Internal Server Error` - Database error

---

### 4. Get Rack by ID
Retrieve a specific rack analysis by its MongoDB ID.

**Endpoint:** `GET /api/racks/{rack_id}`

**Path Parameters:**
- `rack_id`: MongoDB ObjectId of the rack

**Example Request:**
```
GET /api/racks/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "rack": {
    "_id": "507f1f77bcf86cd799439011",
    "filename": "MyRack.adg",
    "rack_name": "Slipster",
    "created_at": "2025-07-27T21:42:26.000Z",
    "description": "This rack creates amazing glitch effects",
    "producer_name": "DJ Example",
    "stats": {
      "total_chains": 3,
      "total_devices": 2,
      "macro_controls": 8
    },
    "analysis": {
      "rack_name": "Slipster",
      "chains": [ ... ],
      "macro_controls": [ ... ]
    },
    "file_content": "H4sIAAAAAAAAA+1dbXPauBb..."
  }
}
```

**Status Codes:**
- `200 OK` - Rack found and returned
- `404 Not Found` - Rack not found
- `500 Internal Server Error` - Database error

---

### 5. Search Racks
Search for racks by name, filename, producer name, or description.

**Endpoint:** `GET /api/racks/search`

**Query Parameters:**
- `q` (required): Search query string

**Example Request:**
```
GET /api/racks/search?q=glitch
```

**Response:**
```json
{
  "success": true,
  "query": "glitch",
  "count": 2,
  "racks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "filename": "GlitchMaster.adg",
      "rack_name": "Glitch Master",
      "description": "Ultimate glitch effects processor",
      "producer_name": "Beat Wizard",
      "created_at": "2025-07-27T21:42:26.000Z",
      "stats": { ... }
    }
  ]
}
```

**Search Fields:**
- `rack_name` - Name of the rack
- `filename` - Original filename
- `producer_name` - Creator's name
- `description` - Rack description

**Status Codes:**
- `200 OK` - Search completed
- `400 Bad Request` - Missing search query
- `500 Internal Server Error` - Database error

---

### 6. Download Generated Files
Download the XML or JSON files generated during analysis.

**Endpoint:** `GET /api/download/{file_type}/{filename}`

**Path Parameters:**
- `file_type`: Either `xml` or `json`
- `filename`: The filename provided in the analysis response

**Example Requests:**
```
GET /api/download/xml/MyRack.xml
GET /api/download/json/MyRack_analysis.json
```

**Response:**
- File download with appropriate content type
- Content-Disposition: attachment

**Status Codes:**
- `200 OK` - File found and returned
- `404 Not Found` - File not found
- `500 Internal Server Error` - Server error

---

### 7. Cleanup Temporary Files
Clean up all temporary files on the server. This is mainly for maintenance.

**Endpoint:** `POST /api/cleanup`

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed"
}
```

**Status Codes:**
- `200 OK` - Cleanup successful
- `500 Internal Server Error` - Cleanup failed

---

## Data Models

### Rack Analysis Object
```typescript
interface RackAnalysis {
  rack_name: string;
  chains: Chain[];
  macro_controls: MacroControl[];
  user_info?: {
    description?: string;
    producer_name?: string;
  };
}

interface Chain {
  name: string;
  is_soloed: boolean;
  devices: Device[];
}

interface Device {
  name: string;
  type: string;
  is_on: boolean;
  preset_name?: string;
  chains?: Chain[];  // For nested racks
}

interface MacroControl {
  index: number;
  name: string;
  value: number;
}
```

### Database Document Schema
```typescript
interface RackDocument {
  _id: string;
  filename: string;
  rack_name: string;
  description?: string;
  producer_name?: string;
  created_at: Date;
  analysis: RackAnalysis;
  stats: {
    total_chains: number;
    total_devices: number;
    macro_controls: number;
  };
  user_info?: {
    description?: string;
    producer_name?: string;
  };
  file_content?: string;  // Base64 encoded original file
}
```

---

## Error Handling

All error responses follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

Common error scenarios:
- File too large (max 16MB)
- Invalid file type (only .adg and .adv accepted)
- MongoDB connection issues
- Invalid ObjectId format
- Missing required parameters

---

## Rate Limiting
Currently, there is no rate limiting implemented. Consider adding rate limiting for production use.

---

## CORS
CORS is enabled for all origins. In production, you should restrict this to your specific domains.

---

## Examples

### JavaScript/Fetch Example
```javascript
// Analyze a rack with user info
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Amazing bass sound design rack');
formData.append('producer_name', 'Bass Master');

fetch('http://localhost:5001/api/analyze', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Rack analyzed:', data);
  // Save the rack_id for later retrieval
  const rackId = data.rack_id;
});

// Search for racks
fetch('http://localhost:5001/api/racks/search?q=bass')
  .then(response => response.json())
  .then(data => {
    console.log(`Found ${data.count} racks`);
    data.racks.forEach(rack => {
      console.log(`- ${rack.rack_name} by ${rack.producer_name}`);
    });
  });

// Get a specific rack
fetch(`http://localhost:5001/api/racks/${rackId}`)
  .then(response => response.json())
  .then(data => {
    console.log('Rack details:', data.rack);
  });
```

### Python Example
```python
import requests

# Analyze a rack
with open('MyRack.adg', 'rb') as f:
    files = {'file': f}
    data = {
        'description': 'Complex modulation rack',
        'producer_name': 'Modular Mike'
    }
    response = requests.post('http://localhost:5001/api/analyze', 
                           files=files, data=data)
    result = response.json()
    print(f"Analyzed: {result['rack_name']}")
    rack_id = result['rack_id']

# Get recent racks
response = requests.get('http://localhost:5001/api/racks?limit=20')
racks = response.json()['racks']
for rack in racks:
    print(f"{rack['rack_name']} - {rack['created_at']}")
```

---

## Future Enhancements
- WebSocket support for real-time analysis progress
- Batch upload support
- User authentication and personal rack libraries
- Rack comparison endpoints
- Statistics and analytics endpoints
- Webhook notifications for new racks
