# AI Powered Support Ticket Management Platform

A microservices-based support ticket management platform built with **FastAPI, React + Vite, PostgreSQL, and JWT authentication**. The platform helps customers create support tickets, enables support agents to manage assigned tickets, and allows administrators to manage users, assign tickets, and monitor support operations.

## 1. Project Overview

The AI Powered Support Ticket Management Platform provides a centralized system for managing customer support requests through independent backend microservices.

The application supports:

- User registration and login.
- JWT-based authentication.
- Role-based access control.
- Support ticket creation and management.
- Automatic ticket assignment based on agent workload.
- Assignment history tracking.
- Email notification service.
- Support analytics and dashboard.
- Centralized API access through an API Gateway.

> Note: The current implementation includes workload-based automatic assignment. AI-based ticket classification or machine-learning predictions should only be considered implemented if they are explicitly developed and integrated.

## 2. Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- PostgreSQL
- JWT authentication
- HTTPX for inter-service communication
- SMTP for email notifications

### Frontend
- React
- Vite
- JavaScript
- Axios
- React Router
- Tailwind CSS (if configured in the frontend)

### Development Tools
- Visual Studio Code
- Swagger UI
- Git and GitHub
- Postman (optional)

## 3. System Architecture

The application follows a microservices architecture. Each service handles a specific business responsibility and can be developed and maintained independently.

```text
                    React + Vite Frontend
                             |
                             v
                       API Gateway
                        Port 8000
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
    Auth Service       Ticket Service     Assignment Service
      Port 8001           Port 8002            Port 8003
          |                  |                  |
          v                  v                  v
    Auth Database      Ticket Database    Assignment Database

                             |
                +------------+------------+
                |                         |
                v                         v
       Notification Service        Analytics Service
            Port 8004                  Port 8005
                |                         |
                v                         v
           SMTP Server            Ticket Data / Metrics
```

### Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 8000 | Central entry point for frontend API requests |
| Auth Service | 8001 | Registration, login, JWT authentication, user management |
| Ticket Service | 8002 | Ticket creation, retrieval, and updates |
| Assignment Service | 8003 | Agent selection, ticket assignment, assignment history |
| Notification Service | 8004 | Email notification processing |
| Analytics Service | 8005 | Ticket statistics and analytics |

Each backend service should use its own database configuration.

## 4. User Roles

### Admin
- View and manage users.
- View support tickets.
- Assign tickets to support agents.
- View assignment history.
- Access administrative dashboards.

### Agent
- View tickets assigned to them.
- Access assigned ticket details.
- Update tickets according to permissions.

### Customer
- Create support tickets.
- View tickets they created.
- Update permitted ticket fields.
- Track ticket progress.

Actual permissions depend on the authorization checks implemented in each service.

## 5. Ticket Assignment Workflow

The Assignment Service uses agent workload to select an agent automatically.

1. The administrator selects an unassigned ticket.
2. The frontend sends an assignment request through the API Gateway.
3. The Assignment Service verifies the request and retrieves ticket details.
4. The service retrieves the available agents from the Auth Service.
5. It retrieves tickets from the Ticket Service to calculate agent workloads.
6. It selects an active agent with the lowest number of active tickets.
7. It updates the ticket assignment in the Ticket Service.
8. It stores the assignment and assignment history in the Assignment Service database.
9. The frontend refreshes the assignment queue.

The system does not automatically select an agent solely because they submitted the lowest quotation or have another unrelated ranking. Assignment is based on the configured workload-selection logic.

## 6. Prerequisites

Install the following software before starting the application:

- Python 3.11 or another Python version compatible with the project's dependencies.
- Node.js and npm.
- PostgreSQL.
- Git.
- Visual Studio Code or another code editor.

Check the installed versions:

```bash
python --version
node --version
npm --version
psql --version
```

## 7. Project Structure

The following is a representative structure. Adjust folder names to match the actual repository.

```text
AI-Powered-Support-Ticket/
│
├── backend/
│   ├── .env
│   ├── api-gateway/
│   ├── auth-service/
│   ├── ticket-service/
│   ├── assignment-service/
│   ├── notification-service/
│   └── analytics-service/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## 8. Database Setup

Create a separate PostgreSQL database for each service.

Open PostgreSQL using `psql` or a database management tool and execute:

```sql
CREATE DATABASE support_auth;
CREATE DATABASE support_ticket;
CREATE DATABASE support_assignment;
CREATE DATABASE support_notification;
```

The Analytics Service may use data retrieved from other services rather than a dedicated database, depending on its implementation.

Ensure that the PostgreSQL username, password, host, port, and database names match the application's environment configuration.

### Database Tables

The exact tables depend on the implemented SQLAlchemy models.

Typical entities include:

- Users
- Tickets
- Ticket assignments
- Assignment history
- Notifications
- Notification delivery logs, if implemented

Create the tables using the project's existing initialization or migration mechanism. If the project uses Alembic, run its migrations instead of creating duplicate tables manually.

## 9. Environment Configuration

Create a `.env` file in the backend directory if that is the location configured by the services.

Example configuration:

```env
# JWT Configuration
SECRET_KEY=replace_with_a_secure_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# API Gateway
GATEWAY_PORT=8000

# Authentication Service
AUTH_SERVICE_URL=http://127.0.0.1:8001
AUTH_DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/support_auth

# Ticket Management Service
TICKET_SERVICE_URL=http://127.0.0.1:8002
TICKET_DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/support_ticket

# Assignment Service
ASSIGNMENT_SERVICE_URL=http://127.0.0.1:8003
ASSIGNMENT_DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/support_assignment

# Notification Service
NOTIFICATION_SERVICE_URL=http://127.0.0.1:8004
NOTIFICATION_DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/support_notification

# Analytics Service
ANALYTICS_SERVICE_URL=http://127.0.0.1:8005

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_email_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

Replace placeholder values with the actual configuration.

Important:
- Do not commit `.env` or real credentials to GitHub.
- Use a strong, randomly generated JWT secret.
- Ensure every service loads the correct environment variables.
- Keep JWT configuration compatible across services that validate the same access tokens.
- Ensure each service uses its own database URL.
- Configure the environment file path explicitly if services are started from different working directories.
- Configure SMTP credentials only if email delivery is enabled.

## 10. Backend Installation

Open a terminal in the backend directory.

Create and activate a virtual environment if the project uses a shared backend environment.

### Windows

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, use Command Prompt:

```bat
venv\Scripts\activate.bat
```

Install the dependencies listed in the project's `requirements.txt`:

```bash
pip install -r requirements.txt
```

If each microservice has its own `requirements.txt`, install dependencies separately for each service.

Typical dependencies include:

```bash
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings httpx "psycopg[binary]" python-jose[cryptography] passlib[bcrypt] python-multipart
```

The actual packages required depend on the project's imports and authentication implementation. Use the existing requirements file as the source of truth.

## 11. Run the Backend Services

Start each service from its own directory in a separate terminal.

The commands below assume each service exposes `app.main:app`.

### Terminal 1: Auth Service

```bash
cd backend/auth-service
uvicorn app.main:app --reload --port 8001
```

### Terminal 2: Ticket Service

```bash
cd backend/ticket-service
uvicorn app.main:app --reload --port 8002
```

### Terminal 3: Assignment Service

```bash
cd backend/assignment-service
uvicorn app.main:app --reload --port 8003
```

### Terminal 4: Notification Service

```bash
cd backend/notification-service
uvicorn app.main:app --reload --port 8004
```

### Terminal 5: Analytics Service

```bash
cd backend/analytics-service
uvicorn app.main:app --reload --port 8005
```

### Terminal 6: API Gateway

```bash
cd backend/api-gateway
uvicorn app.main:app --reload --port 8000
```

If your gateway or service uses a different Python module path, replace `app.main:app` with the correct import path.

### Swagger Documentation

When the services are running, open:

| Service | Swagger URL |
|---|---|
| API Gateway | http://127.0.0.1:8000/docs |
| Auth Service | http://127.0.0.1:8001/docs |
| Ticket Service | http://127.0.0.1:8002/docs |
| Assignment Service | http://127.0.0.1:8003/docs |
| Notification Service | http://127.0.0.1:8004/docs |
| Analytics Service | http://127.0.0.1:8005/docs |

The API Gateway documentation displays the routes exposed by the gateway. Individual service documentation is useful for debugging service-specific endpoints.

## 12. Frontend Installation

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend is normally available at:

http://localhost:5173

Ensure the Axios base URL points to the API Gateway:

```javascript
baseURL: "http://127.0.0.1:8000"
```

If the gateway expects a different route prefix, update the frontend API calls to match the gateway configuration.

## 13. Authentication Workflow

1. Register a user using the registration endpoint.
2. Sign in using the login endpoint.
3. The Auth Service returns a JWT access token.
4. The frontend stores the token according to the application's authentication implementation.
5. Axios attaches the token to protected requests.
6. Backend services validate the token and enforce role-based permissions.

Example Authorization header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Do not share access tokens or commit them to the repository.

## 14. API Endpoints

The following endpoints represent the application's intended API areas. Verify the exact routes against the current Swagger documentation and API Gateway configuration.

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate a user |
| GET | `/auth/me` | Retrieve the current user's profile |
| GET | `/auth/users` | Retrieve users (Admin only) |
| GET | `/auth/users/agents` | Retrieve agents (Admin only) |

### Tickets

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/tickets/` | Create a ticket |
| GET | `/tickets/` | Retrieve tickets allowed for the current user |
| GET | `/tickets/{ticket_id}` | Retrieve a specific ticket |
| PATCH | `/tickets/{ticket_id}` | Update permitted ticket fields |
| PATCH | `/tickets/{ticket_id}/assign` | Update ticket assignment, if implemented |

### Assignments

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/assignments/` | Automatically assign a ticket |
| GET | `/assignments/` | Retrieve assignments |
| GET | `/assignments/{ticket_id}` | Retrieve a ticket assignment |
| GET | `/assignments/{ticket_id}/history` | Retrieve assignment history |

### Analytics

Analytics endpoints depend on the implementation. Use the Analytics Service Swagger page to verify the supported dashboard and reporting routes.

### API Gateway

The frontend should send requests to the API Gateway. For example:

```text
Frontend
   |
   v
http://127.0.0.1:8000
   |
   +--> Auth Service
   +--> Ticket Service
   +--> Assignment Service
   +--> Notification Service
   +--> Analytics Service
```

The gateway must be configured to forward each route to its correct backend service.

## 15. Testing the Application

### Authentication Testing

1. Register a test user.
2. Log in with valid credentials.
3. Copy the access token.
4. Use the token to call protected endpoints.
5. Verify that requests without valid authentication are rejected.

### Ticket Testing

1. Log in as a Customer.
2. Create a support ticket.
3. Retrieve the ticket list.
4. Open the ticket details.
5. Update permitted ticket fields.
6. Verify that customers cannot modify restricted fields or access other customers' tickets.

### Assignment Testing

1. Create an Admin account.
2. Create or register at least one active Agent account.
3. Create a ticket as a Customer.
4. Log in as Admin.
5. Open the Assign Tickets page.
6. Select an unassigned ticket and click Assign Ticket.
7. Verify the selected agent and assignment status.
8. Check assignment history.
9. Confirm that the ticket is visible to the assigned agent.

### Testing Tools

- Swagger UI
- Postman
- Browser developer tools
- Service terminal logs

Automated test coverage should be documented after the corresponding tests have actually been implemented and executed.

## 16. Troubleshooting

### Missing Settings Error

Example:

```text
ValidationError: SECRET_KEY
ValidationError: DATABASE_URL
```

Check:
- Whether the `.env` file exists.
- Whether the environment file path is correct.
- Whether the service expects `DATABASE_URL` or a service-specific variable such as `ASSIGNMENT_DATABASE_URL`.
- Whether required settings are defined in the service's configuration class.

### Ticket Service Returns 401 Unauthorized

Check:
- Whether the frontend sends a valid JWT.
- Whether the Assignment Service forwards the Authorization header to the Ticket Service.
- Whether the services use compatible JWT secrets and algorithms.
- Whether the token has expired.

### Resource Not Found in Auth Service

Check:
- Whether the agents endpoint exists.
- Whether the router is registered in `main.py`.
- Whether the router prefix is included in the request URL.
- Whether the API Gateway forwards the correct path.

For example, an Auth router with the prefix `/auth` and a route `/users/agents` exposes:

```text
/auth/users/agents
```

### 503 Service Unavailable

Check:
- Whether the target service is running.
- Whether the configured host and port are correct.
- Whether the service can connect to its database.
- Whether an internal service request is failing.

### PostgreSQL Connection Error

Check:
- Whether PostgreSQL is running.
- Whether the target database exists.
- Whether credentials are correct.
- Whether the PostgreSQL driver is installed.
- Whether the connection URL uses the correct database name.

### Frontend API Errors

Open browser developer tools and inspect the Network and Console tabs.

Check:
- The API Gateway URL.
- The request path.
- The response status code and response body.
- The Authorization header.
- The gateway route configuration.

## 17. Security Considerations

- Store secrets in environment variables.
- Never commit production credentials.
- Apply role-based access control to protected endpoints.
- Validate request data using Pydantic schemas.
- Enforce ticket ownership and assignment permissions.
- Use HTTPS in production.
- Validate webhook requests if webhooks are enabled.
- Restrict CORS to trusted frontend origins in production.
- Avoid exposing internal service credentials or sensitive error details.
- Add appropriate logging and monitoring for service failures.

## 18. Future Enhancements

Potential improvements include:

- AI-based ticket categorization.
- Priority prediction.
- SLA deadline monitoring.
- Automated escalation for overdue tickets.
- Real-time ticket updates.
- Advanced dashboard analytics.
- More comprehensive automated tests.
- Centralized structured logging.
- Retry mechanisms for inter-service communication.
- Docker and Docker Compose deployment.
- CI/CD automation.

These are future enhancements unless already implemented in the application.

## 19. Author

**Project:** AI Powered Support Ticket Management Platform

**Backend:** FastAPI and Python

**Frontend:** React and Vite

**Database:** PostgreSQL

**Architecture:** Microservices with an API Gateway
.