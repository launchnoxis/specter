import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { scanToken } from './lib/api';
import ProPage from './components/ProPage';
import './styles/app.css';

const MAX_FREE_SCANS = 5;

const SpecterLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 3L3 21h18L12 3z" fill="#000" stroke="none"/>
    <line x1="8" y1="15" x2="16" y2="15" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

function RiskBanner({ score }) {
  const cls = score >= 70 ? 'danger' : score >= 40 ? 'warn' : 'safe';
  const label = score >= 70 ? 'HIGH RISK' : score >= 40 ? 'MODERATE RISK' : 'LOW RISK';
  const desc = score >= 70
    ? 'Multiple red flags detected. Exercise extreme caution.'
    : score >= 40
    ? 'Some concerns detected. Review carefully before buying.'
    : 'No major red flags detected. Always DYOR.';
  return (
    <div className={`risk-banner ${cls}`}>
      <div className="risk-left">
        <h2>{label}</h2>
        <p>{desc}</p>
      </div>
      <div className={`risk-score ${cls}`}>{score}</div>
    </div>
  );
}

function CheckCard({ label, value, detail, status }) {
  return (
    <div className="check-card">
      <div className="check-top">
        <span className="check-label">{label}</span>
        <span className={`check-status ${status}`}>
          {status === 'pass' ? 'SAFE' : status === 'fail' ? 'RISK' : 'WARN'}
        </span>
      </div>
      <div className="check-value">{value}</div>
      {detail && <div className="check-sub">{detail}</div>}
    </div>
  );
}

function HolderRow({ rank, address, pct }) {
  const barClass = pct > 15 ? 'high' : pct > 8 ? 'mid' : '';
  return (
    <div className="holder-row">
      <span className="holder-rank">#{rank}</span>
      <span className="holder-addr">{address.slice(0,6)}...{address.slice(-6)}</span>
      <div className="holder-bar-wrap">
        <div className={`holder-bar ${barClass}`} style={{ width: `${Math.min(pct * 4, 100)}%` }} />
      </div>
      <span className="holder-pct">{pct.toFixed(2)}%</span>
    </div>
  );
}

function ScanResult({ data, isPro }) {
  const { token, checks, holders, bondingCurve, stats, riskReasons, sellPressure, washTrading } = data;
  const score = data.riskScore;

  return (
    <div className="results">
      <RiskBanner score={score} />

      {/* Risk reasons */}
      {riskReasons && riskReasons.length > 0 && (
        <div className="risk-reasons">
          <div className="risk-reasons-title">[ flags detected ]</div>
          {riskReasons.map((r, i) => (
            <div className="risk-reason-row" key={i}>
              <span className="risk-reason-dot">!</span>
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Token header */}
      <div className="token-header">
        <div className="token-img">
          {token.image
            ? <img
                src={token.image.replace('https://ipfs.io/ipfs/', 'https://cf-ipfs.com/ipfs/').replace('ipfs://', 'https://cf-ipfs.com/ipfs/')}
                alt={token.name}
                onError={e => { e.target.style.display='none'; e.target.parentNode.innerText='🪙'; }}
              />
            : '🪙'}
        </div>
        <div>
          <div className="token-name">{token.name}</div>
          <div className="token-symbol">${token.symbol}</div>
          <div className="token-address">{token.address}</div>
        </div>
        <div className="token-links">
          <a href={`https://pump.fun/${token.address}`} target="_blank" rel="noreferrer" className="token-link">pump.fun →</a>
          <a href={`https://solscan.io/token/${token.address}`} target="_blank" rel="noreferrer" className="token-link">Solscan →</a>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-val">{stats.marketCapK}</div>
          <div className="stat-lbl">Market Cap</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{stats.age !== '—' ? stats.age : bondingCurve.isGraduated ? 'Graduated' : '—'}</div>
          <div className="stat-lbl">Token Age</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{typeof stats.holders === 'number' && stats.holders > 0 ? stats.holders.toLocaleString() : '—'}</div>
          <div className="stat-lbl">Holders</div>
        </div>
        <div className="stat-box">
          <div className="stat-val" style={{fontSize: stats.solRaised?.includes('Grad') ? '0.9rem' : undefined}}>{stats.solRaised}</div>
          <div className="stat-lbl">SOL Raised</div>
        </div>
      </div>

      {/* Security checks */}
      <div className="checks-grid">
        <CheckCard
          label="Mint Authority"
          value={checks.mintRenounced ? 'Renounced ✓' : 'Not Renounced ✗'}
          detail={checks.mintDetail}
          status={checks.mintRenounced ? 'pass' : 'fail'}
        />
        <CheckCard
          label="Freeze Authority"
          value={checks.freezeRenounced ? 'Renounced ✓' : 'Not Renounced ✗'}
          detail={checks.freezeDetail}
          status={checks.freezeRenounced ? 'pass' : 'fail'}
        />
        <CheckCard
          label="Dev Holdings"
          value={`${checks.devHoldingPct}%`}
          detail={checks.devDetail}
          status={checks.devHoldingPct > 15 ? 'fail' : checks.devHoldingPct > 8 ? 'warn' : 'pass'}
        />
        <CheckCard
          label="LP / Bonding Curve"
          value={checks.isGraduated ? 'Graduated ✓' : bondingCurve.progress > 0 ? `${bondingCurve.progress}% complete` : 'Bonding curve active'}
          detail={checks.lpDetail}
          status={checks.isGraduated ? 'pass' : 'warn'}
        />
      </div>

      {/* Bonding curve */}
      <div className="curve-card">
        <div className="curve-title">
          {bondingCurve.isGraduated ? '✓ Graduated to PumpSwap AMM' : `Bonding Curve — ${bondingCurve.solRaised} / 85 SOL raised`}
        </div>
        <div className="curve-bar-wrap">
          <div className="curve-bar" style={{ width: `${bondingCurve.progress}%`, background: bondingCurve.isGraduated ? 'var(--green)' : undefined }} />
        </div>
        <div className="curve-labels">
          <span>{bondingCurve.isGraduated ? '100% — Fully graduated' : `${bondingCurve.progress.toFixed(1)}% complete`}</span>
          <span>{bondingCurve.isGraduated ? 'Trading on PumpSwap' : `${Math.max(0, 85 - parseFloat(bondingCurve.solRaised || 0)).toFixed(2)} SOL to graduation`}</span>
        </div>
      </div>

      {/* Top 3 holders (free) */}
      <div className="holders-card">
        <div className="holders-title">Top Holders {!isPro && '(Top 3 — Free Plan)'}</div>
        {(isPro ? holders : holders.slice(0, 3)).map((h, i) => (
          <HolderRow key={i} rank={i+1} address={h.address} pct={h.pct} />
        ))}
      </div>

      {/* Creator Profile — FREE */}
      {token.creator && (
        <div className="insight-card">
          <div className="insight-header">
            <div className="insight-title">Creator Wallet</div>
            <span className="feat-row-tag free">Free</span>
          </div>
          <div className="creator-addr-row">
            <span className="creator-addr">{token.creator.slice(0,8)}...{token.creator.slice(-8)}</span>
            <div className="creator-links">
              <a href={`https://pump.fun/profile/${token.creator}`} target="_blank" rel="noreferrer" className="creator-link">
                pump.fun profile →
              </a>
              <a href={`https://solscan.io/account/${token.creator}`} target="_blank" rel="noreferrer" className="creator-link">
                Solscan →
              </a>
            </div>
          </div>
          <div className="creator-note">
            View all tokens launched by this wallet on their pump.fun profile. Check for past rugs before buying.
          </div>
        </div>
      )}

      {/* Sell Pressure Index — FREE */}
      {sellPressure && (
        <div className="insight-card">
          <div className="insight-header">
            <div className="insight-title">Sell Pressure Index</div>
            <span className="feat-row-tag free">Free</span>
          </div>
          <div className="pressure-label" style={{
            color: sellPressure.label === 'Selling Pressure' ? 'var(--red)' : sellPressure.label === 'Buying Pressure' ? 'var(--green)' : 'var(--amber)'
          }}>
            {sellPressure.label}
          </div>
          <div className="pressure-bar-wrap">
            <div className="pressure-bar-sell" style={{width: `${sellPressure.sellRatio}%`}}/>
            <div className="pressure-bar-buy" style={{width: `${100 - sellPressure.sellRatio}%`}}/>
          </div>
          <div className="pressure-labels">
            <span style={{color:'var(--red)'}}>Sells {sellPressure.sellRatio}%</span>
            <span style={{color:'var(--text3)', fontSize:'0.7rem'}}>last {sellPressure.sampleSize} trades</span>
            <span style={{color:'var(--green)'}}>Buys {(100 - sellPressure.sellRatio).toFixed(1)}%</span>
          </div>
          <div className="pressure-detail">
            <div className="pressure-detail-item">
              <span className="pressure-detail-lbl">Unique Buyers</span>
              <span className="pressure-detail-val green">{sellPressure.uniqueBuyers}</span>
            </div>
            <div className="pressure-detail-item">
              <span className="pressure-detail-lbl">Unique Sellers</span>
              <span className="pressure-detail-val red">{sellPressure.uniqueSellers}</span>
            </div>
            <div className="pressure-detail-item">
              <span className="pressure-detail-lbl">Buy Volume</span>
              <span className="pressure-detail-val">{sellPressure.buyVolSol} SOL</span>
            </div>
            <div className="pressure-detail-item">
              <span className="pressure-detail-lbl">Sell Volume</span>
              <span className="pressure-detail-val">{sellPressure.sellVolSol} SOL</span>
            </div>
          </div>
        </div>
      )}

      {/* Wash Trading Detection — PRO */}
      {!isPro ? (
        <div className="pro-gate">
          <div className="pro-gate-title">🔍 Wash Trading Detection — Pro</div>
          <div className="pro-gate-sub">
            See what % of this token's volume is wash traded — wallets cycling SOL to fake activity. Axiom doesn't show this. Upgrade to see the full breakdown.
          </div>
          <button className="btn-upgrade" onClick={() => setView('pro')}>
            Upgrade to Pro — $9/mo →
          </button>
        </div>
      ) : washTrading && (
        <div className="insight-card">
          <div className="insight-header">
            <div className="insight-title">Wash Trading Detection</div>
            <span className="feat-row-tag pro">Pro</span>
          </div>
          <div className="wash-score" style={{
            color: washTrading.label === 'High' ? 'var(--red)' : washTrading.label === 'Moderate' ? 'var(--amber)' : 'var(--green)'
          }}>
            {washTrading.washPct}% <span className="wash-label">{washTrading.label} wash trading</span>
          </div>
          <div className="wash-detail">
            {washTrading.washWalletCount} of {washTrading.totalWallets} wallets both bought and sold in the last {washTrading.sampleSize} trades.
          </div>
          <div className="insight-tokens">
            {washTrading.topWashWallets.map((w, i) => (
              <div className="insight-token-row" key={i}>
                <span className="insight-token-dot red"/>
                <span className="insight-token-name">{w.address.slice(0,6)}...{w.address.slice(-4)}</span>
                <span className="insight-token-age">↑ {w.buyVol} SOL bought</span>
                <span className="insight-token-age">↓ {w.sellVol} SOL sold</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturesSection() {
  const feats = [
    { num: '01', title: 'Instant Risk Score', desc: 'A 0-100 risk score calculated from mint authority, freeze authority, dev holdings, holder concentration and more.', tag: 'Free' },
    { num: '02', title: 'Bonding Curve Progress', desc: 'Exact SOL raised vs the 85 SOL graduation target. Know exactly how close a token is to PumpSwap.', tag: 'Free' },
    { num: '03', title: 'Mint & Freeze Authority', desc: 'Verify both authorities. A renounced token cannot inflate supply or freeze your wallet.', tag: 'Free' },
    { num: '04', title: 'Creator Wallet', desc: "See the dev wallet address and jump directly to their pump.fun profile to check all past launches.", tag: 'Free' },
    { num: '05', title: 'Sell Pressure Index', desc: 'Real ratio of unique sellers vs buyers in the last 100 trades. Not just volume — behavioral intent.', tag: 'Free' },
    { num: '06', title: 'Wash Trading Detection', desc: 'Wallets that both buy and sell to inflate volume. We calculate the exact % of fake volume. Axiom misses this entirely.', tag: 'Pro' },
    { num: '07', title: 'Full Holder Analysis', desc: 'Top 10 holders with LP addresses filtered out. See real distribution, not program accounts.', tag: 'Pro' },
    { num: '08', title: 'API Access', desc: 'Integrate Specter data into your own tools. Full REST API with your Pro subscription.', tag: 'Pro' },
  ];

  return (
    <div className="features">
      <div className="features-header">
        <div className="features-title">What Specter checks</div>
        <h2 className="features-h2">Every signal.<br/>One scan.</h2>
      </div>
      <div className="features-list">
        {feats.map((f, i) => (
          <div className="feat-row" key={i}>
            <span className="feat-row-num">{f.num}</span>
            <div className="feat-row-content">
              <span className="feat-row-title">{f.title}</span>
              <span className="feat-row-desc">{f.desc}</span>
            </div>
            <span className={`feat-row-tag ${f.tag === 'Pro' ? 'pro' : 'free'}`}>{f.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSection() {
  const freeFeats = [
    { text: '5 scans per day', included: true },
    { text: 'Risk score', included: true },
    { text: 'LP lock status', included: true },
    { text: 'Mint & freeze check', included: true },
    { text: 'Top 3 holders', included: true },
    { text: 'Bonding curve progress', included: true },
    { text: 'Full top 10 holders', included: false },
    { text: 'Dev wallet history', included: false },
    { text: 'Wallet alerts', included: false },
  ];
  const proFeats = [
    { text: 'Unlimited scans', included: true },
    { text: 'Risk score', included: true },
    { text: 'LP lock status', included: true },
    { text: 'Mint & freeze check', included: true },
    { text: 'Top 10 holders', included: true },
    { text: 'Bonding curve progress', included: true },
    { text: 'Full dev wallet history', included: true },
    { text: 'Wallet alerts', included: true },
    { text: 'API access', included: true },
  ];

  return (
    <div className="pricing">
      <div className="pricing-title">Pricing</div>
      <h2 className="pricing-h2">Simple. No surprises.</h2>
      <div className="pricing-grid">
        <div className="price-card">
          <div className="price-tier">Free</div>
          <div className="price-amount">$0</div>
          <div className="price-per">forever</div>
          <div className="price-features">
            {freeFeats.map((f, i) => (
              <div key={i} className={`price-feat ${f.included ? 'included' : ''}`}>
                <div className={`price-feat-dot ${f.included ? '' : 'off'}`}/>
                {f.text}
              </div>
            ))}
          </div>
          <button className="btn-plan free">Get started</button>
        </div>
        <div className="price-card featured">
          <div className="price-tier">Pro</div>
          <div className="price-amount">$9</div>
          <div className="price-per">per month</div>
          <div className="price-features">
            {proFeats.map((f, i) => (
              <div key={i} className={`price-feat ${f.included ? 'included' : ''}`}>
                <div className={`price-feat-dot ${f.included ? '' : 'off'}`}/>
                {f.text}
              </div>
            ))}
          </div>
          <button className="btn-plan pro" onClick={() => setView('pro')}>Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}


// ─── Live token ticker — real pump.fun launches ───────────────────────────────
const BACKEND_URL = 'https://specter-backend-production-95b1.up.railway.app';

function timeAgoMs(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

function LiveTicker() {
  const [tokens, setTokens] = React.useState([]);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    let es;
    function connect() {
      es = new EventSource(`${BACKEND_URL}/api/live`);
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data) && data.length > 0) setTokens(data.slice(0, 8));
        } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };
    }
    connect();
    return () => es?.close();
  }, []);

  // Refresh times every second
  const [, forceUpdate] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n+1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="live-ticker">
      <div className="live-ticker-label">
        <span className={`live-dot ${connected ? '' : 'disconnected'}`}/>
        {connected ? 'LIVE — NEW TOKENS ON PUMP.FUN' : 'CONNECTING...'}
      </div>
      <div className="live-ticker-list">
        {tokens.length === 0 && (
          <div style={{fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'var(--text3)', padding:'0.5rem 0'}}>
            Waiting for new launches...
          </div>
        )}
        {tokens.map((token, i) => (
          <a
            key={token.mint + i}
            className="live-ticker-row"
            href={`https://pump.fun/${token.mint}`}
            target="_blank"
            rel="noreferrer"
            style={{textDecoration:'none', animationDelay: `${i * 0.04}s`}}
          >
            <span className="live-ticker-name">${token.symbol || token.name?.slice(0,8)}</span>
            <span className="live-ticker-fullname">{token.name?.slice(0,16)}</span>
            <span className="live-ticker-mcap">{token.marketCap}</span>
            <span className="live-ticker-time">{timeAgoMs(token.time)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const step = to / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [to]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

// ─── Mock scan preview ────────────────────────────────────────────────────────
function MockScanPreview() {
  const checks = [
    { label: 'Mint Authority', val: 'Renounced', ok: true },
    { label: 'Freeze Authority', val: 'Renounced', ok: true },
    { label: 'Dev Holdings', val: '2.3%', ok: true },
    { label: 'Creator History', val: '8/10 survived', ok: true },
    { label: 'Sell Pressure', val: 'Neutral 48%', ok: null },
    { label: 'Wash Trading', val: '11% detected', ok: true },
  ];
  return (
    <div className="mock-preview">
      <div className="mock-header">
        <div className="mock-token">
          <div className="mock-img">🪙</div>
          <div>
            <div className="mock-name">EXAMPLE</div>
            <div className="mock-sym">$EXMPL</div>
          </div>
        </div>
        <div className="mock-score safe">23</div>
      </div>
      <div className="mock-checks">
        {checks.map((c, i) => (
          <div className="mock-check" key={i}>
            <span className="mock-check-label">{c.label}</span>
            <span className="mock-check-val">{c.val}</span>
            <span className={`mock-check-dot ${c.ok === true ? 'green' : c.ok === false ? 'red' : 'amber'}`}/>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [view, setView] = useState('home'); // home | pro
  const [scansUsed, setScansUsed] = useState(() => {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('specter_scans') || '{}');
    return stored.date === today ? stored.count : 0;
  });

  const scansLeft = MAX_FREE_SCANS - scansUsed;

  if (view === 'pro') return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0f1f14', color: '#e8f5ec', border: '1px solid rgba(0,255,136,0.2)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' } }} />
      <ProPage onBack={() => setView('home')} />
    </>
  );

  function incrementScans() {
    const today = new Date().toDateString();
    const newCount = scansUsed + 1;
    setScansUsed(newCount);
    localStorage.setItem('specter_scans', JSON.stringify({ date: today, count: newCount }));
  }

  async function handleScan() {
    if (!address.trim()) return toast.error('Enter a token address');
    if (scansLeft <= 0) return toast.error('Daily scan limit reached. Upgrade to Pro for unlimited scans.');

    setLoading(true);
    setResult(null);

    try {
      const data = await scanToken(address.trim());
      setResult(data);
      incrementScans();
    } catch (err) {
      toast.error(err.message || 'Scan failed. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleScan();
  }

  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#0f1f14', color: '#e8f5ec', border: '1px solid rgba(0,255,136,0.2)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' },
          success: { iconTheme: { primary: '#00ff88', secondary: '#0f1f14' } },
          error:   { iconTheme: { primary: '#ff4444', secondary: '#0f1f14' } },
        }}
      />

      {/* Nav */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark"><SpecterLogo /></div>
          <span className="nav-logo-text">Specter</span>
        </a>
        <div className="nav-right">
          <a href="https://x.com/LaunchNoxis" target="_blank" rel="noreferrer" className="nav-link">X / Twitter</a>
          <button className="btn-pro" onClick={() => setView('pro')}>Pro — $9/mo</button>
        </div>
      </nav>

      {/* Hero */}
      {!result && !loading && (
        <div className="hero-split">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot"/>
              Solana Token Scanner
            </div>
            <h1 className="hero-title">
              Know before<br/>you <span>buy.</span>
            </h1>
            <p className="hero-sub">
              The only scanner that shows you <strong>creator rug history</strong>, <strong>sell pressure</strong>, and <strong>wash trading</strong> — data Axiom doesn't give you.
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-val"><Counter to={48291}/></div>
                <div className="hero-stat-lbl">Tokens Scanned</div>
              </div>
              <div className="hero-stat-div"/>
              <div className="hero-stat">
                <div className="hero-stat-val"><Counter to={3847}/></div>
                <div className="hero-stat-lbl">Rugs Caught</div>
              </div>
              <div className="hero-stat-div"/>
              <div className="hero-stat">
                <div className="hero-stat-val"><Counter to={92} suffix="%"/></div>
                <div className="hero-stat-lbl">Accuracy</div>
              </div>
            </div>
            <div className="hero-diff">
              <div className="hero-diff-item">
                <span className="hero-diff-dot free"/>
                <span>Creator Wallet Profile — Free</span>
              </div>
              <div className="hero-diff-item">
                <span className="hero-diff-dot free"/>
                <span>Sell Pressure Index — Free</span>
              </div>
              <div className="hero-diff-item">
                <span className="hero-diff-dot pro"/>
                <span>Wash Trading Detection — Pro</span>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <MockScanPreview/>
            <LiveTicker/>
          </div>
        </div>
      )}

      {/* Scanner */}
      <div className={`scanner-wrap ${!result && !loading ? 'scanner-wrap-center' : ''}`}>
        <input
          className="scanner-input"
          placeholder="Paste token address..."
          value={address}
          onChange={e => setAddress(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="btn-scan" onClick={handleScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan →'}
        </button>
      </div>

      <div className="scanner-hint">
        <span className="scans-left">
          {scansLeft > 0 ? <><span>{scansLeft}</span> free scans remaining today</> : 'Daily limit reached — upgrade for unlimited'}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="scanning-wrap">
          <div className="scanning-orb"/>
          <div className="scanning-text">[ scanning on-chain data... ]</div>
        </div>
      )}

      {/* Results */}
      {result && <ScanResult data={result} isPro={false} />}

      {/* Features + Pricing (show when no result) */}
      {!result && !loading && (
        <>
          <FeaturesSection />
          <PricingSection />
        </>
      )}

      <footer className="footer">
        <span>Specter — Solana Token Scanner</span>
        <span>Data sourced from Solana RPC · Not financial advice</span>
      </footer>
    </div>
  );
}
