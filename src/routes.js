import { index, route } from '@react-router/dev/routes';

// This catch-all route keeps the existing AppRoutes tree working while each
// page moves to a dedicated Framework route module in Step 1.5.
export default [index('routes/home.jsx'), route('*', 'routes/legacy.jsx')];
