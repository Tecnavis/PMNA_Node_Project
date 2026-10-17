import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client'

// Images: retry a broken image at the other storage (Cloudinary ↔ StackCP) while the copy runs
import { installImageFallback } from './utils/imageUrl';
installImageFallback();

// Perfect Scrollbar
import 'react-perfect-scrollbar/dist/css/styles.css';

// Tailwind css
import './tailwind.css';

// i18n (needs to be bundled)
import './i18n';

// Router
import { RouterProvider } from 'react-router-dom';
import router from './router/index';

// Redux
import { Provider } from 'react-redux';
import store from './store/index';

// Send the login token with every backend request; go to login when the session expires
import { installAuthInterceptors } from './config/authInterceptor';
installAuthInterceptors();


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Suspense>
            <Provider store={store}>
                <RouterProvider router={router} />
            </Provider>
        </Suspense>
    </React.StrictMode>
);

