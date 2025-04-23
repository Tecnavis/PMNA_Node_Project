import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import Context from './context/firebaseContext';


import 'react-perfect-scrollbar/dist/css/styles.css';
import './tailwind.css';
import './i18n';
import { RouterProvider } from 'react-router-dom';
import router from './router/index';
import { Provider } from 'react-redux';
import store from './store/index';

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
