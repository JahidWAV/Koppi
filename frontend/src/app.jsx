import React, { useState } from 'react';
import OnrampModal from './OnrampModal';

export default function App() {
  const [isOnrampOpen, setIsOnrampOpen] = useState(false);
  const user = { wallet: { address: "0x..." } }; // Exemple adresse wallet

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '50px' }}>
      <h1>Koppi Dashboard</h1>
      <button onClick={() => setIsOnrampOpen(true)} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        Add Money
      </button>

      <OnrampModal
        isOpen={isOnrampOpen}
        onClose={() => setIsOnrampOpen(false)}
        walletAddress={user.wallet.address}
        isDarkMode={true}
      />
    </div>
  );
}
