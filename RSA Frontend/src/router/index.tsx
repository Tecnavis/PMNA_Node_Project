import { createHashRouter } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import { routes } from './routes';
import PageErrorBoundary from '../components/PageErrorBoundary';

const finalRoutes = routes.map((route) => {
    return {
        ...route,
        element: route.layout === 'blank'
            ? <BlankLayout><PageErrorBoundary>{route.element}</PageErrorBoundary></BlankLayout>
            : <DefaultLayout><PageErrorBoundary>{route.element}</PageErrorBoundary></DefaultLayout>,
    };
});

const router = createHashRouter(finalRoutes);

export default router;