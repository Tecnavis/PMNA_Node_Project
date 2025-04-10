import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { Provider } from 'react-redux';

import router from './router/index';
import store from './store/index';
import Context  from './context/firebaseContext';
import './tailwind.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Suspense>
            <Provider store={store}>
                <Context>
                        <RouterProvider router={router} />
                </Context>
            </Provider>
        </Suspense>
    </React.StrictMode>
);
