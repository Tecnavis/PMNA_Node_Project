// router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import { routes } from './routes';
import RequireAuth from '../components/RequireAuth';

const finalRoutes = routes.map((route) => {
    const wrapped = route.layout === 'blank'
        ? <BlankLayout>{route.element}</BlankLayout>
        : <RequireAuth><DefaultLayout>{route.element}</DefaultLayout></RequireAuth>;

    return {
        ...route,
        element: wrapped,
    };
});

const router = createBrowserRouter(finalRoutes);
export default router;
