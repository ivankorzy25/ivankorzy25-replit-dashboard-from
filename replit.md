# Overview

This is a KOR Dashboard web application built as a product management system for an industrial equipment company. The application provides a complete CRUD interface for managing product catalogs, multimedia assets, and pricing information with Google Cloud Storage integration for file handling.

# User Preferences

Preferred communication style: Simple, everyday language.

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

## API Structure
- `/api/auth/*` - Authentication endpoints (login, logout, user verification)
- `/api/products/*` - Product CRUD operations with filtering and pagination
- `/api/stats/*` - Dashboard statistics and analytics endpoints
- `/api/upload/*` - File upload and multimedia management endpoints

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

## Development Tools
- **Vite** - Frontend build tool and development server
- **TypeScript** - Static type checking for both frontend and backend
- **ESBuild** - Fast JavaScript bundler for production builds

## Authentication & Security
- **jsonwebtoken** - JWT token generation and verification
- **bcrypt** - Password hashing and comparison utilities

## File Processing
- **Multer** - Express middleware for handling multipart/form-data uploads
- **UUID** - Unique identifier generation for file naming and organization