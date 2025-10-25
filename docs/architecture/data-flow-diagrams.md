# Data Flow Diagrams

## User Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Supabase
    participant E as Email Service
    
    U->>F: Enter registration details
    F->>A: POST /api/auth/register
    A->>A: Validate input data
    A->>S: Create user account
    S-->>A: User created
    A->>E: Send verification email
    E-->>U: Verification email
    U->>F: Click verification link
    F->>A: GET /api/auth/verify
    A->>S: Verify user email
    S-->>A: Email verified
    A-->>F: Registration complete
    F-->>U: Show success message
```

## Mortgage Calculation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant C as Calculation Engine
    participant R as Rate APIs
    participant D as Database
    participant AI as AI Agents
    
    U->>F: Enter mortgage details
    F->>A: POST /api/mortgage/calculate
    A->>A: Validate input
    A->>C: Process calculation request
    C->>R: Fetch current rates
    R-->>C: Return rates
    C->>AI: Get personalized recommendations
    AI-->>C: Return recommendations
    C->>D: Store calculation
    D-->>C: Stored successfully
    C-->>A: Calculation results
    A-->>F: Return results
    F-->>U: Display mortgage options
```

## Lead Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant L as Lead Service
    participant B as Broker Service
    participant D as Database
    participant N as Notification Service
    
    U->>F: Submit lead information
    F->>A: POST /api/leads/create
    A->>L: Process lead
    L->>D: Store lead data
    D-->>L: Lead stored
    L->>B: Notify brokers
    B->>D: Update broker assignments
    D-->>B: Updated
    B->>N: Send notifications
    N-->>B: Notifications sent
    L-->>A: Lead processed
    A-->>F: Success response
    F-->>U: Show confirmation
```

## Payment Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Stripe Service
    participant D as Database
    participant E as Email Service
    
    U->>F: Initiate payment
    F->>A: POST /api/payments/create
    A->>A: Validate payment data
    A->>S: Create payment intent
    S-->>A: Payment intent created
    A-->>F: Return client secret
    F->>S: Confirm payment
    S-->>F: Payment status
    F->>A: POST /api/payments/confirm
    A->>S: Verify payment
    S-->>A: Payment verified
    A->>D: Update subscription
    D-->>A: Updated
    A->>E: Send receipt
    E-->>U: Receipt email
    A-->>F: Payment success
    F-->>U: Show success message
```

## AI Agent Processing Flow

```mermaid
sequenceDiagram
    participant R as Request
    participant A as Agent Manager
    participant AI as AI Agent
    participant O as OpenAI
    participant C as Cache
    participant D as Database
    
    R->>A: Process request
    A->>C: Check cache
    alt Cache hit
        C-->>A: Return cached result
    else Cache miss
        A->>AI: Route to appropriate agent
        AI->>O: Send prompt
        O-->>AI: Return response
        AI->>D: Store interaction
        D-->>AI: Stored
        AI->>C: Cache result
        C-->>AI: Cached
        AI-->>A: Return result
    end
    A-->>R: Return processed result
```

## Error Handling Flow

```mermaid
sequenceDiagram
    participant R as Request
    participant A as API
    participant E as Error Handler
    participant L as Logger
    participant M as Monitoring
    participant U as User
    
    R->>A: API request
    A->>A: Process request
    alt Success
        A-->>R: Success response
    else Error occurs
        A->>E: Handle error
        E->>L: Log error details
        L-->>E: Logged
        E->>M: Send to monitoring
        M-->>E: Sent
        E->>E: Determine error type
        alt User error
            E-->>A: User-friendly message
        else System error
            E-->>A: Generic error message
        end
        A-->>R: Error response
        R-->>U: Show error message
    end
```

## Real-time Updates Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant W as WebSocket
    participant A as API
    participant S as Supabase
    participant E as External APIs
    
    U->>F: Open application
    F->>W: Connect to WebSocket
    W-->>F: Connection established
    F->>A: Subscribe to updates
    A->>S: Set up real-time subscription
    S-->>A: Subscription active
    
    loop Real-time updates
        E->>A: Rate update
        A->>S: Update database
        S->>W: Broadcast update
        W->>F: Send update
        F->>U: Show updated rates
    end
```

## Backup and Recovery Flow

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant B as Backup Service
    participant D as Database
    participant S3 as S3 Storage
    participant V as Verification
    participant A as Alerting
    
    S->>B: Trigger backup
    B->>D: Create backup
    D-->>B: Backup data
    B->>S3: Upload backup
    S3-->>B: Upload complete
    B->>V: Verify backup
    V->>S3: Test restore
    S3-->>V: Restore successful
    V-->>B: Backup verified
    B->>A: Send success notification
    A-->>B: Notification sent
    B-->>S: Backup complete
```

## Monitoring and Alerting Flow

```mermaid
sequenceDiagram
    participant M as Metrics Collector
    participant A as Alerting Service
    participant T as Threshold Checker
    participant N as Notification Service
    participant O as Operations Team
    
    M->>M: Collect metrics
    M->>T: Send metrics
    T->>T: Check thresholds
    alt Threshold exceeded
        T->>A: Trigger alert
        A->>N: Send notification
        N->>O: Alert operations team
        O-->>N: Acknowledged
    else Normal operation
        T->>A: No action needed
    end
```

## Security Audit Flow

```mermaid
sequenceDiagram
    participant S as Security Scanner
    participant D as Database
    participant A as Audit Service
    participant L as Logger
    participant M as Monitoring
    participant O as Operations
    
    S->>D: Scan for vulnerabilities
    D-->>S: Return scan results
    S->>A: Process findings
    A->>L: Log security events
    L-->>A: Logged
    A->>M: Send to monitoring
    M-->>A: Sent
    alt Critical issues found
        A->>O: Alert operations
        O-->>A: Investigating
    else No critical issues
        A->>A: Continue monitoring
    end
```