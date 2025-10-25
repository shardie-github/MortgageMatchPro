# System Architecture Overview

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        BROKER[Broker Portal]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx Load Balancer]
        RATE[Rate Limiter]
        AUTH[Auth Middleware]
    end
    
    subgraph "Application Layer"
        API[Next.js API Routes]
        AGENTS[AI Agents]
        CALC[Calculation Engine]
    end
    
    subgraph "Data Layer"
        SUPABASE[(Supabase PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end
    
    subgraph "External Services"
        OPENAI[OpenAI API]
        STRIPE[Stripe Payments]
        RATEHUB[RateHub.ca]
        FREDDIE[Freddie Mac API]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    BROKER --> NGINX
    
    NGINX --> RATE
    RATE --> AUTH
    AUTH --> API
    
    API --> AGENTS
    API --> CALC
    API --> SUPABASE
    API --> REDIS
    
    AGENTS --> OPENAI
    API --> STRIPE
    CALC --> RATEHUB
    CALC --> FREDDIE
    
    SUPABASE --> FILES
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant A as API Gateway
    participant C as Calculation Engine
    participant D as Database
    participant E as External APIs
    
    U->>W: Submit mortgage request
    W->>A: POST /api/calculate
    A->>A: Validate & Rate Limit
    A->>C: Process calculation
    C->>E: Fetch current rates
    E-->>C: Return rates
    C->>D: Store calculation
    D-->>C: Confirmation
    C-->>A: Calculation result
    A-->>W: Response
    W-->>U: Display results
```

## Component Relationships

```mermaid
graph LR
    subgraph "Frontend Components"
        HOME[HomeScreen]
        CALC[CalculatorScreen]
        DASH[Dashboard]
        PROFILE[ProfileScreen]
    end
    
    subgraph "API Services"
        MORTGAGE[Mortgage API]
        RATES[Rates API]
        AUTH_API[Auth API]
        BROKER_API[Broker API]
    end
    
    subgraph "Business Logic"
        CALC_ENGINE[Calculation Engine]
        AI_AGENTS[AI Agents]
        VALIDATION[Validation Service]
    end
    
    subgraph "Data Services"
        DB[Database Service]
        CACHE[Cache Service]
        FILE[File Service]
    end
    
    HOME --> MORTGAGE
    CALC --> MORTGAGE
    DASH --> AUTH_API
    PROFILE --> AUTH_API
    
    MORTGAGE --> CALC_ENGINE
    RATES --> CALC_ENGINE
    AUTH_API --> VALIDATION
    BROKER_API --> AI_AGENTS
    
    CALC_ENGINE --> DB
    AI_AGENTS --> DB
    VALIDATION --> CACHE
    MORTGAGE --> FILE
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        DDoS[DDoS Protection]
        SSL[SSL/TLS Termination]
    end
    
    subgraph "Authentication"
        JWT[JWT Tokens]
        OAUTH[OAuth 2.0]
        MFA[Multi-Factor Auth]
    end
    
    subgraph "Authorization"
        RBAC[Role-Based Access Control]
        RLS[Row Level Security]
        POLICIES[Security Policies]
    end
    
    subgraph "Data Protection"
        ENCRYPT[Encryption at Rest]
        TRANSPORT[Encryption in Transit]
        BACKUP[Secure Backups]
    end
    
    WAF --> DDoS
    DDoS --> SSL
    SSL --> JWT
    JWT --> OAUTH
    OAUTH --> MFA
    MFA --> RBAC
    RBAC --> RLS
    RLS --> POLICIES
    POLICIES --> ENCRYPT
    ENCRYPT --> TRANSPORT
    TRANSPORT --> BACKUP
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "CDN Layer"
        CLOUDFLARE[Cloudflare CDN]
    end
    
    subgraph "Load Balancer"
        NGINX[Nginx]
    end
    
    subgraph "Application Servers"
        APP1[App Server 1]
        APP2[App Server 2]
        APP3[App Server 3]
    end
    
    subgraph "Database Cluster"
        PRIMARY[(Primary DB)]
        REPLICA1[(Replica 1)]
        REPLICA2[(Replica 2)]
    end
    
    subgraph "Cache Layer"
        REDIS1[Redis Primary]
        REDIS2[Redis Replica]
    end
    
    subgraph "External Services"
        SUPABASE[Supabase]
        OPENAI[OpenAI]
        STRIPE[Stripe]
    end
    
    CLOUDFLARE --> NGINX
    NGINX --> APP1
    NGINX --> APP2
    NGINX --> APP3
    
    APP1 --> PRIMARY
    APP2 --> REPLICA1
    APP3 --> REPLICA2
    
    APP1 --> REDIS1
    APP2 --> REDIS1
    APP3 --> REDIS2
    
    APP1 --> SUPABASE
    APP2 --> OPENAI
    APP3 --> STRIPE
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Mobile**: React Native with Expo
- **UI Components**: Custom responsive components

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis
- **Authentication**: Supabase Auth

### AI & ML
- **Language Model**: OpenAI GPT-4
- **Agents**: Custom AI agent framework
- **Processing**: Server-side processing

### Infrastructure
- **Hosting**: Vercel
- **CDN**: Cloudflare
- **Monitoring**: Sentry, PostHog
- **Analytics**: Custom analytics

### Security
- **Encryption**: AES-256-GCM
- **Rate Limiting**: Redis-based
- **Validation**: Zod schemas
- **Audit**: Comprehensive logging