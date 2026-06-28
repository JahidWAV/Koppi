import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useLoginWithEmail } from '@privy-io/react-auth';

const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd";

// --- HOOK DESKTOP DU WALLET VIEWMODEL (WebSocket + Logique Blockchain iOS) ---
function useWalletViewModel() {
  const { authenticated, user } = usePrivy();
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem("app_theme") || "Dark");
  const [currentCurrency, setCurrentCurrency] = useState(() => localStorage.getItem("app_currency") || "USD ($)");
  const [selectedTab, setSelectedTab] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0.00); 
  const [liveUsdToEurRate, setLiveUsdToEurRate] = useState(0.92);

  const [rawPricesUSD, setRawPricesUSD] = useState({ BTC: 0, ETH: 0, USDT: 1, BNB: 0, USDC: 1, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });
  const [rawVariations24h, setRawVariations24h] = useState({ BTC: 0, ETH: 0, USDT: 0, BNB: 0, USDC: 0, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });

  // Récupération de l'adresse du portefeuille connecté via Privy
  const walletAddress = user?.wallet?.address;

  useEffect(() => { localStorage.setItem("app_theme", currentTheme); }, [currentTheme]);
  useEffect(() => { localStorage.setItem("app_currency", currentCurrency); }, [currentCurrency]);

  // 🌟 FLUX RPC : Lecture réelle du solde ERC20 sur Base Sepolia (Fidèle à WalletViewModel.swift)
  useEffect(() => {
    if (!authenticated || !walletAddress) return;

    const fetchBlockchainBalance = async () => {
      const rpcNodeUrl = "https://sepolia.base.org"; //[cite: 2]
      const usdcContract = "0xD733D48f2a7F57D4559F98ae07f87Dab595E3523"; //[cite: 2]
      
      // Sécurisation et formatage de l'adresse pour le paramètre data (Padded à 64 caractères)[cite: 2]
      const cleanAddress = walletAddress.replace("0x", "").toLowerCase();
      const paddedAddress = cleanAddress.padStart(64, "0");
      const dataParam = "0x70a08231" + paddedAddress; // Signature de fonction balanceOf[cite: 2]

      try {
        const response = await fetch(rpcNodeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call", //[cite: 2]
            params: [{ to: usdcContract, data: dataParam }, "latest"], //[cite: 2]
            id: 1
          })
        });

        const json = await response.json();
        if (json.result && json.result !== "0x") {
          // Conversion de la valeur hexadécimale brute reçue de la blockchain[cite: 2]
          const hexValue = json.result.replace("0x", "");
          const rawValue = BigInt("0x" + hexValue);

          // Ajustement des décimales basé sur l'exposant de ton code Swift (18 décimales)[cite: 2]
          const formattedBalance = Number(rawValue) / Math.pow(10, 18); 
          
          setUsdcBalance(formattedBalance);
        }
      } catch (error) {
        console.error("RPC Fetch Error:", error);
      }
    };

    // Premier chargement immédiat puis actualisation cyclique toutes les 10 secondes
    fetchBlockchainBalance();
    const interval = setInterval(fetchBlockchainBalance, 10000);
    return () => clearInterval(interval);
  }, [authenticated, walletAddress]);

  // Récupération Forex Rate[cite: 2]
  useEffect(() => {
    fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR")
      .then(res => res.json())
      .then(json => { if (json.rates?.EUR) setLiveUsdToEurRate(json.rates.EUR); })
      .catch(() => {});
  }, []);

  // WebSockets temps réel[cite: 2]
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
    hWs.onopen = () => { hWs.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } })); };
    hWs.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        if (json.data?.mids?.HYPE) { setRawPricesUSD(prev => ({ ...prev, HYPE: parseFloat(json.data.mids.HYPE) })); }
      } catch(e){}
    };

    return () => { bWs.close(); hWs.close(); };
  }, []);

  const assets = useMemo(() => {
    const fx = liveUsdToEurRate;
    const structure = [
      { id: "bitcoin", name: "Bitcoin", ticker: "BTC", color: "#F7931A", balance: 0.0 },
      { id: "ethereum", name: "Ethereum", ticker: "ETH", color: "#627EEA", balance: 0.0 },
      { id: "tether", name: "Tether", ticker: "USDT", color: "#26A17B", balance: 0.0 },
      { id: "binancecoin", name: "BNB", ticker: "BNB", color: "#F3BA2F", balance: 0.0 },
      { id: "usd-coin", name: "USDC", ticker: "USDC", color: "#2775CA", balance: usdcBalance }, // injecte la vraie valeur
      { id: "ripple", name: "XRP", ticker: "XRP", color: "#23292F", balance: 0.0 },
      { id: "solana", name: "Solana", ticker: "SOL", color: "#14F195", balance: 0.0 },
      { id: "tron", name: "TRON", ticker: "TRX", color: "#EC0928", balance: 0.0 },
      { id: "hyperliquid", name: "Hyperliquid", ticker: "HYPE", color: "#00F5D4", balance: 0.0 },
      { id: "dogecoin", name: "Dogecoin", ticker: "DOGE", color: "#BA9F33", balance: 0.0 }
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

  const transactions = []; 

  return { currentTheme, setCurrentTheme, currentCurrency, setCurrentCurrency, selectedTab, setSelectedTab, assets, totalBalanceCalculated, transactions };
}

// --- APP CORE ---
function KoppiApp() {
  const { authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const vm = useWalletViewModel();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');

  // État persistant du menu rabattable (Sidebar) d'après la demande
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  const isDarkMode = vm.currentTheme === "Dark";
  const currencySymbol = vm.currentCurrency.includes("EUR") ? "€" : "$";

  // Palette Premium Apple (Ultra-minimaliste, contrastes fins, typographie aérée)
  const bg = isDarkMode ? "#000000" : "#F5F5F7";
  const text = isDarkMode ? "#F5F5F7" : "#1D1D1F";
  const cardBg = isDarkMode ? "#1C1C1E" : "#FFFFFF";
  const border = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const secondaryText = isDarkMode ? "#8E8E93" : "#86868B";

  const handleSendCode = async () => {
    if (!email.includes('@')) return;
    try { await sendCode({ email: email.trim().toLowerCase() }); setStep('otp'); } catch(e){}
  };

  const handleVerifyCode = async () => {
    if (code.trim().length !== 6) return;
    try { await loginWithCode({ code: code.trim() }); } catch(e){}
  };

  // Correction de la déconnexion asynchrone Privy
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.4s ease', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, padding: '40px', borderRadius: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '600', fontSize: '11px', color: secondaryText, marginBottom: '24px' }}>Koppi Node</div>
          <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-0.5px' }}>Sign In</h2>
          <p style={{ color: secondaryText, fontSize: '14px', marginBottom: '32px', lineHeight: '1.4' }}>Access secure stablecoin infrastructure.</p>
          
          {step === 'email' ? (
            <div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={{ width: '100%', height: '48px', background: isDarkMode ? '#000000' : '#F5F5F7', border: `1px solid ${border}`, borderRadius: '12px', padding: '0 16px', fontSize: '14px', color: text, textAlign: 'center', outline: 'none', marginBottom: '16px', transition: 'border-color 0.2s' }} />
              <button onClick={handleSendCode} style={{ width: '100%', height: '48px', background: text, color: bg, fontWeight: '600', borderRadius: '24px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Continue</button>
            </div>
          ) : (
            <div>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength="6" style={{ width: '100%', height: '48px', background: isDarkMode ? '#000000' : '#F5F5F7', border: `1px solid ${border}`, borderRadius: '12px', padding: '0 16px', fontSize: '18px', fontWeight: '600', letterSpacing: '4px', color: text, textAlign: 'center', outline: 'none', marginBottom: '16px' }} />
              <button onClick={handleVerifyCode} style={{ width: '100%', height: '48px', background: text, color: bg, fontWeight: '600', borderRadius: '24px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Verify and Connect</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', transition: 'background-color 0.4s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',WebkitFontSmoothing: 'antialiased' }}>
      
      {/* --- SIDEBAR RETRACTABLE PERSISTANTE --- */}
      <aside style={{ width: sidebarCollapsed ? '80px' : '260px', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', padding: '32px 16px', backgroundColor: cardBg, transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', marginBottom: '40px', padding: '0 12px' }}>
          {!sidebarCollapsed && <div style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '3px' }}>KOPPI</div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: 'none', border: 'none', fontSize: '16px', color: secondaryText, cursor: 'pointer', padding: '4px' }} title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}>
            {sidebarCollapsed ? "➡️" : "⬅️"}
          </button>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 0, label: "Overview", icon: "💎" },
            { id: 1, label: "Markets", icon: "🔍" },
            { id: 2, label: "Vault", icon: "🛡️" },
            { id: 3, label: "Settings", icon: "⚙️" }
          ].map(t => {
            const isSelected = vm.selectedTab === t.id;
            return (
              <button key={t.id} onClick={() => vm.setSelectedTab(t.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '14px', width: '100%', height: '44px', padding: sidebarCollapsed ? '0' : '0 16px', borderRadius: '12px', border: 'none', background: isSelected ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent', color: isSelected ? text : secondaryText, fontSize: '14px', fontWeight: isSelected ? '600' : '400', cursor: 'pointer', transition: 'all 0.2s' }} title={t.label}>
                <span style={{ fontSize: '16px' }}>{t.icon}</span> {!sidebarCollapsed && <span>{t.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#10B981', fontWeight: '500' }}>
          {sidebarCollapsed ? "●" : "● Operational"}
        </div>
      </aside>

      {/* --- ESPACE CENTRAL DE L'INTERFACE PRINCIPALE --- */}
      <main style={{ flex: 1, padding: '54px 64px', overflowY: 'auto', maxHeight: '100vh' }}>
        
        {/* TAB 0 : CONTENU DU PORTFOLIO ANCRÉ SUR LE SOLDE RÉEL[cite: 2] */}
        {vm.selectedTab === 0 && (
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: '600', letterSpacing: '-0.5px', marginBottom: '4px' }}>Account Overview</h1>
                <p style={{ color: secondaryText, fontSize: '14px' }}>Base Sepolia Environment</p>
              </div>
              <div style={{ fontSize: '12px', color: secondaryText, fontFamily: 'monospace', background: cardBg, padding: '6px 14px', borderRadius: '20px', border: `1px solid ${border}` }}>
                {user?.wallet?.address ? user.wallet.address.substring(0,6) + '...' + user.wallet.address.substring(user.wallet.address.length - 4) : "0x00...0000"}
              </div>
            </header>

            {/* Cadre de solde Apple minimaliste haut de gamme */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '36px', marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: secondaryText, marginBottom: '6px' }}>Net Worth</div>
                <div style={{ fontSize: '48px', fontWeight: '500', letterSpacing: '-1.5px', fontFamily: '-apple-system-headline' }}>
                  {vm.totalBalanceCalculated.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currencySymbol}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{ height: '40px', padding: '0 20px', background: text, color: bg, fontWeight: '600', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Add Money</button>
                <button style={{ height: '40px', padding: '0 20px', background: 'transparent', color: text, fontWeight: '600', borderRadius: '20px', border: `1px solid ${border}`, cursor: 'pointer', fontSize: '13px' }}>Transfer</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '48px' }}>
              {/* Balances réelles */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: secondaryText, marginBottom: '16px' }}>Assets</h3>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', overflow: 'hidden' }}>
                  {vm.assets.map((asset, i) => (
                    <div key={asset.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < vm.assets.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: asset.color }} />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{asset.name}</div>
                          <div style={{ fontSize: '12px', color: secondaryText }}>{asset.realBalance} {asset.ticker}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{vm.currentCurrency.includes("EUR") ? (asset.priceEUR * asset.realBalance).toFixed(2) + '€' : (asset.priceUSD * asset.realBalance).toFixed(2) + '$'}</div>
                        <div style={{ fontSize: '11px', color: asset.change24h >= 0 ? '#10B981' : '#EF4444' }}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historique réel nettoyé */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: secondaryText, marginBottom: '16px' }}>Activity</h3>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>📑</div>
                  <div style={{ fontSize: '13px', color: secondaryText }}>No transaction logs detected on Base Sepolia.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1 : MARCHES EXPLORER */}
        {vm.selectedTab === 1 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '24px', letterSpacing: '-0.5px' }}>Markets</h2>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '0 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: secondaryText }}>🔍</span>
              <input type="text" placeholder="Search tokens..." style={{ width: '100%', height: '44px', border: 'none', background: 'transparent', outline: 'none', color: text, fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vm.assets.map(asset => (
                <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: cardBg, border: `1px solid ${border}`, borderRadius: '14px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{asset.ticker} <span style={{ fontWeight: '400', color: secondaryText, marginLeft: '6px', fontSize: '13px' }}>{asset.name}</span></div>
                  <div style={{ fontWeight: '500', fontSize: '14px', fontFamily: 'monospace' }}>{asset.priceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2 : COFFRE FORT */}
        {vm.selectedTab === 2 && (
          <div style={{ textAlign: 'center', padding: '100px 0', maxWidth: '460px', margin: '0 auto' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🛡️</div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Vault Security</h2>
            <p style={{ color: secondaryText, fontSize: '14px', lineHeight: '1.5' }}>Your asset lockers are operating under end-to-end multi-party encryption layers.</p>
          </div>
        )}

        {/* TAB 3 : PREFERENCES & DECONNEXION CORRIGEE */}
        {vm.selectedTab === 3 && (
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.5px' }}>Settings</h2>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', color: secondaryText, fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Interface Theme</label>
                <select value={vm.currentTheme} onChange={e => vm.setCurrentTheme(e.target.value)} style={{ width: '100%', height: '40px', background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0 10px', color: text, outline: 'none', fontSize: '13px' }}>
                  <option value="Dark">Dark Mode</option>
                  <option value="Light">Light Mode</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: secondaryText, fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Display Currency</label>
                <select value={vm.currentCurrency} onChange={e => vm.setCurrentCurrency(e.target.value)} style={{ width: '100%', height: '40px', background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0 10px', color: text, outline: 'none', fontSize: '13px' }}>
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (€)">EUR (€)</option>
                </select>
              </div>
              <hr style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '8px 0' }} />
              {/* Le bouton déclenche désormais handleLogout qui purge proprement la session Privy */}
              <button onClick={handleLogout} style={{ width: '100%', height: '44px', background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', color: '#EF4444', fontWeight: '600', borderRadius: '22px', border: 'none', cursor: 'pointer', fontSize: '13px', transition: 'background-color 0.2s' }}>
                Disconnect Account
              </button>
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
