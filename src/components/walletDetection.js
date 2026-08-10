const WALLET_CONFIG = {
  coinbase: {
    id: "coinbase",
    name: "Coinbase Wallet",
    rdns: ["com.coinbase.wallet"],
    nameHints: ["coinbase"]
  },
  trust: {
    id: "trust",
    name: "Trust Wallet",
    rdns: ["com.trustwallet.app"],
    nameHints: ["trust wallet", "trust"]
  }
};

let activeAnnouncementScan = null;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function identifyWallet(info) {
  const rdns = normalize(info?.rdns);
  const name = normalize(info?.name);

  for (const wallet of Object.values(WALLET_CONFIG)) {
    if (wallet.rdns.some((value) => rdns === normalize(value))) {
      return wallet.id;
    }

    if (wallet.nameHints.some((hint) => name.includes(normalize(hint)))) {
      return wallet.id;
    }
  }

  return null;
}

function readProviderFlag(provider, property) {
  try {
    return Boolean(provider?.[property]);
  } catch {
    return false;
  }
}

function getLegacyProviders() {
  try {
    const ethereum = window.ethereum;
    if (!ethereum) return [];

    return Array.isArray(ethereum.providers)
      ? ethereum.providers
      : [ethereum];
  } catch {
    return [];
  }
}

function findLegacyProvider(walletId, legacyProviders = []) {
  return legacyProviders.find((provider) => {
    if (walletId === "coinbase") {
      return readProviderFlag(provider, "isCoinbaseWallet");
    }

    return (
      readProviderFlag(provider, "isTrust") ||
      readProviderFlag(provider, "isTrustWallet")
    );
  });
}

export function detectEip6963Wallets(timeout = 1200) {
  return new Promise((resolve) => {
    const announced = new Map();

    function onProvider(event) {
      const detail = event?.detail;
      if (!detail?.info || !detail?.provider) return;

      const walletId = identifyWallet(detail.info);
      if (!walletId) return;

      const key =
        detail.info.uuid ||
        `${detail.info.rdns || "unknown"}:${detail.info.name || walletId}`;

      announced.set(key, {
        info: detail.info,
        provider: detail.provider,
        walletId
      });
    }

    window.addEventListener("eip6963:announceProvider", onProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onProvider);
      resolve([...announced.values()]);
    }, timeout);
  });
}

function getSharedAnnouncements(timeout) {
  if (!activeAnnouncementScan) {
    activeAnnouncementScan = detectEip6963Wallets(timeout).finally(() => {
      activeAnnouncementScan = null;
    });
  }

  return activeAnnouncementScan;
}

function resolveWallet(walletId, announced, legacyProviders = []) {
  const config = WALLET_CONFIG[walletId];
  const eip6963 = announced.find((item) => item.walletId === walletId);

  if (eip6963) {
    return {
      ...config,
      installed: true,
      provider: eip6963.provider,
      info: eip6963.info,
      source: "eip6963"
    };
  }

  const legacyProvider = findLegacyProvider(walletId, legacyProviders);
  if (!legacyProvider) return null;

  return {
    ...config,
    installed: true,
    provider: legacyProvider,
    info: {
      name: config.name,
      rdns: `legacy:${walletId}`
    },
    source: "legacy"
  };
}

export async function detectWallets(timeout = 1200) {
  const announced = await getSharedAnnouncements(timeout);
  const legacyProviders = getLegacyProviders();

  return Object.keys(WALLET_CONFIG).reduce((accumulator, walletId) => {
    const resolvedWallet = resolveWallet(walletId, announced, legacyProviders);

    accumulator[walletId] = {
      detected: Boolean(resolvedWallet),
      provider: resolvedWallet?.provider || null,
      info: resolvedWallet?.info || null,
      source: resolvedWallet?.source || null
    };

    return accumulator;
  }, {});
}

export async function detectCoinbaseWallet(timeout = 1200) {
  const announced = await getSharedAnnouncements(timeout);
  return resolveWallet("coinbase", announced, getLegacyProviders());
}

export async function detectTrustWallet(timeout = 1200) {
  const announced = await getSharedAnnouncements(timeout);
  return resolveWallet("trust", announced, getLegacyProviders());
}

export async function connectEvmWallet(provider) {
  if (typeof provider?.request !== "function") {
    throw new Error("This wallet does not expose an EVM provider.");
  }

  const accounts = await provider.request({
    method: "eth_requestAccounts"
  });

  return Array.isArray(accounts) ? accounts : [];
}

export function shortAddress(address) {
  if (!address) return "";
  if (address.length < 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
