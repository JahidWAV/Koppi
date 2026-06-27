import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useLoginWithEmail } from '@privy-io/react-auth';

const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd";

// --- HOOK DESKTOP DU WALLET VIEWMODEL (WebSocket + Logique iOS) ---
function useWalletViewModel() {
  const { authenticated, user, logout } = usePrivy();
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem("app_theme") || "Dark");
  const [currentCurrency, setCurrentCurrency] = useState(() => localStorage.getItem("app_currency") || "USD ($)");
  const [selectedTab, setSelectedTab] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(1930.50); // Fallback mock ou fetch sync
  const [liveUsdToEurRate, setLiveUsdToEurRate] = useState(0.92);

  const [rawPricesUSD, setRawPricesUSD] = useState({ BTC: 0, ETH: 0, USDT: 1, BNB: 0, USDC: 1, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });
  const [rawVariations24h, setRawVariations24h] = useState({ BTC: 0, ETH: 0, USDT: 0, BNB: 0, USDC: 0, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });

  // Synchro LocalStorage
  useEffect(() => { localStorage.setItem("app_theme", currentTheme); }, [currentTheme]);
  useEffect(() => { localStorage.setItem("app_currency", currentCurrency); }, [currentCurrency]);

  // Récupération Forex Rate (Frankfurter API)[cite: 2]
  useEffect(() => {
    fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR")
      .then(res => res.json())
      .then(json => { if (json.rates?.EUR) setLiveUsdToEurRate(json.rates.EUR); })
      .catch(() => {});
  }, []);

  // WebSockets Binance & Hyperliquid simultanés[cite: 2]
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
      } catch(e){}
    };

    const hWs = new WebSocket("wss://api.hyperliquid.xyz/ws");
    hWs.onopen = () => {
      hWs.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
    };
    hWs.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        if (json.data?.mids?.HYPE) {
          setRawPricesUSD(prev => ({ ...prev, HYPE: parseFloat(json.data.mids.HYPE) }));
        }
      } catch(e){}
    };

    return () => { bWs.close(); hWs.close(); };
  }, []);

  // Structure des actifs[cite: 2]
  const assets = useMemo(() => {
    const fx = liveUsdToEurRate;
    const structure = [
      { id: "bitcoin", name: "Bitcoin", ticker: "BTC", color: "#F7931A", balance: 0.0 },
      { id: "ethereum", name: "Ethereum", ticker: "ETH", color: "#627EEA", balance: 0.0 },
      { id: "tether", name: "Tether", ticker: "USDT", color: "#26A17B", balance: 0.0 },
      { id: "binancecoin", name: "BNB", ticker: "BNB", color: "#F3BA2F", balance: 0.0 },
      { id: "usd-coin", name: "USDC", ticker: "USDC", color: "#2775CA", balance: usdcBalance },
      { id: "ripple", name: "XRP", ticker: "XRP", color: "#23292F", balance: 0.0 },
      { id: "solana", name: "Solana", ticker: "SOL", color: "#14F195", balance: 0.0 },
      { id: "tron", name: "TRON", ticker: "TRX", color: "#EC0928", balance: 0.0 },
      { id: "hyperliquid", name: "Hyperliquid", ticker: "HYPE", color: "#00F5D4", balance: 0.0 },
      { id: "dogecoin", name: "Dogecoin", ticker: "DOGE", color: "#BA9F33", balance: 0.0 }
    ];

    return structure.map(a => {
      const priceUSD = rawPricesUSD[a.ticker] || 0;
      return {
        ...a,
        priceUSD,
        priceEUR: priceUSD * fx,
        change24h: rawVariations24h[a.ticker] || 0,
        realBalance: a.balance
      };
    });
  }, [rawPricesUSD, rawVariations24h, usdcBalance, liveUsdToEurRate]);

  const totalBalanceCalculated = useMemo(() => {
    const totalUSD = assets.reduce((sum, asset) => sum + (asset.realBalance * asset.priceUSD), 0);
    return currentCurrency.includes("USD") ? totalUSD : totalUSD * liveUsdToEurRate;
  }, [assets, currentCurrency, liveUsdToEurRate]);

  // Mock des transactions Base Sepolia issues du ViewModel[cite: 2]
  const transactions = [
    { id: "0x1", type: "Receive", assetTicker: "USDC", amountCrypto: 250.0, amountFiat: 250.0, timestamp: new Date(), senderAddress: "0x839F...919A", receiverAddress: "Me", isPending: false },
    { id: "0x2", type: "Send", assetTicker: "USDC", amountCrypto: 45.0, amountFiat: 45.0, timestamp: new Date(Date.now() - 3600000), senderAddress: "Me", receiverAddress: "0x112A...E432", isPending: false }
  ];

  return { currentTheme, setCurrentTheme, currentCurrency, setCurrentCurrency, selectedTab, setSelectedTab, assets, totalBalanceCalculated, transactions };
}

// --- VISUAL INTERFACE ORCHESTRATOR DESKTOP ---
function KoppiApp() {
  const { authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const vm = useWalletViewModel();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');

  const isDarkMode = vm.currentTheme === "Dark";
  const currencySymbol = vm.currentCurrency.includes("EUR") ? "€" : "$";

  // Design tokens Hex iOS clonnés[cite: 1]
  const bg = isDarkMode ? "#0A0A0C" : "#F4F5F7";
  const text = isDarkMode ? "#FFFFFF" : "#020202";
  const cardBg = isDarkMode ? "#121216" : "#FFFFFF";
  const border = isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";

  const handleSendCode = async () => {
    if (!email.includes('@')) return;
    try { await sendCode({ email: email.trim().toLowerCase() }); setStep('otp'); } catch(e){}
  };

  const handleVerifyCode = async () => {
    if (code.trim().length !== 6) return;
    try { await loginWithCode({ code: code.trim() }); } catch(e){}
  };

  if (!authenticated) {
    return (
      <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, padding: '48px', borderRadius: '32px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.02)' }}>
          <div style={{ letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '14px', color: '#888', marginBottom: '24px' }}>⚡ KOPPI NETWORK</div>
          <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-1px' }}>Connect Your Environment</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Access USD keyless infrastructure synchronized across platforms.</p>
          
          {step === 'email' ? (
            <div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.02)', border: `1px solid ${border}`, borderRadius: '14px', padding: '0 16px', fontSize: '14px', color: text, textAlign: 'center', outline: 'none', marginBottom: '16px' }} />
              <button onClick={handleSendCode} style={{ width: '100%', height: '52px', background: text, color: bg, fontWeight: '700', borderRadius: '26px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px' }}>Continue</button>
            </div>
          ) : (
            <div>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength="6" style={{ width: '100%', height: '52px', background: 'rgba(0,0,0,0.02)', border: `1px solid ${border}`, borderRadius: '14px', padding: '0 16px', fontSize: '20px', fontWeight: 'bold', letterSpacing: '6px', color: text, textAlign: 'center', outline: 'none', marginBottom: '16px' }} />
              <button onClick={handleVerifyCode} style={{ width: '100%', height: '52px', background: text, color: bg, fontWeight: '700', borderRadius: '26px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px' }}>Verify and Connect</button>
            </div>
          )}
          {state.status !== 'initial' && <div style={{ fontSize: '12px', color: '#888', marginTop: '14px' }}>Status: {state.status}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', transition: 'all 0.3s', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* --- SIDEBAR DE NAVIGATION (Format PC) --- */}
      <aside style={{ width: '280px', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', padding: '32px 24px', backgroundColor: cardBg }}>
        <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '4px', marginBottom: '48px', paddingLeft: '12px' }}>KOPPI</div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 0, label: "Overview", icon: "🏠" },
            { id: 1, label: "Markets Search", icon: "📊" },
            { id: 2, label: "Vault Protection", icon: "🔒" },
            { id: 3, label: "Preferences", icon: "⚙️" }
          ].map(t => {
            const isSelected = vm.selectedTab === t.id;
            return (
              <button key={t.id} onClick={() => vm.setSelectedTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', height: '50px', padding: '0 16px', borderRadius: '14px', border: 'none', background: isSelected ? 'rgba(0,0,0,0.04)' : 'transparent', color: isSelected ? text : '#888', fontSize: '14px', fontWeight: isSelected ? '700' : '50px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <span style={{ fontSize: '16px' }}>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </nav>

        <div style={{ fontSize: '11px', color: '#888', paddingLeft: '12px' }}>🟢 Connected Secure Node</div>
      </aside>

      {/* --- ESPACE CENTRAL DE L'INTERFACE PRINCIPALE --- */}
      <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', maxHeight: '100vh' }}>
        
        {/* ONGLET 0 : CONTENU DU PORTFOLIO (Fidèle à l'image iOS) */}
        {vm.selectedTab === 0 && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>Dashboard</h1>
                <p style={{ color: '#888', fontSize: '14px' }}>Base Sepolia Multi-Asset Infrastructure</p>
              </div>
              <div style={{ padding: '8px 18px', background: cardBg, borderRadius: '20px', border: `1px solid ${border}`, fontSize: '13px', fontWeight: '600' }}>
                🌐 Wallet: {user?.wallet?.address ? user.wallet.address.substring(0,6) + '...' + user.wallet.address.substring(user.wallet.address.length - 4) : "0xKeyless"}
              </div>
            </header>

            {/* Cadre de solde premium large */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '28px', padding: '40px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.01)' }}>
              <div>
                <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', color: '#888', marginBottom: '6px' }}>Total Net Worth Balance</div>
                <div style={{ fontSize: '54px', fontWeight: '900', letterSpacing: '-2px' }}>
                  {vm.totalBalanceCalculated.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currencySymbol}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{ height: '48px', padding: '0 28px', background: text, color: bg, fontWeight: '700', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Add Money</button>
                <button style={{ height: '48px', padding: '0 28px', background: 'rgba(0,0,0,0.03)', color: text, fontWeight: '700', borderRadius: '14px', border: `1px solid ${border}`, cursor: 'pointer' }}>📬 Transfer</button>
              </div>
            </div>

            {/* Grille responsive : Équilibres à gauche / Activité récente à droite */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#888', marginBottom: '16px' }}>Your Balances</h3>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '24px', overflow: 'hidden' }}>
                  {vm.assets.map((asset, i) => (
                    <div key={asset.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: i < vm.assets.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: asset.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: asset.color }}>{asset.ticker[0]}</div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '15px' }}>{asset.name}</div>
                          <div style={{ fontSize: '13px', color: '#888' }}>{asset.realBalance} {asset.ticker}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{asset.formattedValue ? asset.formattedValue(vm.currentCurrency.includes("EUR") ? "EUR" : "USD") : asset.priceUSD + currencySymbol}</div>
                        <div style={{ fontSize: '12px', color: asset.change24h >= 0 ? '#10B981' : '#EF4444' }}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#888', marginBottom: '16px' }}>Recent Activity</h3>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '24px', padding: '12px' }}>
                  {vm.transactions.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '16px', borderRadius: '16px', hover: { background: 'rgba(0,0,0,0.02)' } }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                          {tx.type === "Receive" ? "⬇️" : "arrow.up.right" ? "⬆️" : "⬇️"}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px' }}>{tx.type} Crypto</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{tx.assetTicker} • Completed</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: tx.type === "Receive" ? "#10B981" : text }}>
                        {tx.type === "Receive" ? '+' : '-'} {tx.amountFiat}{currencySymbol}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 1 : RECHERCHE DES MARCHES */}
        {vm.selectedTab === 1 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>Markets Pipeline</h2>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '8px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🔍</span>
              <input type="text" placeholder="Search markets or live ticker tokens..." style={{ width: '100%', height: '44px', border: 'none', background: 'transparent', outline: 'none', color: text, fontSize: '15px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vm.assets.map(asset => (
                <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: cardBg, border: `1px solid ${border}`, borderRadius: '16px' }}>
                  <div style={{ fontWeight: '700' }}>{asset.ticker} <span style={{ fontWeight: '400', color: '#888', marginLeft: '8px' }}>{asset.name}</span></div>
                  <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{asset.priceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET 2 : LE COFFRE FORT (VAULT) */}
        {vm.selectedTab === 2 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Vault Shield Protected</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>Non-custodial cryptographic secure asset lockers asset monitoring dashboard.</p>
          </div>
        )}

        {/* ONGLET 3 : COMPTE ET CONFIGURATIONS */}
        {vm.selectedTab === 3 && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '32px' }}>Preferences & Security</h2>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Application Theme Theme</label>
                <select value={vm.currentTheme} onChange={e => vm.setCurrentTheme(e.target.value)} style={{ width: '100%', height: '48px', background: 'rgba(0,0,0,0.02)', border: `1px solid ${border}`, borderRadius: '12px', padding: '0 12px', color: text, outline: 'none', fontSize: '14px' }}>
                  <option value="Dark" style={{ background: cardBg }}>Dark Environment</option>
                  <option value="Light" style={{ background: cardBg }}>Light Environment</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Target Display Currency Selection</label>
                <select value={vm.currentCurrency} onChange={e => vm.setCurrentCurrency(e.target.value)} style={{ width: '100%', height: '48px', background: 'rgba(0,0,0,0.02)', border: `1px solid ${border}`, borderRadius: '12px', padding: '0 12px', color: text, outline: 'none', fontSize: '14px' }}>
                  <option value="USD ($)" style={{ background: cardBg }}>USD ($)</option>
                  <option value="EUR (€)" style={{ background: cardBg }}>EUR (€)</option>
                </select>
              </div>
              <hr style={{ border: 'none', borderTop: `1px solid ${border}` }} />
              <button onClick={() => { logout(); location.reload(); }} style={{ width: '100%', height: '50px', background: '#EF4444', color: '#FFF', fontWeight: '700', borderRadius: '14px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px' }}>Disconnect Web Session</button>
            </div>
          </div>
        )}

      </main>
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
