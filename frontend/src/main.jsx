import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import KoppiApp from './app.jsx'; // Si le fichier est en minuscule

const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider 
      appId={PRIVY_APP_ID} 
      config={{ 
        loginMethods: ['email'], 
        embeddedWallets: { createOnLogin: 'users-without-wallets' } 
      }}
    >
      <KoppiApp />
    </PrivyProvider>
  </React.StrictMode>
);
