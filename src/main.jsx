import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
// 🌟 La correction est ici : on importe usePasswordlessAuth pour découpler l'UI custom
import { PrivyProvider, usePrivy, usePasswordlessAuth } from '@privy-io/react-auth';

const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd"; 

function KoppiApp() {
  const { authenticated, user, logout } = usePrivy();
  
  // 🌟 On récupère les vraies méthodes d'envoi et de vérification Headless ici :
  const { initLoginWithCode, loginWithCode } = usePasswordlessAuth();
  
  const [view, setView] = useState('landing'); // 'landing' ou 'portal'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // 'email' ou 'otp'
  const [status, setStatus] = useState('');

  // Déclenchement de l'envoi de l'e-mail
  const handleSendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setStatus("Please enter a valid email address.");
      return;
    }
    
    setStatus("Sending...");
    try {
      // 🚀 Appel de la vraie fonction d'initialisation du SDK client
      await initLoginWithCode({ email: cleanEmail });
      setStep('otp');
      setStatus("Verification code generated.");
    } catch (err) {
      console.error("Privy Error:", err);
      setStatus(err?.message || "Error sending verification code.");
    }
  };

  // Validation du code OTP à 6 chiffres
  const handleVerifyCode = async () => {
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) return;
    
    setStatus("Verifying...");
    try {
      // 🚀 Appel de la vraie fonction de validation
      await loginWithCode({ email: email.trim().toLowerCase(), code: cleanCode });
    } catch (err) {
      console.error("Auth Error:", err);
      setStatus("Invalid code tokens.");
    }
  };

  const styles = {
    nav: { width: '100%', height: '80px', background: 'rgba(244,245,247,0.85)', backdropFilter: 'blur(20px)', position: 'fixed', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', borderBottom: '1px solid rgba(0,0,0,0.04)', zIndex: 100 },
    logo: { letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '20px' },
    btnCta: { height: '42px', padding: '0 24px', background: '#020202', color: '#fff', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', borderRadius: '21px', border: 'none', cursor: 'pointer' },
    mainWrapper: { maxWidth: '960px', width: '100%', margin: '0 auto', padding: '160px 24px 80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    heroSection: { textAlign: 'center', maxWidth: '640px', marginBottom: '80px' },
    badge: { display: 'inline-block', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', padding: '6px 14px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '24px' },
    h1: { fontSize: '48px', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '20px', lineHeight: 1.15 },
    heroDesc: { fontSize: '18px', color: '#666', marginBottom: '32px' },
    appContainer: { maxWidth: '400px', width: '100%', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '40px', paddingTop: '80px' },
    appCard: { background: '#fff', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '28px', padding: '42px 32px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' },
    inputField: { width: '100%', height: '50px', background: 'rgba(0,0,0,0.03)', border: '1px solid transparent', borderRadius: '12px', padding: '0 16px', fontSize: '14px', marginBottom: '12px', textAlign: 'center', outline: 'none' },
    btnSubmit: { width: '100%', height: '50px', background: '#020202', color: '#fff', fontSize: '13px', fontWeight: '700', borderRadius: '25px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' },
    btnExit: { fontSize: '11px', fontWeight: '700', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }
  };

  if (view === 'landing') {
    return (
      <div>
        <nav style={styles.nav}>
          <div style={styles.logo}>Koppi</div>
          <button onClick={() => setView('portal')} style={styles.btnCta}>Open Web App</button>
        </nav>
        <main style={styles.mainWrapper}>
          <div style={styles.heroSection}>
            <div style={styles.badge}>⚡ Live on Base Sepolia</div>
            <h1 style={styles.h1}>Make stablecoins your everyday money</h1>
            <p style={styles.heroDesc}>Access USD, buy instantly, and spend globally using secure keyless infrastructure.</p>
            <button onClick={() => setView('portal')} style={{ ...styles.btnCta, height: '52px', padding: '0 36px', borderRadius: '26px' }}>Get Started</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...styles.logo, fontSize: '16px' }}>Koppi App</div>
        <button onClick={() => { if (authenticated) { logout(); location.reload(); } else { setView('landing'); } }} style={styles.btnExit}>
          {authenticated ? 'Disconnect' : 'Exit'}
        </button>
      </header>

      {!authenticated ? (
        <div style={styles.appCard}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Connect to Koppi</h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>Access your secure cryptographic balance safely via e-mail authorization.</p>
          
          {step === 'email' ? (
            <div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.inputField} placeholder="Enter your email address" />
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>{status}</div>
              <button onClick={handleSendCode} style={styles.btnSubmit}>Continue</button>
            </div>
          ) : (
            <div>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength="6" style={{ ...styles.inputField, fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px' }} placeholder="000000" />
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>{status}</div>
              <button onClick={handleVerifyCode} style={styles.btnSubmit}>Verify and Connect</button>
              <button onClick={() => setStep('email')} style={{ ...styles.btnExit, marginTop: '16px', width: '100%', fontWeight: '700' }}>Go Back</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={styles.appCard}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '16px' }}>🟢 Operational</div>
            <div style={{ fontSize: '46px', fontWeight: '800', color: '#020202' }}>
              1930<span style={{ fontSize: '24px', color: '#888', verticalAlign: 'super', fontWeight: '700' }}>.50$</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#b1b1b1', marginTop: '8px', marginBottom: '24px' }}>
              {user?.wallet?.address ? user.wallet.address.substring(0, 8).toUpperCase() + '...' + user.wallet.address.substring(user.wallet.address.length - 8).toUpperCase() : "0xAA41C6E8...595F3523"}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button style={{ ...styles.btnSubmit, height: '44px', borderRadius: '12px', fontSize: '12px' }}>Add Money</button>
              <button style={{ ...styles.btnSubmit, height: '44px', borderRadius: '12px', fontSize: '12px', background: 'rgba(0,0,0,0.04)', color: '#020202' }}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider appId={PRIVY_APP_ID} config={{ loginMethods: ['email'], embeddedWallets: { createOnLogin: 'users-without-wallets' } }}>
      <KoppiApp />
    </PrivyProvider>
  </React.StrictMode>
);
