import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { scanToken } from './lib/api';
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

function CheckCard({ label, value, subtext, status }) {
  return (
    <div className="check-card">
      <div className="check-top">
        <span className="check-label">{label}</span>
        <span className={`check-status ${status}`}>
          {status === 'pass' ? 'SAFE' : status === 'fail' ? 'RISK' : 'WARN'}
        </span>
      </div>
      <div className="check-value">{value}</div>
      {subtext && <div className="check-sub">{subtext}</div>}
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
  const { token, checks, holders, bondingCurve, stats } = data;
  const score = data.riskScore;

  return (
    <div className="results">
      <RiskBanner score={score} />

      {/* Token header */}
      <div className="token-header">
        <div className="token-img">
          {token.image ? <img src={token.image} alt={token.name} /> : '🪙'}
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
          <div className="stat-val">${stats.marketCapK}K</div>
          <div className="stat-lbl">Market Cap</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{stats.age}</div>
          <div className="stat-lbl">Token Age</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{stats.holders}</div>
          <div className="stat-lbl">Holders</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{stats.txns}</div>
          <div className="stat-lbl">Transactions</div>
        </div>
      </div>

      {/* Security checks */}
      <div className="checks-grid">
        <CheckCard
          label="LP Lock"
          value={checks.lpLocked ? `Locked ${checks.lpLockDuration}` : 'Not Locked'}
          subtext={checks.lpLocked ? `${checks.lpLockPct}% of LP secured` : 'LP can be pulled anytime'}
          status={checks.lpLocked ? 'pass' : 'fail'}
        />
        <CheckCard
          label="Mint Authority"
          value={checks.mintRenounced ? 'Renounced' : 'Not Renounced'}
          subtext={checks.mintRenounced ? 'Supply is fixed forever' : 'Dev can mint new tokens'}
          status={checks.mintRenounced ? 'pass' : 'fail'}
        />
        <CheckCard
          label="Freeze Authority"
          value={checks.freezeRenounced ? 'Renounced' : 'Not Renounced'}
          subtext={checks.freezeRenounced ? 'Wallets cannot be frozen' : 'Dev can freeze wallets'}
          status={checks.freezeRenounced ? 'pass' : 'fail'}
        />
        <CheckCard
          label="Dev Holdings"
          value={`${checks.devHoldingPct}%`}
          subtext={checks.devHoldingPct > 10 ? 'High dev concentration' : 'Acceptable dev allocation'}
          status={checks.devHoldingPct > 15 ? 'fail' : checks.devHoldingPct > 8 ? 'warn' : 'pass'}
        />
      </div>

      {/* Bonding curve (free) */}
      <div className="curve-card">
        <div className="curve-title">Bonding Curve Progress</div>
        <div className="curve-bar-wrap">
          <div className="curve-bar" style={{ width: `${bondingCurve.progress}%` }} />
        </div>
        <div className="curve-labels">
          <span>{bondingCurve.progress.toFixed(1)}% complete</span>
          <span>{100 - bondingCurve.progress}% to graduation</span>
        </div>
      </div>

      {/* Top 3 holders (free) */}
      <div className="holders-card">
        <div className="holders-title">Top Holders {!isPro && '(Top 3 — Free Plan)'}</div>
        {(isPro ? holders : holders.slice(0, 3)).map((h, i) => (
          <HolderRow key={i} rank={i+1} address={h.address} pct={h.pct} />
        ))}
      </div>

      {/* Pro gate */}
      {!isPro && (
        <div className="pro-gate">
          <div className="pro-gate-title">Unlock Full Analysis</div>
          <div className="pro-gate-sub">
            Full top 10 holders, dev wallet transaction history, wallet alerts, and unlimited scans — $9/mo
          </div>
          <button className="btn-upgrade" onClick={() => toast('Coming soon — join the waitlist at specter.gg')}>
            Upgrade to Pro →
          </button>
        </div>
      )}
    </div>
  );
}

function FeaturesSection() {
  const feats = [
    {
      num: '01',
      title: 'Instant Risk Score',
      desc: 'Get a 0-100 risk score the moment you paste a contract address. Powered by real on-chain data.',
      tag: 'Free',
    },
    {
      num: '02',
      title: 'LP Lock Detection',
      desc: 'See if liquidity is locked, for how long, and what percentage. Know before you buy.',
      tag: 'Free',
    },
    {
      num: '03',
      title: 'Mint & Freeze Authority',
      desc: 'A renounced token cannot have its supply inflated or wallets frozen. We check both.',
      tag: 'Free',
    },
    {
      num: '04',
      title: 'Bonding Curve Progress',
      desc: 'Track pump.fun bonding curve progress and see how close a token is to graduating.',
      tag: 'Free',
    },
    {
      num: '05',
      title: 'Holder Concentration',
      desc: 'See who holds what. High concentration in a few wallets means high dump risk.',
      tag: 'Free',
    },
    {
      num: '06',
      title: 'Dev Wallet History',
      desc: 'See every transaction the dev wallet has made. Track their moves before they dump on you.',
      tag: 'Pro',
    },
    {
      num: '07',
      title: 'Wallet Alerts',
      desc: 'Get notified the moment a tracked wallet buys or sells. Never miss a move.',
      tag: 'Pro',
    },
    {
      num: '08',
      title: 'API Access',
      desc: 'Integrate Specter data into your own tools. Full REST API with your Pro subscription.',
      tag: 'Pro',
    },
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
          <button className="btn-plan pro" onClick={() => toast('Coming soon!')}>Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scansUsed, setScansUsed] = useState(() => {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('specter_scans') || '{}');
    return stored.date === today ? stored.count : 0;
  });

  const scansLeft = MAX_FREE_SCANS - scansUsed;

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
          <button className="btn-pro" onClick={() => toast('Pro coming soon!')}>Pro — $9/mo</button>
        </div>
      </nav>

      {/* Hero */}
      {!result && !loading && (
        <div className="hero">
          <div className="hero-badge">
            <span className="hero-badge-dot"/>
            Solana Token Scanner
          </div>
          <h1 className="hero-title">
            Know before<br/>you <span>buy.</span>
          </h1>
          <p className="hero-sub">
            Paste any pump.fun token address and get an instant risk analysis. LP lock, mint authority, holder concentration, bonding curve — all in one place.
          </p>
        </div>
      )}

      {/* Scanner */}
      <div className="scanner-wrap">
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
