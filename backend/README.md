# Django REST API Backend

A comprehensive Django REST API backend with JWT authentication, PostgreSQL database support, and React frontend integration.

## Features

- **Custom User Model**: Extended AbstractUser with additional fields
- **JWT Authentication**: Using djangorestframework-simplejwt
- **PostgreSQL Database**: Production-ready database configuration
- **CORS Support**: Configured for React frontend communication
- **API Versioning**: RESTful API with versioning support
- **Development Tools**: Debug toolbar and comprehensive logging
- **Management Commands**: Custom commands for setup automation
- **Security**: Production-ready security settings

## Project Structure

```
backend/
├── accounts/           # User management app
├── api/               # API configuration and versioning
├── core/              # Shared utilities and base models
├── backend/           # Main Django project settings
├── static/            # Static files
├── media/             # Media files
├── templates/         # Django templates
├── requirements.txt   # Python dependencies
├── .env              # Environment variables
└── manage.py         # Django management script
```

## Quick Start

### 1. Environment Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Key variables to configure:
- `SECRET_KEY`: Django secret key
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL credentials
- `CORS_ALLOWED_ORIGINS`: Frontend URLs for CORS

### 3. Database Setup

For development with SQLite:
```bash
python manage.py makemigrations --settings=backend.settings_dev
python manage.py migrate --settings=backend.settings_dev
python manage.py create_superuser_if_none --settings=backend.settings_dev
```

For production with PostgreSQL:
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py create_superuser_if_none
```

### 4. Run Development Server

```bash
python manage.py runserver --settings=backend.settings_dev
```

## API Endpoints

### Authentication Endpoints
- `POST /api/v1/auth/register/` - User registration
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/logout/` - User logout
- `POST /api/v1/auth/token/refresh/` - Refresh JWT token
- `GET /api/v1/auth/profile/` - Get user profile
- `PUT/PATCH /api/v1/auth/profile/update/` - Update user profile
- `POST /api/v1/auth/password/change/` - Change password
- `POST /api/v1/auth/password/reset/` - Password reset

### System Endpoints
- `GET /api/health/` - Health check
- `GET /api/info/` - API information

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Development

### Running Tests
```bash
python manage.py test
```

### Creating New Apps
```bash
python manage.py startapp app_name
```

### Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Creating Management Commands
Place custom commands in `accounts/management/commands/`

## Deployment

### Environment Variables
Ensure all production environment variables are set:
- Set `DEBUG=False`
- Configure proper `ALLOWED_HOSTS`
- Set strong `SECRET_KEY`
- Configure PostgreSQL database
- Set proper CORS origins

### Static Files
```bash
python manage.py collectstatic
```

### WSGI/ASGI
The project includes both WSGI (`backend/wsgi.py`) and ASGI (`backend/asgi.py`) configurations.

## Dependencies

Key packages:
- Django 5.2.5
- Django REST Framework 3.15.2
- djangorestframework-simplejwt 5.3.0
- django-cors-headers 4.4.0
- psycopg2-binary 2.9.9
- django-environ 0.11.2
- gunicorn 21.2.0 (for production)

## Security Features

- CSRF protection
- JWT token authentication
- CORS configuration
- Security middleware
- Production security settings
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.