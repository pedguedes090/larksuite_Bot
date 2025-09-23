# Dashboard Web Admin

A modern web-based admin dashboard for managing the Lark Bot system, built with React, Tailwind CSS, and Ant Design.

## Features

### 🎯 Dashboard Overview
- Real-time system statistics
- User count and admin count display
- Total money and commands tracking
- Recent users overview

### 👥 User Management
- View all registered users
- Grant/revoke admin privileges
- Set user money amounts
- Sortable and paginated user table
- Real-time user status display

### 🎨 Modern UI
- Built with Ant Design components
- Styled with Tailwind CSS
- Responsive design for all screen sizes
- Collapsible sidebar navigation
- Professional admin interface

## Setup

1. **Build the dashboard:**
   ```bash
   npm run build-dashboard
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the dashboard:**
   ```
   http://localhost:3000/admin?adminKey=admin123
   ```

## Authentication

The dashboard uses a simple admin key authentication system. In production, replace this with proper authentication.

- Default admin key: `admin123`
- Can be set via `ADMIN_KEY` environment variable

## API Endpoints

### Admin Routes (`/api/admin/`)

All endpoints require the `X-Admin-Key` header or `adminKey` query parameter.

- `GET /users` - Get all users
- `GET /stats` - Get system statistics
- `POST /set-admin` - Grant/revoke admin privileges
- `POST /set-money` - Set user money amount
- `GET /users/:userId` - Get specific user details

## Technology Stack

- **Frontend:** React 18, Ant Design 5, Tailwind CSS
- **Build Tool:** Vite
- **Backend:** Express.js API routes
- **Authentication:** Simple admin key system

## Development

### Dashboard Development
```bash
# Start dashboard in development mode
npm run dev-dashboard

# Build for production
npm run build-dashboard
```

### Project Structure
```
dashboard/
├── src/
│   ├── App.jsx          # Main dashboard component
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind CSS imports
├── public/              # Static assets
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dashboard dependencies
```

## Screenshots

### Dashboard Overview
![Dashboard Overview](https://github.com/user-attachments/assets/b0f0ee47-c933-43fa-8da4-391df3d0d546)

### User Management
![User Management](https://github.com/user-attachments/assets/2c3acc97-f394-4805-acb9-4eeecb76eff7)

## Security Notes

- Currently uses simple admin key authentication
- In production, implement proper OAuth/JWT authentication
- Add rate limiting for API endpoints
- Use HTTPS in production
- Validate all user inputs on the server side