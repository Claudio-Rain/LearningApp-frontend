# Complete API Endpoint Flow with Authorization and Service Layers

```mermaid
sequenceDiagram
    participant Client as Client/Frontend
    participant Network as Network Layer
    participant Router as API Router
    participant AuthMiddleware as Auth Middleware
    participant Validator as Request Validator
    participant Controller as Controller
    participant ServiceLayer as Service Layer
    participant Repository as Data Repository
    participant Database as Database
    participant ResponseFormatter as Response Formatter

    Client->>Client: 1. Prepare Request Data
    Note over Client: Headers: Content-Type, Authorization<br/>Body: JSON payload<br/>Query Params: filters, pagination<br/>URL Params: resource IDs
    
    Client->>Network: 2. Send HTTP Request<br/>POST /api/v1/users/profile
    activate Network
    
    Network->>Router: 3. Route Request
    activate Router
    deactivate Network
    
    rect rgb(255, 200, 200)
        Note over Router,AuthMiddleware: AUTHORIZATION LAYER
        
        Router->>AuthMiddleware: Extract Authorization Header
        Note over AuthMiddleware: Header format:<br/>Authorization: Bearer eyJhbGc...
        
        activate AuthMiddleware
        AuthMiddleware->>AuthMiddleware: 4. Extract JWT Token
        
        AuthMiddleware->>AuthMiddleware: 5. Verify Token Signature
        Note over AuthMiddleware: Algorithm: HS256/RS256<br/>Secret Key/Public Key
        
        alt Token Valid
            AuthMiddleware->>AuthMiddleware: 6. Decode JWT Payload
            Note over AuthMiddleware: Extract: user_id, roles,<br/>permissions, exp, iat
            
            AuthMiddleware->>AuthMiddleware: 7. Check Token Expiration
            Note over AuthMiddleware: Current Time > Exp?
            
            AuthMiddleware->>AuthMiddleware: 8. Validate User Permissions
            Note over AuthMiddleware: Check if user has<br/>required role/permission
            
            AuthMiddleware->>Router: ✓ Authorization Passed<br/>Attach: req.user, req.permissions
        else Invalid/Expired Token
            AuthMiddleware->>Network: ✗ 401 Unauthorized<br/>Error: Invalid token
            Network->>Client: 401 Response
        end
        
        deactivate AuthMiddleware
    end
    
    rect rgb(200, 255, 200)
        Note over Router,Validator: REQUEST VALIDATION LAYER
        
        Router->>Validator: 9. Validate Request Structure
        activate Validator
        
        Validator->>Validator: Check Content-Type
        Note over Validator: Expected: application/json
        
        Validator->>Validator: 10. Schema Validation
        Note over Validator: Body Schema:<br/>- name (string, max 100)<br/>- email (email format)<br/>- age (number, 18-120)
        
        Validator->>Validator: 11. Type Coercion<br/>(if applicable)
        
        Validator->>Validator: 12. Sanitization
        Note over Validator: - Trim whitespace<br/>- Remove HTML tags<br/>- Escape special chars
        
        alt Validation Passed
            Validator->>Router: ✓ Valid Request<br/>Clean data object
        else Validation Failed
            Validator->>Network: ✗ 400 Bad Request<br/>Error details: field errors
            Network->>Client: 400 Response
        end
        
        deactivate Validator
    end
    
    rect rgb(200, 220, 255)
        Note over Router,Controller: CONTROLLER/HANDLER LAYER
        
        Router->>Controller: 13. Route to Controller
        activate Controller
        
        Controller->>Controller: 14. Pre-processing
        Note over Controller: - Extract path params<br/>- Merge query/body data<br/>- Set up logging context
        
        Controller->>Controller: 15. Business Logic Authorization
        Note over Controller: Can user modify<br/>this resource?<br/>User owns it?
        
        alt Resource Access Denied
            Controller->>Network: ✗ 403 Forbidden
            Network->>Client: 403 Response
        end
    end
    
    rect rgb(255, 240, 200)
        Note over Controller,ServiceLayer: SERVICE LAYER (Business Logic)
        
        Controller->>ServiceLayer: 16. Call Service Method<br/>userService.updateProfile(userId, data)
        activate ServiceLayer
        
        ServiceLayer->>ServiceLayer: 17. Additional Validation
        Note over ServiceLayer: - Check email uniqueness<br/>- Validate business rules<br/>- Check quotas/limits
        
        ServiceLayer->>ServiceLayer: 18. Data Transformation
        Note over ServiceLayer: - Convert formats<br/>- Calculate derived values<br/>- Prepare for persistence
        
        ServiceLayer->>ServiceLayer: 19. Pre-persistence Logic
        Note over ServiceLayer: - Hash password (if needed)<br/>- Encrypt sensitive data<br/>- Set timestamps<br/>- Generate IDs
    end
    
    rect rgb(220, 200, 255)
        Note over ServiceLayer,Repository: DATA ACCESS LAYER
        
        ServiceLayer->>Repository: 20. Call Repository Method<br/>userRepository.update(userId, userData)
        activate Repository
        
        Repository->>Repository: 21. Build Query
        Note over Repository: SQL: UPDATE users SET<br/>name=?, email=?<br/>WHERE id=? AND deleted=0
        
        Repository->>Repository: 22. Prepare Bindings
        Note over Repository: Values: [data.name, data.email, userId]<br/>Sanitized to prevent SQL injection
        
        Repository->>Database: 23. Execute Database Query
        Note over Repository: Connection pool management<br/>Transaction handling
        
        activate Database
        
        Database->>Database: 24. Database Processing
        Note over Database: - Lock relevant rows<br/>- Validate constraints<br/>- Update indexes<br/>- Write to disk
        
        alt Query Successful
            Database-->>Repository: 25. Return affected rows<br/>{ rowsAffected: 1 }
        else Query Failed
            Database-->>Repository: Error: Constraint violation<br/>Unique key conflict<br/>Foreign key error
        end
        
        deactivate Database
    end
    
    Repository->>ServiceLayer: 26. Return Update Result<br/>Updated user object
    deactivate Repository
    
    ServiceLayer->>ServiceLayer: 27. Post-persistence Logic
        Note over ServiceLayer: - Invalidate cache<br/>- Trigger events<br/>- Queue background jobs<br/>- Log audit trail
    
    ServiceLayer->>Controller: Return processed data
    deactivate ServiceLayer
    
    rect rgb(200, 240, 200)
        Note over Controller,ResponseFormatter: RESPONSE FORMATTING LAYER
        
        Controller->>ResponseFormatter: 28. Format Response
        activate ResponseFormatter
        
        ResponseFormatter->>ResponseFormatter: 29. Select Fields
        Note over ResponseFormatter: Exclude: password, secret_key<br/>Include: public user data
        
        ResponseFormatter->>ResponseFormatter: 30. Apply Response Schema
        Note over ResponseFormatter: - Serialize objects<br/>- Format dates<br/>- Format numbers<br/>- Convert enums
        
        ResponseFormatter->>ResponseFormatter: 31. Add Metadata
        Note over ResponseFormatter: - HTTP Status: 200<br/>- Headers: Content-Type<br/>- Headers: Cache-Control<br/>- Headers: ETag
        
        ResponseFormatter->>Router: Response object
        deactivate ResponseFormatter
    end
    
    Router->>Network: 32. Send HTTP Response
    Note over Network: Status: 200 OK<br/>Headers: Content-Type, Cache-Control<br/>Body: JSON payload
    activate Network
    
    Network->>Client: 33. Receive Response
    deactivate Network
    deactivate Controller
    deactivate Router
    
    rect rgb(240, 200, 200)
        Note over Client: CLIENT-SIDE PROCESSING
        
        Client->>Client: 34. Parse Response
        Note over Client: - Check status code<br/>- Parse JSON body<br/>- Extract headers
        
        Client->>Client: 35. Client-side Validation
        Note over Client: - Verify data integrity<br/>- Type checking
        
        Client->>Client: 36. Update Local State
        Note over Client: - Update store/state<br/>- Update cache<br/>- Invalidate stale data
        
        Client->>Client: 37. Update UI
        Note over Client: - Render updated data<br/>- Show success message<br/>- Trigger dependent re-renders
    end
```

## Complete Data Flow Details

### 1. **CLIENT PREPARATION**
```
Request Structure:
├── Headers
│   ├── Authorization: Bearer <JWT_TOKEN>
│   ├── Content-Type: application/json
│   ├── Accept: application/json
│   ├── User-Agent: Mozilla/5.0...
│   └── X-Request-ID: uuid (for tracing)
├── Query Parameters
│   ├── include=profile,settings
│   └── version=v2
├── Path Parameters
│   └── userId: 12345
└── Body (JSON)
    ├── name: "John Doe"
    ├── email: "john@example.com"
    ├── phoneNumber: "+1234567890"
    └── preferences: { ... }
```

### 2. **AUTHORIZATION MIDDLEWARE**
```
Process:
1. Extract: Authorization header
2. Parse: Bearer token
3. Verify: JWT signature with secret
4. Validate: Token not expired
5. Decode: User claims
   - user_id
   - email
   - roles: ['user', 'admin']
   - permissions: ['read', 'write', 'delete']
   - iss (issuer)
   - aud (audience)
6. Attach: req.user = { id, email, roles, permissions }

JWT Structure:
header.payload.signature
- header: { alg: "HS256", typ: "JWT" }
- payload: { sub: "12345", name: "John", iat: 1516239022, exp: 1516325422 }
- signature: HMACSHA256(base64url(header) + "." + base64url(payload), secret)
```

### 3. **REQUEST VALIDATION**
```
Validation Rules:
├── Content-Type Check
│   └── Must be: application/json
├── Schema Validation (JSON Schema / Zod / Joi)
│   ├── name (string)
│   │   ├── required: true
│   │   ├── minLength: 1
│   │   └── maxLength: 100
│   ├── email (string)
│   │   ├── required: true
│   │   ├── format: email
│   │   └── unique: true
│   └── age (number)
│       ├── type: integer
│       ├── minimum: 18
│       └── maximum: 120
├── Sanitization
│   ├── Trim whitespace
│   ├── Remove HTML/script tags
│   ├── Encode special characters
│   └── Validate URLs
└── Type Coercion
    └── Convert "123" → 123 (if applicable)
```

### 4. **CONTROLLER LAYER**
```
Responsibilities:
├── Extract Parameters
│   ├── Path: /users/:userId
│   ├── Query: ?include=profile&sort=name
│   └── Body: request body
├── Resource Authorization
│   └── Can user_id=1 modify user_id=1?
│       └── Check: ownership or admin role
├── Error Handling
│   ├── 403 Forbidden (no permission)
│   ├── 404 Not Found (resource doesn't exist)
│   └── 409 Conflict (concurrent modification)
└── Call Service Layer
    └── Pass cleaned data to business logic
```

### 5. **SERVICE LAYER (Business Logic)**
```
Typical Operations:
├── Validation
│   ├── Check email uniqueness
│   │   └── Query: SELECT COUNT(*) FROM users WHERE email=?
│   ├── Verify business rules
│   │   └── Example: Max 10 updates per hour
│   └── Check constraints
│       └── Example: Cannot delete last admin
├── Transformation
│   ├── Merge old and new data
│   ├── Calculate computed fields
│   │   └── Example: lastModified = NOW()
│   └── Prepare for persistence
├── Pre-persistence
│   ├── Hash passwords: bcrypt(password, salt)
│   ├── Encrypt PII
│   │   └── AES-256 encryption with key from vault
│   ├── Set timestamps
│   │   ├── createdAt (if new)
│   │   └── updatedAt
│   └── Generate identifiers
│       └── UUID, nanoid, etc.
└── Post-persistence
    ├── Invalidate cache
    │   └── Cache key: user:12345
    ├── Emit events
    │   └── EventBus.emit('user.updated', { userId, changes })
    ├── Queue async jobs
    │   └── Queue: 'send-email-verification'
    └── Audit logging
        └── Log: { action: 'update', userId: 12345, changes: {...}, timestamp }
```

### 6. **DATA ACCESS LAYER (Repository)**
```
Database Interaction:
├── Build Query
│   ├── ORM: userRepository.update({ id: 12345, ...data })
│   └── Raw SQL: UPDATE users SET ... WHERE id = ?
├── Parameter Binding (SQL Injection Prevention)
│   ├── Parameterized queries: ?
│   ├── Prepared statements
│   └── Input validation
├── Connection Management
│   ├── Get connection from pool
│   ├── Execute query
│   └── Release connection
├── Transaction Handling
│   ├── BEGIN TRANSACTION
│   ├── Multiple operations (atomic)
│   ├── COMMIT on success
│   └── ROLLBACK on error
└── Error Handling
    ├── Duplicate key: 23505
    ├── Foreign key violation: 23503
    ├── Check constraint violation: 23514
    └── Timeout: connection timeout
```

### 7. **DATABASE OPERATIONS**
```
Detailed Steps:
├── 1. Row Locking
│   ├── SELECT ... FOR UPDATE
│   └── Prevents concurrent conflicts
├── 2. Constraint Validation
│   ├── Primary key uniqueness
│   ├── Foreign key references
│   ├── Check constraints
│   └── NOT NULL constraints
├── 3. Trigger Execution (if defined)
│   ├── BEFORE UPDATE triggers
│   ├── AFTER UPDATE triggers
│   └── Example: auto-update modified_timestamp
├── 4. Index Updates
│   ├── Update all relevant indexes
│   └── Maintain B-tree structure
├── 5. Disk Write
│   ├── Write to transaction log (WAL)
│   ├── Write to data files
│   └── Fsync for durability
└── 6. Return Results
    └── rows affected: 1
```

### 8. **RESPONSE FORMATTING**
```
Processing:
├── Field Selection
│   ├── Exclude sensitive fields
│   │   ├── password
│   │   ├── apiKey
│   │   ├── secretToken
│   │   └── internalIds
│   └── Include public fields
│       ├── id, email, name
│       └── createdAt, updatedAt
├── Serialization
│   ├── Objects → JSON
│   ├── Dates → ISO 8601: "2026-05-21T14:30:00Z"
│   ├── Decimals → Fixed precision: "19.99"
│   └── Enums → String representations
├── HTTP Status & Headers
│   ├── Status: 200 OK
│   ├── Content-Type: application/json; charset=utf-8
│   ├── Cache-Control: private, max-age=0
│   ├── ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
│   ├── X-Request-ID: uuid (for tracing)
│   └── X-RateLimit-Remaining: 99
└── Response Body
    ├── data: { ... }
    ├── meta: { timestamp, requestId }
    └── errors: [] (if any)
```

### 9. **COMPLETE REQUEST/RESPONSE EXAMPLE**

**REQUEST:**
```http
POST /api/v1/users/12345/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+1234567890",
  "preferences": {
    "notifications": true,
    "theme": "dark"
  }
}
```

**RESPONSE (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 512
Cache-Control: private, max-age=0
ETag: "33a64df551425fcc55e4d42a148795d9"
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-RateLimit-Remaining: 99
Date: Wed, 21 May 2026 14:30:00 GMT

{
  "success": true,
  "data": {
    "id": "12345",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "preferences": {
      "notifications": true,
      "theme": "dark"
    },
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-05-21T14:30:00Z"
  },
  "meta": {
    "timestamp": "2026-05-21T14:30:00Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**RESPONSE (Validation Error):**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      },
      {
        "field": "phoneNumber",
        "message": "Phone number already exists",
        "code": "DUPLICATE_VALUE"
      }
    ]
  }
}
```

**RESPONSE (Authorization Error):**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to modify this resource",
    "requiredPermissions": ["users:write"],
    "userPermissions": ["users:read"]
  }
}
```

## Security Considerations at Each Layer

| Layer | Security Measures |
|-------|-------------------|
| **Authorization** | JWT validation, expiration check, signature verification, role/permission validation |
| **Validation** | Schema validation, type checking, sanitization, length limits, format validation |
| **Controller** | Resource ownership check, rate limiting, request size limits |
| **Service** | Business rule enforcement, idempotency checks, duplicate prevention |
| **Repository** | Parameterized queries (SQL injection prevention), prepared statements, transaction isolation |
| **Response** | Field filtering, sensitive data exclusion, proper HTTP status codes |

## Performance Optimizations

- **Caching**: Store validated requests in cache (Redis)
- **Database Indexes**: Index frequently queried fields
- **Connection Pooling**: Reuse database connections
- **Query Optimization**: Use SELECT with specific columns, avoid N+1 queries
- **Async Operations**: Queue heavy operations (email, notifications)
- **Response Compression**: Gzip responses
- **HTTP Caching**: Leverage ETag and Cache-Control headers
- **Load Balancing**: Distribute requests across servers

## Error Handling Strategy

```
HTTP Status Codes:
- 400: Bad Request (validation failed)
- 401: Unauthorized (authentication failed)
- 403: Forbidden (authorization failed)
- 404: Not Found (resource doesn't exist)
- 409: Conflict (concurrent modification)
- 422: Unprocessable Entity (business rule violation)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error (unexpected error)
- 503: Service Unavailable (database down, etc.)
```

