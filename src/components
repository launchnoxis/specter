import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const RECEIVER_WALLET = 'VSnsBiRDhn1CgzuzD8YP9ZH811njRJ6t3NQN2SCKwzd';
const SOL_AMOUNT = 0.06; // ~$9 worth of SOL
const LAMPORTS = SOL_AMOUNT * 1_000_000_000;
const BACKEND = 'https://specter-backend-production-95b1.up.railway.app';

export default function ProPage({ onBack }) {
  const [step, setStep] = useState('info'); // info | paying | done
  const [txSig, setTxSig] = useState('');
  const [email, setEmail] = useState('');
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    if (!window.solana?.isPhantom && !window.solana) {
      return toast.error('Please install Phantom wallet to pay with SOL');
    }

    setPaying(true);
    try {
      // Connect wallet
      const resp = await window.solana.connect();
      const senderPubkey = resp.publicKey.toString();

      // Build transaction
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: resp.publicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: resp.publicKey,
          toPubkey: new PublicKey(RECEIVER_WALLET),
          lamports: LAMPORTS,
        })
      );

      // Sign and send
      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(sig, 'confirmed');

      setTxSig(sig);

      // Notify backend to send email
      await fetch(`${BACKEND}/api/pro-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: senderPubkey, signature: sig, email }),
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
            <p className="pro-page-sub">Unlock the full scanner. Pay once per month directly with SOL — no credit card, no sign up.</p>

            <div className="pro-features-list">
              {[
                ['Unlimited scans', true],
                ['Full top 10 holders', true],
                ['Dev wallet history', true],
                ['Wallet alerts', true],
                ['API access', true],
                ['Risk score + LP check', true],
              ].map(([feat, inc], i) => (
                <div className="pro-feat-row" key={i}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {feat}
                </div>
              ))}
            </div>

            <div className="pro-price-box">
              <div className="pro-price-sol">{SOL_AMOUNT} SOL</div>
              <div className="pro-price-usd">≈ $9 / month</div>
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

            <button className="pro-pay-btn" onClick={handlePay} disabled={paying}>
              {paying ? 'Processing...' : `Pay ${SOL_AMOUNT} SOL with Phantom →`}
            </button>

            <div className="pro-note">
              Payment goes directly to the Specter wallet. Access is activated manually within 24 hours. Your wallet address is used to verify your subscription.
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="pro-done">
            <div className="pro-done-icon">✓</div>
            <h2 className="pro-done-title">Payment Confirmed</h2>
            <p className="pro-done-sub">Your payment was received. Pro access will be activated within 24 hours. Check your email for confirmation.</p>
            <a
              href={`https://solscan.io/tx/${txSig}`}
              target="_blank"
              rel="noreferrer"
              className="pro-tx-link"
            >
              View transaction on Solscan →
            </a>
            <button className="pro-pay-btn" style={{marginTop:'1.5rem'}} onClick={onBack}>Back to Scanner</button>
          </div>
        )}

      </div>
    </div>
  );
}
