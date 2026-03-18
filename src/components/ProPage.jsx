import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const RECEIVER_WALLET = 'VSnsBiRDhn1CgzuzD8YP9ZH811njRJ6t3NQN2SCKwzd';
const USD_AMOUNT = 9;
const BACKEND = 'https://specter-backend-production-95b1.up.railway.app';

export default function ProPage({ onBack }) {
  const [step, setStep] = useState('info');
  const [txSig, setTxSig] = useState('');
  const [email, setEmail] = useState('');
  const [paying, setPaying] = useState(false);
  const [solPrice, setSolPrice] = useState(null);
  const [solAmount, setSolAmount] = useState(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await res.json();
        const price = data.solana.usd;
        setSolPrice(price);
        setSolAmount(parseFloat((USD_AMOUNT / price).toFixed(4)));
      } catch {
        setSolPrice(150);
        setSolAmount(0.06);
      }
    }
    fetchPrice();
  }, []);

  function getWallet() {
    return window.solana || window.solflare || window.backpack || null;
  }

  async function handlePay() {
    const wallet = getWallet();
    if (!wallet) return toast.error('No Solana wallet found. Install Phantom or Solflare.');
    if (!solAmount) return toast.error('Still loading SOL price, please wait...');

    setPaying(true);
    try {
      const resp = await wallet.connect();
      const pubkey = resp.publicKey || wallet.publicKey;
      const lamports = Math.round(solAmount * 1_000_000_000);
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: pubkey }).add(
        SystemProgram.transfer({
          fromPubkey: pubkey,
          toPubkey: new PublicKey(RECEIVER_WALLET),
          lamports,
        })
      );

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(sig, 'confirmed');
      setTxSig(sig);

      await fetch(`${BACKEND}/api/pro-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: pubkey.toString(), signature: sig, email, solAmount, usdAmount: USD_AMOUNT }),
      });

      setStep('done');
      toast.success('Payment confirmed!');
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="pro-page">
      <div className="pro-page-inner">
        <button className="pro-back" onClick={onBack}>← Back</button>

        {step === 'info' && (
          <>
            <div className="pro-page-badge">PRO</div>
            <h1 className="pro-page-title">Specter Pro</h1>
            <p className="pro-page-sub">Unlock the full scanner. Pay directly with SOL — no credit card, no sign up.</p>

            <div className="pro-features-list">
              {['Unlimited scans','Full top 10 holders','Dev wallet history','Wallet alerts','API access','Risk score + LP check'].map((feat, i) => (
                <div className="pro-feat-row" key={i}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {feat}
                </div>
              ))}
            </div>

            <div className="pro-price-box">
              <div className="pro-price-sol">{solAmount ? `${solAmount} SOL` : 'Loading...'}</div>
              <div className="pro-price-usd">
                = ${USD_AMOUNT} / month
                {solPrice && <span style={{marginLeft:8,opacity:0.5,fontSize:'0.7rem'}}>@ ${solPrice.toFixed(2)}/SOL</span>}
              </div>
            </div>

            <div className="pro-input-wrap">
              <input
                className="pro-email-input"
                type="email"
                placeholder="Your email (optional — for access confirmation)"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button className="pro-pay-btn" onClick={handlePay} disabled={paying || !solAmount}>
              {paying ? 'Processing...' : `Pay ${solAmount ? solAmount + ' SOL' : '...'} →`}
            </button>

            <div className="pro-wallets">
              <span>Works with</span>
              <span className="pro-wallet-tag">Phantom</span>
              <span className="pro-wallet-tag">Solflare</span>
              <span className="pro-wallet-tag">Backpack</span>
            </div>

            <div className="pro-note">
              Payment goes directly to the Specter wallet. Access is activated manually within 24 hours.
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="pro-done">
            <div className="pro-done-icon">✓</div>
            <h2 className="pro-done-title">Payment Confirmed</h2>
            <p className="pro-done-sub">Your payment was received. Pro access will be activated within 24 hours. Check your email for confirmation.</p>
            <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer" className="pro-tx-link">View transaction on Solscan →</a>
            <button className="pro-pay-btn" style={{marginTop:'1.5rem'}} onClick={onBack}>Back to Scanner</button>
          </div>
        )}
      </div>
    </div>
  );
}
