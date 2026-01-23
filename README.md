# ITCPR Portal - React Version

This is the React.js conversion of the ITCPR Portal website. The UI and theme have been preserved exactly as in the original.

## Project Structure

```
react-portal/
├── public/
│   ├── assets/          # All images and static assets
│   └── manifest.json     # PWA manifest
├── src/
│   ├── components/      # Reusable React components
│   │   ├── Layout.jsx   # Main layout with Navbar and Sidebar
│   │   ├── Navbar.jsx   # Top navigation bar
│   │   ├── Sidebar.jsx  # Side navigation menu
│   │   └── LoadingOverlay.jsx
│   ├── contexts/        # React contexts
│   │   └── AuthContext.jsx  # Firebase authentication context
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── utils/           # Utility functions
│   │   ├── helpers.js
│   │   ├── github.js
│   │   └── discord.js
│   ├── css/             # All CSS files (copied from original)
│   ├── config.js        # Firebase and Supabase configuration
│   ├── App.jsx          # Main app component with routing
│   └── main.jsx         # Entry point
└── package.json
```

## Features

- ✅ Complete React conversion with same UI/theme
- ✅ Firebase authentication with SSO
- ✅ React Router for navigation
- ✅ All original CSS styles preserved
- ✅ Dashboard page fully converted
- ✅ Layout components (Navbar, Sidebar) converted
- ✅ Authentication context and hooks

## Installation

```bash
cd react-portal
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

## Pages Status

### ✅ Fully Converted
- Login page
- Dashboard page
- Layout components (Navbar, Sidebar)

### ⏳ Placeholder Components (Need Full Conversion)
- Group
- Projects / Project
- Meetings / Meeting
- People
- Guides / Guide
- Tools
- Profile
- Calendar
- Evaluation
- Activity
- Application
- Admin
- Manager
- Server
- Course
- Discord
- Privacy
- Filter

## Converting Remaining Pages

To convert the remaining pages:

1. Read the corresponding HTML file from the original project
2. Read the corresponding JS file (e.g., `js/projects.js`)
3. Convert the HTML structure to JSX
4. Convert the JavaScript logic to React hooks (useState, useEffect)
5. Use the `useAuth()` hook to access user data
6. Import necessary CSS files
7. Use React Router's `useNavigate()` for navigation

## Key Differences from Original

1. **Routing**: Uses React Router instead of separate HTML files
2. **State Management**: Uses React hooks instead of global variables
3. **Authentication**: Centralized in AuthContext
4. **Components**: Modular React components instead of DOM manipulation
5. **Imports**: ES6 modules instead of script tags

## Dependencies

- React 19.1.1
- React Router DOM 7.9.5
- Firebase 12.5.0
- Luxon 3.7.2 (for date/time handling)
- Marked 17.0.0 (for markdown parsing)
- Vite 7.1.7 (build tool)

## Notes

- All CSS files have been preserved exactly as they were
- Asset paths have been updated to work with Vite's public folder
- Firebase configuration is in `src/config.js`
- The authentication flow remains the same (SSO login)
