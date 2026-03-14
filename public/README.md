# Admin Dashboard - Modular Structure

This admin dashboard follows a modular architecture for better maintainability and scalability.

## File Structure

```
public/
├── index.html              # Login page
├── dashboard.html          # Main dashboard (overview)
├── users.html             # User management page
├── packages.html          # Balance package management page
├── logs.html              # Activity logs page
├── css/
│   ├── style.css          # Login page styles
│   ├── common.css         # Shared styles (sidebar, forms, tables, buttons)
│   └── dashboard.css      # Legacy styles (kept for compatibility)
└── js/
    ├── admin.js           # Legacy admin utilities
    ├── common.js          # Shared utilities (auth, API, navigation)
    ├── users.js           # User management logic
    ├── packages.js        # Package management logic
    └── logs.js            # Activity logs logic
```

## Pages Overview

### 1. Dashboard (dashboard.html)
- Overview statistics (total users, synced, pending)
- Quick action buttons
- Recent activity feed
- Main navigation hub

### 2. User Management (users.html)
- Create new users
- View all users in a table
- Reset user passwords
- Delete users
- User sync status

### 3. Balance Packages (packages.html)
- Assign balance packages to users
- View available packages
- Package assignment history
- User and package dropdowns

### 4. Activity Logs (logs.html)
- Password reset request logs
- Balance sync logs
- IP address tracking
- Timestamp information

## Shared Components

### common.css
Provides consistent styling across all pages:
- Sidebar navigation
- Page layouts
- Forms and inputs
- Buttons (primary, secondary, danger, warning)
- Tables
- Badges and status indicators
- Messages (success, error)
- Responsive design

### common.js
Shared JavaScript utilities:
- `checkAuth()` - Verify user authentication
- `getAdminInfo()` - Get admin username and token
- `logout()` - Clear session and redirect to login
- `apiRequest(endpoint, method, body)` - Make authenticated API calls
- `showMessage(elementId, message, type)` - Display success/error messages
- `setActiveNav(pageName)` - Highlight active navigation item
- `initPage(pageName)` - Initialize page with auth check and navigation

## Navigation

All pages share a consistent sidebar navigation:
- Dashboard
- User Management
- Balance Packages
- Activity Logs
- Logout button

The active page is automatically highlighted in the navigation.

## API Endpoints Used

### User Management
- `GET /admin/users` - List all users
- `POST /admin/users/create` - Create new user
- `PUT /admin/users/:id/password` - Reset user password
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/stats` - Get user statistics

### Package Management
- `GET /admin/packages` - List all packages
- `POST /admin/packages/assign` - Assign package to user
- `GET /admin/users/:userId/packages` - Get user's packages

### Activity Logs
- `GET /admin/password-reset-logs` - Get password reset logs
- `GET /admin/balance-sync-logs` - Get balance sync logs

## Authentication

All pages (except login) require JWT authentication:
1. Token stored in `localStorage.adminToken`
2. Username stored in `localStorage.adminUsername`
3. Token sent in `Authorization: Bearer <token>` header
4. Automatic redirect to login if token missing

## Best Practices

### Adding New Pages
1. Create HTML file with sidebar navigation
2. Include `common.css` for styling
3. Include `admin.js` and `common.js` for utilities
4. Create dedicated JS file for page logic
5. Call `initPage('filename.html')` at start
6. Add navigation link to all pages

### Adding New Features
1. Add backend endpoint in appropriate controller
2. Add route in `admin.js` or `api.js`
3. Create/update page-specific JS file
4. Use `apiRequest()` for API calls
5. Use `showMessage()` for user feedback
6. Follow existing patterns for consistency

### Styling Guidelines
- Use existing classes from `common.css`
- Follow color scheme: primary (#667eea), success (#d4edda), danger (#f8d7da)
- Use `.section` for content blocks
- Use `.data-table` for tables
- Use `.badge` for status indicators
- Use `.btn` classes for buttons

### Code Organization
- Keep page-specific logic in dedicated JS files
- Use common.js for shared utilities
- Avoid inline styles and scripts
- Use data attributes for dynamic elements
- Add event listeners after DOM creation

## Migration Notes

This modular structure replaces the previous monolithic `dashboard.html` that contained all functionality in one file. The new structure:
- Separates concerns by feature
- Improves code maintainability
- Reduces page load times
- Makes debugging easier
- Enables team collaboration
- Follows modern web development practices
