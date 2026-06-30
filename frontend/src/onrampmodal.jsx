import React, { useEffect, useRef, useState } from 'react';
import { loadStripeOnramp } from '@stripe/crypto';

const STRIPE_PUBLISHABLE_KEY = "pk_test_51TjK2CPzeMv2JZlDBr7IheLGpdBWG5lu594IbGvm2V71GVosnWAGlQeiQDJVhla4UFSAaF6rMLZq1Maw282qFjxi00wo6t8443"; // ⚠️ À Remplacer
const BACKEND_URL = ""; 

export default function OnrampModal({ isOpen, onClose, walletAddress, isDarkMode }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!isOpen) return;
    async function init() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/onramp/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        });
        const data = await res.json();
        const stripe = await loadStripeOnramp(STRIPE_PUBLISHABLE_KEY);
        const session = stripe.createSession({ clientSecret: data.clientSecret });
        session.mount(containerRef.current);
        setStatus('ready');
      } catch (err) { setStatus('error'); }
    }
    init();
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1C1C1E', padding: '20px', borderRadius: '20px', width: '460px' }}>
        <div ref={containerRef} style={{ minHeight: '480px' }} />
      </div>
    </div>
  );
}
