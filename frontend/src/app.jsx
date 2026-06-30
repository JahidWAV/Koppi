import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useLoginWithEmail } from '@privy-io/react-auth';
import { loadStripeOnramp } from "@stripe/crypto";

// Initialise le SDK avec ta clé publique (remplace par ta vraie PK_TEST)
const stripeOnrampPromise = loadStripeOnramp("pk_test_51TjK2CPzeMv2JZlDBr7IheLGpdBWG5lu594IbGvm2V71GVosnWAGlQeiQDJVhla4UFSAaF6rMLZq1Maw282qFjxi00wo6t8443");

if (typeof document !== 'undefined') {
  const injectStaticStyle = () => {
    let styleTag = document.getElementById('koppi-core-bg');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'koppi-core-bg';
      styleTag.innerHTML = `html, body, #root { background-color: #000000 !important; color: #F5F5F7 !important; }`;
      document.head.appendChild(styleTag);
    }
  };
  injectStaticStyle();
}

const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd";

const Icons = {
  Overview: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H4v10a2 2 0 0 0 2 2h14v-4" />
      <path d="M16 12h5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z" />
      <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Markets: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Vault: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 2a7 7 0 0 0-7 7v2h14V9a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  ),
  Settings: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1-1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1-2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
};

function useWalletViewModel() {
  const { authenticated, user } = usePrivy();
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem("app_theme") || "Dark");
  const [currentCurrency, setCurrentCurrency] = useState(() => localStorage.getItem("app_currency") || "USD ($)");
  const [selectedTab, setSelectedTab] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0.00);
  const [liveUsdToEurRate, setLiveUsdToEurRate] = useState(0.92);
  const [rawPricesUSD, setRawPricesUSD] = useState({ BTC: 0, ETH: 0, USDT: 1, BNB: 0, USDC: 1, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });
  const [rawVariations24h, setRawVariations24h] = useState({ BTC: 0, ETH: 0, USDT: 0, BNB: 0, USDC: 0, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });

  const walletAddress = user?.wallet?.address;

  useEffect(() => { localStorage.setItem("app_theme", currentTheme); }, [currentTheme]);
  useEffect(() => { localStorage.setItem("app_currency", currentCurrency); }, [currentCurrency]);

  useEffect(() => {
    if (!authenticated || !walletAddress) return;
    const fetchBlockchainBalance = async () => {
      const rpcNodeUrl = "https://sepolia.base.org";
      const usdcContract = "0xD733D48f2a7F57D4559F98ae07f87Dab595E3523";
      const cleanAddress = walletAddress.replace("0x", "").toLowerCase();
      const paddedAddress = cleanAddress.padStart(64, "0");
      const dataParam = "0x70a08231" + paddedAddress;
      try {
        const response = await fetch(rpcNodeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_call",
            params: [{ to: usdcContract, data: dataParam }, "latest"], id: 1
          })
        });
        const json = await response.json();
        if (json.result && json.result !== "0x") {
          const hexValue = json.result.replace("0x", "");
          const rawValue = BigInt("0x" + hexValue);
          const formattedBalance = Number(rawValue) / Math.pow(10, 18);
          setUsdcBalance(formattedBalance);
        }
      } catch (error) {
        console.error("RPC Fetch Error:", error);
      }
    };
    fetchBlockchainBalance();
    const interval = setInterval(fetchBlockchainBalance, 10000);
    return () => clearInterval(interval);
  }, [authenticated, walletAddress]);

  useEffect(() => {
    fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR")
      .then(res => res.json())
      .then(json => { if (json.rates?.EUR) setLiveUsdToEurRate(json.rates.EUR); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const streams = "btcusdt@ticker/ethusdt@ticker/usdcusdt@ticker/xrpusdt@ticker/solusdt@ticker/trxusdt@ticker/dogeusdt@ticker/bnbusdt@ticker";
    const bWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    bWs.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        const d = json.data;
        const tickerMapping = { BTCUSDT: "BTC", ETHUSDT: "ETH", USDCUSDT: "USDC", BNBUSDT: "BNB", XRPUSDT: "XRP", SOLUSDT: "SOL", TRXUSDT: "TRX", DOGEUSDT: "DOGE" };
        const ticker = tickerMapping[d.s];
        if (ticker) {
          setRawPricesUSD(prev => ({ ...prev, [ticker]: (ticker === "USDC" || ticker === "USDT") ? 1.0 : parseFloat(d.c) }));
          setRawVariations24h(prev => ({ ...prev, [ticker]: parseFloat(d.P) }));
        }
      } catch(e) {}
    };
    return () => { bWs.close(); };
  }, []);

  const assets = useMemo(() => {
    const fx = liveUsdToEurRate;
    const structure = [
      { id: "bitcoin",     name: "Bitcoin",  ticker: "BTC",  color: "#F7931A", balance: 0.0 },
      { id: "ethereum",    name: "Ethereum", ticker: "ETH",  color: "#627EEA", balance: 0.0 },
      { id: "tether",      name: "Tether",   ticker: "USDT", color: "#26A17B", balance: 0.0 },
      { id: "binancecoin", name: "BNB",      ticker: "BNB",  color: "#F3BA2F", balance: 0.0 },
      { id: "usd-coin",    name: "USDC",     ticker: "USDC", color: "#2775CA", balance: usdcBalance },
      { id: "ripple",      name: "XRP",      ticker: "XRP",  color: "#23292F", balance: 0.0 },
      { id: "solana",      name: "Solana",   ticker: "SOL",  color: "#14F195", balance: 0.0 },
      { id: "tron",        name: "TRON",     ticker: "TRX",  color: "#EC0928", balance: 0.0 },
      { id: "dogecoin",    name: "Dogecoin", ticker: "DOGE", color: "#BA9F33", balance: 0.0 }
    ];
    return structure.map(a => {
      const priceUSD = rawPricesUSD[a.ticker] || 0;
      return { ...a, priceUSD, priceEUR: priceUSD * fx, change24h: rawVariations24h[a.ticker] || 0, realBalance: a.balance };
    });
  }, [rawPricesUSD, rawVariations24h, usdcBalance, liveUsdToEurRate]);

  const totalBalanceCalculated = useMemo(() => {
    const totalUSD = assets.reduce((sum, asset) => sum + (asset.realBalance * asset.priceUSD), 0);
    return currentCurrency.includes("USD") ? totalUSD : totalUSD * liveUsdToEurRate;
  }, [assets, currentCurrency, liveUsdToEurRate]);

  return { currentTheme, setCurrentTheme, currentCurrency, setCurrentCurrency, selectedTab, setSelectedTab, assets, totalBalanceCalculated, transactions: [] };
}

function KoppiApp() {
  const { authenticated, user, logout, ready } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const vm = useWalletViewModel();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  const isDarkMode = vm.currentTheme === "Dark";
  const currencySymbol = vm.currentCurrency.includes("EUR") ? "€" : "$";

  const bg = isDarkMode ? "#000000" : "#F5F5F7";
  const text = isDarkMode ? "#F5F5F7" : "#1D1D1F";
  const cardBg = isDarkMode ? "#1C1C1E" : "#FFFFFF";
  const border = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const secondaryText = isDarkMode ? "#8E8E93" : "#86868B";
  const glassNavbarBg = isDarkMode ? "rgba(28, 30, 36, 0.70)" : "rgba(255, 255, 255, 0.75)";
  const glassNavbarBorder = isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";

  useEffect(() => {
    document.body.style.backgroundColor = bg;
    document.documentElement.style.backgroundColor = bg;
  }, [bg]);

  const acquiredAssets = useMemo(() => vm.assets.filter(asset => asset.realBalance > 0), [vm.assets]);

  const handleSendCode = async () => {
    if (!email.includes('@')) return;
    try { await sendCode({ email: email.trim().toLowerCase() }); setStep('otp'); } catch(e) {}
  };

  const handleVerifyCode = async () => {
    if (code.trim().length !== 6) return;
    try { await loginWithCode({ code: code.trim() }); } catch(e) {}
  };

  const handleLogout = async () => {
    try { await logout(); localStorage.clear(); setStep('email'); setEmail(''); setCode(''); window.location.reload(); } catch(e) {}
  };

const handleAddMoney = async () => {
    console.log("Tentative d'appel API...");
    try {
      const response = await fetch('/api/onramp-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: user?.wallet?.address })
      });

      // On vérifie si la réponse est bien du JSON avant de parser
      const text = await response.text(); 
      console.log("Réponse brute du serveur:", text);

      const data = JSON.parse(text);
      if (!data.clientSecret) throw new Error("Pas de clientSecret reçu");

      const onramp = await stripeOnrampPromise;
      const session = onramp.createSession({ clientSecret: data.clientSecret });
      session.mount("#onramp-element");
    } catch (e) {
      console.error("Détail de l'erreur:", e);
    }
  };

  // --- LOADING ---
  if (!ready) {
    return (
      <div style={{ backgroundColor: "#000000", color: "#F5F5F7", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '400', fontSize: '20px', animation: 'pulse 1.8s infinite ease-in-out' }}>KOPPI</div>
        <style>{`@keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  // --- RENDU 1 : LOGIN ---
  if (!authenticated) {
    return (
      <div style={{ backgroundColor: '#000000', color: '#F5F5F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
        <div style={{ backgroundColor: '#000000', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '48px 40px', borderRadius: '24px', maxWidth: '390px', width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.8)', animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          <div style={{ letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '400', fontSize: '14px', color: '#8E8E93', marginBottom: '12px' }}>KOPPI NODE</div>
          <h2 style={{ fontSize: '32px', fontWeight: '300', marginBottom: '8px', letterSpacing: '-1px', color: '#F5F5F7' }}>Access Gate</h2>
          <p style={{ color: '#8E8E93', fontSize: '13px', marginBottom: '36px', lineHeight: '1.4' }}>Connect your decentralized parameters to secure stablecoin infrastructure.</p>

          {step === 'email' ? (
            <div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                placeholder="Enter network email address"
                style={{ width: '100%', height: '46px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '0 16px', fontSize: '14px', color: '#F5F5F7', textAlign: 'center', outline: 'none', marginBottom: '18px', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#0A58CA'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
              />
              <button onClick={handleSendCode} style={{ width: '100%', height: '46px', background: '#F5F5F7', color: '#000000', fontWeight: '500', borderRadius: '23px', border: 'none', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' }}>
                Request OTP Key
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#8E8E93', fontSize: '12px', marginBottom: '16px' }}>Code sent to <strong style={{ color: '#F5F5F7' }}>{email}</strong></p>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                placeholder="000000"
                maxLength="6"
                style={{ width: '100%', height: '46px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '0 16px', fontSize: '20px', fontWeight: '500', letterSpacing: '6px', color: '#F5F5F7', textAlign: 'center', outline: 'none', marginBottom: '18px', boxSizing: 'border-box' }}
              />
              <button onClick={handleVerifyCode} style={{ width: '100%', height: '46px', background: '#0A58CA', color: '#FFFFFF', fontWeight: '500', borderRadius: '23px', border: 'none', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 14px rgba(10, 88, 202, 0.4)', marginBottom: '12px' }}>
                Authorize Connection
              </button>
              <button onClick={() => { setStep('email'); setCode(''); }} style={{ background: 'transparent', border: 'none', color: '#8E8E93', cursor: 'pointer', fontSize: '12px' }}>
                ← Change email
              </button>
            </div>
          )}
        </div>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // --- RENDU 2 : DASHBOARD ---
  return (
    <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', transition: 'background-color 0.4s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '24px 0 0' }}>

        <div style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', padding: '0 24px', position: 'sticky', top: '16px', zIndex: 100 }}>
          <header style={{ height: '54px', border: `1px solid ${glassNavbarBorder}`, backgroundColor: glassNavbarBg, backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRadius: '27px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: isDarkMode ? '0 12px 40px 0 rgba(0, 0, 0, 0.5)' : '0 12px 40px 0 rgba(0, 0, 0, 0.03)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '2px', color: text }}>KOPPI</div>
            <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[
                { id: 0, label: "Overview", icon: Icons.Overview },
                { id: 1, label: "Markets",  icon: Icons.Markets  },
                { id: 2, label: "Vault",    icon: Icons.Vault    },
                { id: 3, label: "Settings", icon: Icons.Settings }
              ].map(t => {
                const isSelected = vm.selectedTab === t.id && !selectedAssetDetail;
                return (
                  <button key={t.id} onClick={() => { setSelectedAssetDetail(null); vm.setSelectedTab(t.id); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', fontSize: '13px', fontWeight: isSelected ? '500' : '400', cursor: 'pointer', padding: '8px 18px', borderRadius: '20px', background: isSelected ? '#0A58CA' : 'transparent', color: isSelected ? '#FFFFFF' : secondaryText, boxShadow: isSelected ? '0 4px 14px 0 rgba(10, 88, 202, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)' : 'none', transition: 'all 0.15s ease-in-out' }}>
                    <t.icon /> <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
            <div style={{ fontSize: '11px', color: secondaryText, fontFamily: 'monospace', padding: '5px 12px', borderRadius: '14px', border: `1px solid ${glassNavbarBorder}` }}>
              {user?.wallet?.address ? user.wallet.address.substring(0, 6) + '...' + user.wallet.address.substring(user.wallet.address.length - 4) : "0x00...0000"}
            </div>
          </header>
        </div>

        <main style={{ flex: 1, padding: '70px 40px', margin: '0 auto', width: '100%', maxWidth: '1120px' }}>
          {selectedAssetDetail ? (
            <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
              <button onClick={() => setSelectedAssetDetail(null)} style={{ background: 'none', border: 'none', color: secondaryText, fontSize: '13px', cursor: 'pointer', marginBottom: '32px' }}>✕ Close Detail</button>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '40px', textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-1px', marginBottom: '6px' }}>{selectedAssetDetail.name}</h2>
                <div style={{ fontSize: '14px', color: secondaryText, fontFamily: 'monospace', marginBottom: '32px' }}>{selectedAssetDetail.ticker} Assets</div>
                <div style={{ fontSize: '42px', fontWeight: '300', letterSpacing: '-1.5px', marginBottom: '8px' }}>
                  {selectedAssetDetail.ticker === 'USDC' ? selectedAssetDetail.realBalance.toFixed(2) : selectedAssetDetail.realBalance}
                  <span style={{ fontSize: '20px', color: secondaryText }}> {selectedAssetDetail.ticker}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#10B981', fontWeight: '500', marginBottom: '40px' }}>
                  ≈ {vm.currentCurrency.includes("EUR") ? (selectedAssetDetail.priceEUR * selectedAssetDetail.realBalance).toFixed(2) + '€' : (selectedAssetDetail.priceUSD * selectedAssetDetail.realBalance).toFixed(2) + '$'}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button style={{ height: '40px', padding: '0 24px', background: text, color: bg, fontWeight: '500', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Buy</button>
                  <button style={{ height: '40px', padding: '0 24px', background: 'transparent', color: text, fontWeight: '500', borderRadius: '20px', border: `1px solid ${border}`, cursor: 'pointer', fontSize: '13px' }}>Send</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {vm.selectedTab === 0 && (
                <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0 60px', textAlign: 'center' }}>
                    <div style={{ fontSize: '46px', fontWeight: '300', letterSpacing: '-1.5px', fontFamily: '-apple-system, sans-serif', color: text, marginBottom: '24px' }}>
                      {vm.totalBalanceCalculated.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currencySymbol}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
  onClick={handleAddMoney} 
  style={{ height: '38px', padding: '0 22px', background: text, color: bg, fontWeight: '500', borderRadius: '19px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
>
  Add Money
</button>

{/* Ajoute ce conteneur pour afficher l'interface Stripe */}
<div id="onramp-element" style={{ marginTop: '20px', width: '100%', maxWidth: '400px', margin: '20px auto 0' }}></div>
                      <button style={{ height: '38px', padding: '0 22px', background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: text, fontWeight: '500', borderRadius: '19px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Transfer</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '48px' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '500', color: secondaryText, marginBottom: '16px' }}>Assets</h3>
                      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', overflow: 'hidden' }}>
                        {acquiredAssets.length === 0
                          ? <div style={{ padding: '32px', textAlign: 'center', color: secondaryText, fontSize: '13px' }}>No stablecoin balances found on this active node.</div>
                          : acquiredAssets.map((asset, i) => (
                            <div key={asset.id} onClick={() => setSelectedAssetDetail(asset)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < acquiredAssets.length - 1 ? `1px solid ${border}` : 'none', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: asset.color }} />
                                <div>
                                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{asset.name}</div>
                                  <div style={{ fontSize: '12px', color: secondaryText }}>{asset.ticker === 'USDC' ? asset.realBalance.toFixed(2) : asset.realBalance} {asset.ticker}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>{vm.currentCurrency.includes("EUR") ? (asset.priceEUR * asset.realBalance).toFixed(2) + '€' : (asset.priceUSD * asset.realBalance).toFixed(2) + '$'}</div>
                                <div style={{ fontSize: '11px', color: asset.change24h >= 0 ? '#10B981' : '#EF4444' }}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '500', color: secondaryText, marginBottom: '16px' }}>Activity</h3>
                      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', color: secondaryText }}>No transaction logs detected on Base Sepolia.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {vm.selectedTab === 1 && (
                <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '24px', letterSpacing: '-0.5px' }}>Markets</h2>
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '0 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: secondaryText }}>🔍</span>
                    <input type="text" placeholder="Search tokens..." style={{ width: '100%', height: '44px', border: 'none', background: 'transparent', outline: 'none', color: text, fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {vm.assets.map(asset => (
                      <div key={asset.id} onClick={() => setSelectedAssetDetail(asset)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', cursor: 'pointer' }}>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{asset.ticker} <span style={{ fontWeight: '400', color: secondaryText, marginLeft: '6px', fontSize: '13px' }}>{asset.name}</span></div>
                        <div style={{ fontWeight: '400', fontSize: '14px', fontFamily: 'monospace' }}>{asset.priceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {vm.selectedTab === 2 && (
                <div style={{ textAlign: 'center', padding: '100px 0', maxWidth: '400px', margin: '0 auto', animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>Vault Security</h2>
                  <p style={{ color: secondaryText, fontSize: '14px', lineHeight: '1.5' }}>Your asset lockers are operating under end-to-end multi-party encryption layers.</p>
                </div>
              )}

              {vm.selectedTab === 3 && (
                <div style={{ maxWidth: '500px', margin: '0 auto', animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '24px', letterSpacing: '-0.5px' }}>Settings</h2>
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: secondaryText, fontWeight: '500', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Interface Theme</label>
                      <select value={vm.currentTheme} onChange={e => vm.setCurrentTheme(e.target.value)} style={{ width: '100%', height: '40px', background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0 10px', color: text, outline: 'none', fontSize: '13px' }}>
                        <option value="Dark">Dark Mode</option>
                        <option value="Light">Light Mode</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: secondaryText, fontWeight: '500', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Display Currency</label>
                      <select value={vm.currentCurrency} onChange={e => vm.setCurrentCurrency(e.target.value)} style={{ width: '100%', height: '40px', background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0 10px', color: text, outline: 'none', fontSize: '13px' }}>
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                      </select>
                    </div>
                    <hr style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '8px 0' }} />
                    <button onClick={handleLogout} style={{ width: '100%', height: '44px', background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2', color: '#EF4444', fontWeight: '500', borderRadius: '22px', border: 'none', cursor: 'pointer', fontSize: '12px', transition: 'background-color 0.2s' }}>
                      Disconnect Account
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default KoppiApp;
