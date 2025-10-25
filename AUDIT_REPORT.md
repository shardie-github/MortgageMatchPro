# Codebase Audit Report

**Generated:** 2025-10-25T21:18:44.305Z  
**Version:** 1.4.0

## Summary

| Metric | Value |
|--------|-------|
| Total Files | 0 |
| Total Lines | 0 |
| Dependencies | 72 |
| Unused Dependencies | 49 |
| Circular Dependencies | 0 |
| Duplicate Code Blocks | 25 |
| Quality Score | 45/100 |
| Bundle Size | 0KB |

## Recommendations

### Remove unused dependencies (high)
Found 49 unused dependencies

**Action:** Remove: react-native-screens, react-native-reanimated, react-native-vector-icons, react-native-svg, react-native-image-picker, react-native-document-picker, react-native-fs, react-native-share, react-native-pdf, react-native-camera, react-native-permissions, react-native-keychain, react-native-biometrics, @supabase/auth-helpers-nextjs, @supabase/auth-helpers-react, @supabase/auth-ui-react, @supabase/auth-ui-shared, react-hook-form, @hookform/resolvers, date-fns, react-native-calendars, react-native-modal, react-native-super-grid, react-native-skeleton-placeholder, react-native-snap-carousel, react-native-swipe-gestures, react-native-pull-to-refresh, react-native-device-info, react-native-network-info, react-native-background-job, react-native-push-notification, react-native-firebase, react-native-sqlite-storage, react-native-elements, react-native-ui-lib, @babel/core, @babel/preset-env, @babel/runtime, @react-native/eslint-config, @tsconfig/react-native, @types/react, @types/react-test-renderer, babel-jest, eslint, jest, metro-react-native-babel-preset, prettier, react-test-renderer, typescript

### Improve code quality (high)
Quality score 45/100 is below threshold

**Action:** Address linting errors and improve test coverage


## Detailed Analysis

### Dependencies
- **Total:** 72
- **Unused:** react-native-screens, react-native-reanimated, react-native-vector-icons, react-native-svg, react-native-image-picker, react-native-document-picker, react-native-fs, react-native-share, react-native-pdf, react-native-camera, react-native-permissions, react-native-keychain, react-native-biometrics, @supabase/auth-helpers-nextjs, @supabase/auth-helpers-react, @supabase/auth-ui-react, @supabase/auth-ui-shared, react-hook-form, @hookform/resolvers, date-fns, react-native-calendars, react-native-modal, react-native-super-grid, react-native-skeleton-placeholder, react-native-snap-carousel, react-native-swipe-gestures, react-native-pull-to-refresh, react-native-device-info, react-native-network-info, react-native-background-job, react-native-push-notification, react-native-firebase, react-native-sqlite-storage, react-native-elements, react-native-ui-lib, @babel/core, @babel/preset-env, @babel/runtime, @react-native/eslint-config, @tsconfig/react-native, @types/react, @types/react-test-renderer, babel-jest, eslint, jest, metro-react-native-babel-preset, prettier, react-test-renderer, typescript
- **Security Issues:** 0

### Architecture
- **Domains:** 10
- **File Distribution:** {
  "ai": 2,
  "billing": 2,
  "tenant": 0,
  "analytics": 1,
  "crm": 0,
  "integrations": 13,
  "ui": 0,
  "api": 5,
  "auth": 2,
  "monitoring": 2
}

### Performance
- **Bundle Size:** 0KB
- **Largest Files:** lib/agents/sustainable-products-agent.ts: 32KB, lib/testing/cross-border-sandbox.ts: 30KB, app/page.tsx: 26KB, components/dashboard/UserDashboard.tsx: 25KB, lib/agents/workflow-automation-agent.ts: 25KB

### Quality
- **Linting Errors:** 1
- **Type Errors:** 1
- **Test Coverage:** 0%
- **Complexity Issues:** 0
