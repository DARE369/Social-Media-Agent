import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/router';
import { ThemeProvider } from './Context/ThemeContext';
import { AuthProvider } from './Context/AuthContext';
import './styles/theme.css'; // Base theme styles (light/dark)
import './styles/variables.css';
import './styles/global.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider
          router={router}
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
