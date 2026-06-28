import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, useLoginWithEmail } from '@privy-io/react-auth';

const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd";

// --- ICÔNES SVG STYLE APPLE (ZÉRO ÉMOJI) ---
const Icons = {
  Overview: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Markets: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="24" x2="16.65" y2="19.35" />
    </svg>
  ),
  Vault: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7s0 6 8 10z" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  ArrowReceive: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="5" x2="5" y2="19" />
      <polyline points="5 9 5 19 19 19" />
    </svg>
  ),
  ArrowSend: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="19 15 19 5 9 5" />
    </svg>
  ),
  Chevron: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="9 18 15 12 9 6" />
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
  const [transactions, setTransactions] = useState([]);

  const [rawPricesUSD, setRawPricesUSD] = useState({ BTC: 0, ETH: 0, USDT: 1, BNB: 0, USDC: 1, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });
  const [rawVariations24h, setRawVariations24h] = useState({ BTC: 0, ETH: 0, USDT: 0, BNB: 0, USDC: 0, XRP: 0, SOL: 0, TRX: 0, HYPE: 0, DOGE: 0 });

  const walletAddress = user?.wallet?.address;

  useEffect(() => { localStorage.setItem("app_theme", currentTheme); }, [currentTheme]);
  useEffect(() => { localStorage.setItem("app_currency", currentCurrency); }, [currentCurrency]);

  useEffect(() => {
    if (!authenticated || !walletAddress) return;

    const fetchBlockchainData = async () => {
      const rpcNodeUrl = "https://sepolia.base.org";
      const usdcContract = "0xD733D48f2a7F57D4559F98ae07f87Dab595E3523";
      const transferTopic = "0xddf252adb1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      
      const cleanAddress = walletAddress.replace("0x", "").toLowerCase();
      const paddedAddress = cleanAddress.padStart(64, "0");
      
      try {
        const balanceRes = await fetch(rpcNodeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_call",
            params: [{ to: usdcContract, data: "0x70a08231" + paddedAddress }, "latest"], id: 1
          })
        });
        const balanceJson = await balanceRes.json();
        if (balanceJson.result && balanceJson.result !== "0x") {
          const rawValue = BigInt("0x" + balanceJson.result.replace("0x", ""));
          setUsdcBalance(Number(rawValue) / Math.pow(10, 18));
        }

        const logsRes = await fetch(rpcNodeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_getLogs",
            params: [{ address: usdcContract, fromBlock: "0x0", toBlock: "latest", topics: [transferTopic] }], id: 2
          })
        });
        const logsJson = await logsRes.json();
        if (logsJson.result && Array.isArray(logsJson.result)) {
          const userTxs = logsJson.result.filter(log => {
            if (!log.topics || log.topics.length < 3) return false;
            const from = "0x" + log.topics[1].substring(26).toLowerCase();
            const to = "0x" + log.topics[2].substring(26).toLowerCase();
            const current = walletAddress.toLowerCase();
            return from === current || to === current;
          }).map(log => {
            const fromAddr = "0x" + log.topics[1].substring(26);
            const isSend = fromAddr.toLowerCase() === walletAddress.toLowerCase();
            const rawAmount = BigInt("0x" + (log.data ? log.data.replace("0x", "") : "0"));
            const cryptoAmount = Number(rawAmount) / Math.pow(10, 18);
            return {
              id: log.transactionHash,
              type: isSend ? "Send" : "Receive",
              assetTicker: "USDC",
              amountCrypto: cryptoAmount,
              amountFiat: cryptoAmount
            };
          }).reverse();
          setTransactions(userTxs.slice(0, 10));
        }
      } catch (error) {
        console.error("RPC Error:", error);
      }
    };

    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 12000);
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
      { id: "usd-coin", name: "USDC", ticker: "USDC", color: "#2775CA", balance: usdcBalance },
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

  return { currentTheme, setCurrentTheme, currentCurrency, setCurrentCurrency, selectedTab, setSelectedTab, assets, totalBalanceCalculated, transactions };
}

function KoppiApp() {
  const { authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const vm = useWalletViewModel();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  useEffect(() => { localStorage.setItem("sidebar_collapsed", sidebarCollapsed); }, [sidebarCollapsed]);

  const isDarkMode = vm.currentTheme === "Dark";
  const currencySymbol = vm.currentCurrency.includes("EUR") ? "€" : "$";

  const bg = isDarkMode ? "#000000" : "#F5F5F7";
  const text = isDarkMode ? "#F5F5F7" : "#1D1D1F";
  const cardBg = isDarkMode ? "#1C1C1E" : "#FFFFFF";
  const border = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const secondaryText = isDarkMode ? "#8E8E93" : "#86868B";

  const acquiredAssets = useMemo(() => vm.assets.filter(a => a.realBalance > 0), [vm.assets]);

  const handleLogout = async () => { try { await logout(); localStorage.clear(); window.location.reload(); } catch(e){} };

  if (!authenticated) {
    return (
      <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, padding: '40px', borderRadius: '24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '6px', letterSpacing: '-0.5px' }}>Sign In</h2>
          <p style={{ color: secondaryText, fontSize: '13px', marginBottom: '32px' }}>Access secure stablecoin infrastructure.</p>
          {step === 'email' ? (
            <div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={{ width: '100%', height: '46px', background: isDarkMode ? '#000000' : '#F5F5F7', border: `1px solid ${border}`, borderRadius: '10px', padding: '0 16px', fontSize: '14px', color: text, textAlign: 'center', outline: 'none', marginBottom: '16px' }} />
              <button onClick={handleSendCode} style={{ width: '100%', height: '46px', background: text, color: bg, fontWeight: '600', borderRadius: '23px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Continue</button>
            </div>
          ) : (
            <div>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength="6" style={{ width: '100%', height: '46px', background: isDarkMode ? '#000000' : '#F5F5F7', border: `1px solid ${border}`, borderRadius: '10px', padding: '0 16px', fontSize: '18px', fontWeight: '600', letterSpacing: '4px', color: text, textAlign: 'center', outline: 'none', marginBottom: '16px' }} />
              <button onClick={handleVerifyCode} style={{ width: '100%', height: '46px', background: text, color: bg, fontWeight: '600', borderRadius: '23px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Verify</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bg, color: text, minHeight: '100vh', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      
      <aside style={{ width: sidebarCollapsed ? '72px' : '240px', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', padding: '32px 14px', backgroundColor: cardBg, transition: 'width 0.25s cubic-bezier(0.25, 1, 0.5, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', marginBottom: '40px', padding: '0 8px' }}>
          {!sidebarCollapsed && <div style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '3px' }}>KOPPI</div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: 'none', border: 'none', color: secondaryText, cursor: 'pointer', fontSize: '14px' }}>{sidebarCollapsed ? "→" : "←"}</button>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {[
            { id: 0, label: "Overview", icon: Icons.Overview },
            { id: 1, label: "Markets", icon: Icons.Markets },
            { id: 2, label: "Vault", icon: Icons.Vault },
            { id: 3, label: "Settings", icon: Icons.Settings }
          ].map(t => {
            const isSelected = vm.selectedTab === t.id && !selectedAssetDetail;
            return (
              <button key={t.id} onClick={() => { setSelectedAssetDetail(null); vm.setSelectedTab(t.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '12px', width: '100%', height: '40px', padding: sidebarCollapsed ? '0' : '0 12px', borderRadius: '10px', border: 'none', background: isSelected ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent', color: isSelected ? text : secondaryText, fontSize: '13px', fontWeight: isSelected ? '500' : '400', cursor: 'pointer', transition: 'all 0.15s' }}>
                <t.icon /> {!sidebarCollapsed && <span>{t.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '54px 64px', overflowY: 'auto', maxHeight: '100vh' }}>
        
        {selectedAssetDetail ? (
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <button onClick={() => setSelectedAssetDetail(null)} style={{ background: 'none', border: 'none', color: secondaryText, fontSize: '13px', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>← Back to Overview</button>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px', padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-1px', marginBottom: '4px' }}>{selectedAssetDetail.name} ({selectedAssetDetail.ticker})</h2>
              <p style={{ color: secondaryText, fontSize: '14px', marginBottom: '24px' }}>Live Asset Tracking Node</p>
              <div style={{ fontSize: '44px', fontWeight: '300', letterSpacing: '-1px' }}>
                {selectedAssetDetail.realBalance.toFixed(4)} <span style={{ fontSize: '20px', color: secondaryText }}>{selectedAssetDetail.ticker}</span>
              </div>
              <div style={{ color: '#10B981', fontSize: '13px', marginTop: '6px' }}>
                ≈ {vm.currentCurrency.includes("EUR") ? (selectedAssetDetail.priceEUR * selectedAssetDetail.realBalance).toFixed(2) + '€' : (selectedAssetDetail.priceUSD * selectedAssetDetail.realBalance).toFixed(2) + '$'}
              </div>
            </div>
          </div>
        ) : (
          <>
            {vm.selectedTab === 0 && (
              <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                  <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '500', letterSpacing: '-0.5px', marginBottom: '4px' }}>Overview</h1>
                  </div>
                </header>

                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '36px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Net Worth</div>
                    <div style={{ fontSize: '42px', fontWeight: '300', letterSpacing: '-1.5px', fontFamily: '-apple-system-headline, sans-serif' }}>
                      {vm.totalBalanceCalculated.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currencySymbol}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ height: '36px', padding: '0 16px', background: text, color: bg, fontWeight: '500', borderRadius: '18px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Add Money</button>
                    <button style={{ height: '36px', padding: '0 16px', background: 'transparent', color: text, fontWeight: '500', borderRadius: '18px', border: `1px solid ${border}`, cursor: 'pointer', fontSize: '12px' }}>Transfer</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '48px' }}>
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '500', color: secondaryText, marginBottom: '14px' }}>Assets</h3>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
                      {acquiredAssets.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: secondaryText, fontSize: '13px' }}>Your wallet is empty. Deposit stablecoins to activate the node.</div>
                      ) : (
                        acquiredAssets.map((asset, i) => (
                          <div key={asset.id} onClick={() => setSelectedAssetDetail(asset)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < acquiredAssets.length - 1 ? `1px solid ${border}` : 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: asset.color }} />
                              <div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>{asset.name}</div>
                                <div style={{ fontSize: '12px', color: secondaryText }}>{asset.realBalance} {asset.ticker}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>{vm.currentCurrency.includes("EUR") ? (asset.priceEUR * asset.realBalance).toFixed(2) + '€' : (asset.priceUSD * asset.realBalance).toFixed(2) + '$'}</div>
                              </div>
                              <Icons.Chevron />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '500', color: secondaryText, marginBottom: '14px' }}>Activity Logs</h3>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
                      {vm.transactions.length === 0 ? (
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: secondaryText, fontSize: '13px' }}>No direct Base Sepolia logs identified.</div>
                      ) : (
                        vm.transactions.map((tx, i) => (
                          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i < vm.transactions.length - 1 ? `1px solid ${border}` : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ color: tx.type === "Receive" ? "#10B981" : text }}>
                                {tx.type === "Receive" ? <Icons.ArrowReceive /> : <Icons.ArrowSend />}
                              </div>
                              <div>
                                <div style={{ fontWeight: '500', fontSize: '13px' }}>{tx.type}</div>
                                <div style={{ fontSize: '11px', color: secondaryText, fontFamily: 'monospace' }}>{tx.id.substring(0,10)}...</div>
                              </div>
                            </div>
                            <div style={{ fontWeight: '500', fontSize: '13px', color: tx.type === "Receive" ? "#10B981" : text }}>
                              {tx.type === "Receive" ? '+' : '-'} {tx.amountFiat.toFixed(2)}{currencySymbol}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {vm.selectedTab === 1 && (
              <div style={{ maxWidth: '740px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '20px', letterSpacing: '-0.3px' }}>Markets</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {vm.assets.map(asset => (
                    <div key={asset.id} onClick={() => setSelectedAssetDetail(asset)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{asset.ticker} <span style={{ color: secondaryText, marginLeft: '6px', fontSize: '13px', fontWeight: '400' }}>{asset.name}</span></div>
                      <div style={{ fontWeight: '400', fontSize: '13px', fontFamily: 'monospace' }}>{asset.priceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vm.selectedTab === 2 && (
              <div style={{ textAlign: 'center', padding: '120px 0', maxWidth: '400px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>Vault Security Encryption</h2>
                <p style={{ color: secondaryText, fontSize: '13px', lineHeight: '1.5' }}>Hardware-isolated multi-party thresholds protect ongoing balances active inside the node infrastructure.</p>
              </div>
            )}

            {vm.selectedTab === 3 && (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '24px' }}>Settings</h2>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: secondaryText, fontWeight: '500', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Interface Theme</label>
                    <select value={vm.currentTheme} onChange={e => vm.setCurrentTheme(e.target.value)} style={{ width: '100%', height: '38px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '0 10px', color: text, fontSize: '13px', outline: 'none' }}>
                      <option value="Dark">Dark Mode</option>
                      <option value="Light">Light Mode</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: secondaryText, fontWeight: '500', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Currency Display</label>
                    <select value={vm.currentCurrency} onChange={e => vm.setCurrentCurrency(e.target.value)} style={{ width: '100%', height: '38px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '0 10px', color: text, fontSize: '13px', outline: 'none' }}>
                      <option value="USD ($)">USD ($)</option>
                      <option value="EUR (€)">EUR (€)</option>
                    </select>
                  </div>
                  <hr style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '6px 0' }} />
                  <button onClick={handleLogout} style={{ width: '100%', height: '40px', background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2', color: '#EF4444', fontWeight: '500', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                    Disconnect Account
                  </button>
                </div>
              </div>
            )}
          </>
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
