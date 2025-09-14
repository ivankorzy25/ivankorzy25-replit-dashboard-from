# Resumen General

KOR Dashboard es una aplicación web desarrollada como sistema de gestión de productos para una empresa de equipamiento industrial. La aplicación proporciona una interfaz CRUD completa para administrar catálogos de productos, recursos multimedia, información de precios, y ahora incluye un sistema avanzado de reportes y análisis con visualizaciones interactivas.

# Preferencias del Usuario

Estilo de comunicación preferido: Lenguaje simple y cotidiano.
Idioma preferido: Español.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript as the primary frontend framework
- **Vite** for build tooling and development server with hot module replacement
- **Tailwind CSS** for styling with shadcn/ui component library providing pre-built UI components
- **Wouter** for client-side routing instead of React Router for lightweight navigation
- **TanStack Query** for server state management, caching, and API data fetching
- **Zustand** with persistence for client-side state management, particularly authentication state
- **React Hook Form** with Zod validation for form handling and input validation

## Backend Architecture
- **Express.js** server with TypeScript for the REST API layer
- **Drizzle ORM** with PostgreSQL schema definitions for type-safe database operations
- **JWT-based authentication** with bcrypt for password hashing and session management
- **Multer** for handling multipart file uploads with memory storage
- **RESTful API design** with structured routes for products, authentication, and file uploads

## Data Storage Solutions
- **PostgreSQL** as the primary database using Neon serverless PostgreSQL
- **Google Cloud Storage** for multimedia file storage (images, PDFs, videos, audio)
- **Drizzle migrations** for database schema management and version control

## Authentication and Authorization
- **JWT token-based authentication** with configurable expiration times
- **Bcrypt password hashing** for secure credential storage
- **Middleware-based route protection** for API endpoints
- **Persistent authentication state** using Zustand with localStorage

## File Management System
- **Multi-format file support** including images (PNG, JPEG, WebP), PDFs, videos (MP4), and audio (MP3)
- **File size validation** with 50MB upload limit
- **Automatic file type validation** with MIME type checking
- **Public URL generation** for uploaded files with Google Cloud Storage integration
- **Drag-and-drop upload interface** with progress tracking

## Product Management Features
- **Comprehensive product schema** including SKU, pricing (USD with/without IVA), stock status, and technical specifications
- **Product family categorization** for organized catalog management
- **Bulk pricing operations** with percentage-based updates across product families
- **Advanced search and filtering** capabilities across multiple product attributes
- **Pagination support** for large product catalogs
- **Complete multimedia management** with modal interface for uploading, viewing, and deleting product files

## Reporting and Analytics System
- **Interactive charts with Recharts** for data visualization
- **Inventory summary** with total value calculations
- **Price trend analysis** with customizable date ranges
- **Family distribution charts** showing stock status by product family
- **CSV export functionality** for all report data
- **Interactive date range picker** with Spanish localization
- **Real-time filtering** by product families

## User Role Management System
- **Three-tier permission model**: Admin, Editor, Viewer
- **Admin capabilities**: Full access including user management and system configuration
- **Editor capabilities**: Create, edit, delete products; view reports
- **Viewer capabilities**: Read-only access to products and reports
- **User management page**: Create users, change roles, activate/deactivate accounts
- **Security enforcement**: Role validation in both frontend and backend
- **Account status control**: Deactivated users cannot access the system

## Automated Inventory Alert System
- **Automatic low stock detection** with configurable thresholds per product
- **Email notifications** using SendGrid integration
- **Daily and weekly digest emails** with inventory summaries
- **Deduplication logic** to prevent alert spam (24-hour window)
- **Manual trigger options** for immediate stock checks
- **Alert configuration page** for administrators only
- **Visual indicators** in product table and dashboard for low stock items
- **Complete notification history** with filtering and search

## Bulk Import/Export System
- **Excel (.xlsx) and CSV support** for mass product management
- **Export functionality** with column selection and filters
- **Import with validation** including duplicate SKU detection
- **Batch processing** for large datasets (200 products per batch)
- **Preview mode** with error detection before import
- **Downloadable templates** with examples and instructions
- **Import modes** supporting create-only or update-existing
- **Detailed import reports** showing successes and failures

## Barcode Scanning System
- **Camera-based scanning** using @zxing/browser library
- **Multiple barcode formats** supported (EAN-13, Code 128, QR codes)
- **Three capture methods**: live camera, manual entry, image upload
- **Quick stock adjustment** controls (+1, -1, set quantity)
- **Smart product lookup** by barcode with create-new fallback
- **Mobile-optimized interface** with responsive design
- **Role-based access** restricted to admin and editor users
- **Integration with import/export** system for barcode field

## API Structure
- `/api/auth/*` - Authentication endpoints (login, logout, user verification)
- `/api/products/*` - Product CRUD operations with filtering and pagination
- `/api/stats/*` - Dashboard statistics and analytics endpoints
- `/api/upload/*` - File upload and multimedia management endpoints
- `/api/reports/*` - Advanced reporting and analytics endpoints (inventory summary, price trends, family distribution)
- `/api/users/*` - User management endpoints (list, create, update role, activate/deactivate)
- `/api/alerts/*` - Alert configuration and notification endpoints (config, notifications, test, manual triggers)

# External Dependencies

## Database Services
- **Neon PostgreSQL** - Serverless PostgreSQL database hosting
- **Drizzle Kit** - Database migration and schema management tools

## Cloud Storage
- **Google Cloud Storage** - File storage service for multimedia assets
- **Google Cloud SDK** - Authentication and API integration for GCS operations

## UI Framework
- **shadcn/ui** - Pre-built component library based on Radix UI primitives
- **Radix UI** - Unstyled, accessible UI component primitives
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Recharts** - Composable charting library for React with animations

## Development Tools
- **Vite** - Frontend build tool and development server
- **TypeScript** - Static type checking for both frontend and backend
- **ESBuild** - Fast JavaScript bundler for production builds

## Authentication & Security
- **jsonwebtoken** - JWT token generation and verification
- **bcrypt** - Password hashing and comparison utilities
- **Environment-based credentials** - Secure admin credentials via environment variables (DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_EMAIL)
- **No hardcoded secrets** - All sensitive data managed through environment variables

## File Processing
- **Multer** - Express middleware for handling multipart/form-data uploads
- **UUID** - Unique identifier generation for file naming and organization