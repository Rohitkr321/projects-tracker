# GA Tracker Frontend

Expo React Native application for the General Aeronautics internal project tracker. It supports web and Android views, authenticated navigation, project dashboards, boards, backlog, sprints, issues, notifications, profile management, and invite-based registration.

## Stack

- Expo SDK 56
- React 19 and React Native 0.85
- React Native Paper
- React Navigation
- Redux Toolkit and RTK Query
- Socket.io client

## Setup

```bash
npm install
cp .env.example .env
```

Update `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_WS_URL=http://localhost:5000
EXPO_PUBLIC_APP_NAME=GA Tracker
```

## Scripts

```bash
npm start       # Expo dev server
npm run web     # Web app
npm run android # Android through Expo
npm run ios     # iOS through Expo
npm run tunnel  # Tunnel mode with cache clear
```

## Key Folders

```text
src/api/          RTK Query API clients
src/components/   Shared UI components and brand assets
src/navigation/   App, auth, tab, drawer, and project stack navigation
src/screens/      Web and native screens
src/store/        Redux slices
src/theme/        GA color and typography tokens
src/utils/        Date, storage, and helper utilities
```

## Branding

The app uses `src/components/common/BrandLogo.js` for the General Aeronautics wordmark and mark. Theme colors live in `src/theme/colors.js`.

## Validation

Useful local checks:

```bash
npx expo export --platform web --output-dir .expo-export-check
npx expo export --platform android --output-dir .expo-android-check
```

Remove those output directories after checking.
