## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aloeshield-disease-detection
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration:
   ```
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   MONGODB_URI=mongodb://localhost:27017/aloeshield
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   ```

4. **Set up MongoDB**
   ```bash
   # Install MongoDB locally or use MongoDB Atlas
   # The application will create collections automatically
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Deployment

1. **Install dependencies**
   ```bash
   npm install --production
   ```

2. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   # Set other production variables
   ```

3. **Start the server**
   ```bash
   npm start
   ```

## Project Structure

```
aloeshield/
├── backend/                    # Backend API server
│   ├── routes/                # API route handlers
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── analysis.js       # Disease analysis endpoints
│   │   ├── history.js        # Analysis history endpoints
│   │   ├── upload.js         # File upload endpoints
│   │   └── admin.js          # Admin panel endpoints
│   ├── middleware/           # Express middleware
│   │   └── auth.js          # JWT authentication middleware
│   ├── services/            # External service integrations
│   │   └── cloudinary.js    # Cloudinary cloud storage
│   ├── database/            # Database layer
│   │   └── database.js      # MongoDB connection and queries
│   └── server.js            # Main Express server
├── frontend/               # Frontend web application
│   ├── index.html          # Main application page
│   ├── login.html          # User authentication page
│   ├── admin.html          # Admin dashboard page
│   ├── styles.css          # Main application styles
│   ├── admin.css           # Admin panel styles
│   ├── app.js              # Main application logic
│   └── admin.js            # Admin panel functionality
├── node_modules/           # NPM dependencies
├── .env                    # Environment configuration
├── .gitignore             # Git ignore rules
├── package.json           # Project dependencies and scripts
└── README.md              # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user account
- `POST /api/auth/login` - User login with credentials
- `GET /api/auth/verify` - Verify JWT token validity
- `POST /api/auth/logout` - User logout (optional)

### Context-Based Upload
- `POST /api/upload/analysis` - Upload image for disease analysis (10MB limit)
- `POST /api/upload/profile` - Upload profile/avatar image (5MB limit)
- `POST /api/upload/document` - Upload document files (20MB limit, supports PDFs)
- `GET /api/upload/context/:context` - Get uploads by context (analysis, profile, document)
- `DELETE /api/upload/:publicId` - Delete uploaded file from cloud and database

### Disease Analysis
- `POST /api/analysis/analyze` - Analyze uploaded image with placeholder AI
- `GET /api/analysis/:analysisId` - Get specific analysis by ID
- `DELETE /api/analysis/:analysisId` - Delete analysis and associated cloud image
- `GET /api/analysis/diseases/info` - Get comprehensive disease information database

### Analysis History
- `GET /api/history` - Get paginated analysis history for authenticated user
- Advanced filtering and search capabilities built-in

### Admin Panel
- `GET /api/admin/stats` - System statistics and analytics
- `GET /api/admin/users` - User management (admin only)
- `GET /api/admin/analyses` - All analyses overview (admin only)

## Color Scheme

The application uses an aloe vera-inspired color palette:

- **Primary**: `#4CAF50` (Aloe Green)
- **Secondary**: `#66BB6A` (Light Green)
- **Accent**: `#A5D6A7` (Soft Green)
- **Warning**: `#FFF9C4` (Cream/Yellow)
- **Text**: `#2E7D32` (Dark Green)
- **Background**: `#FFFFFF` (White)

## Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework with middleware
- **MongoDB** - NoSQL database with collections
- **Mongoose** - MongoDB object modeling (optional)
- **JWT (jsonwebtoken)** - Authentication tokens
- **Cloudinary** - Cloud image storage and management
- **Multer + Multer-Storage-Cloudinary** - File upload handling
- **Helmet** - Security middleware with CSP
- **CORS** - Cross-origin resource sharing
- **bcryptjs** - Password hashing
- **UUID** - Unique identifier generation

### Frontend
- **Vanilla JavaScript ES6+** - Modern JavaScript without frameworks
- **CSS Grid & Flexbox** - Advanced layout systems
- **CSS Custom Properties** - Dynamic theming
- **Fetch API** - Modern HTTP requests
- **Web APIs** - FileReader, drag & drop, local storage
- **Progressive Enhancement** - Works without JavaScript

### Cloud Services
- **Cloudinary** - Image storage, transformation, and CDN
- **MongoDB Atlas** - Cloud database (production ready)

### Development & Security
- **Nodemon** - Development server with hot reload
- **Content Security Policy** - XSS protection
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Data sanitization
- **Environment Variables** - Secure configuration

## Security Features

### Authentication & Authorization
- **JWT Token Authentication** - Secure session management
- **Password Hashing** - bcryptjs with salt rounds
- **User Isolation** - All data tied to authenticated users
- **Token Verification** - Middleware protection on all routes

### File Upload Security
- **File Type Validation** - Only allowed image formats (JPEG, PNG, WebP)
- **Context-Based Size Limits** - Different limits per upload type
- **Cloudinary Integration** - Professional cloud storage security
- **Public ID Sanitization** - Prevent path traversal attacks

### Web Security
- **Content Security Policy** - Prevent XSS attacks
- **Helmet.js Security Headers** - HSTS, X-Frame-Options, etc.
- **CORS Configuration** - Controlled cross-origin requests
- **Input Sanitization** - All user inputs validated
- **NoSQL Injection Prevention** - Parameterized queries

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in .env file or kill existing process
   lsof -ti:3000 | xargs kill -9
   ```

2. **MongoDB connection errors**
   ```bash
   # Check MongoDB is running locally
   mongod --version
   # Or verify MongoDB Atlas connection string in .env
   ```

3. **Cloudinary upload failures**
   ```bash
   # Verify Cloudinary credentials in .env file
   # Check network connectivity
   # Ensure file size limits are respected
   ```

4. **Authentication issues**
   ```bash
   # Clear browser localStorage and sessionStorage
   # Verify JWT_SECRET is set in .env
   # Check token expiration settings
   ```

5. **Missing dependencies**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```
6. **Some dependencies still missing Even after reinstalling**
   ```bash
   # Install the missing dependency manually
   # The most common one that won't install properly is axios
   npm install axios
   ```
---