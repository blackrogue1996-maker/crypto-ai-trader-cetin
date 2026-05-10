import React, { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Scatter,
} from "recharts";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  Star,
} from "lucide-react";



const sendTelegramSignal = async (message) => {
  try {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    console.log("Telegram sinyali gönderildi");
  } catch (err) {
    console.error("Telegram gönderim hatası:", err);
  }
};

const APP_PUBLIC_URL = "https://kriptoyzpro.com";

const PACKAGE_LEVELS = {
  SERBEST: 0,
  PLATIN: 1,
  ALTIN: 2,
  ELITE: 3,
  ULTRA: 4,
};

const normalizePackageName = (pkg = "SERBEST") =>
  String(pkg || "SERBEST")
    .toUpperCase()
    .replaceAll("İ", "I")
    .replace("PLATIN", "PLATIN")
    .replace("ELITE", "ELITE");

const getPackageLevel = (pkg = "SERBEST") => PACKAGE_LEVELS[normalizePackageName(pkg)] ?? 0;

const canUsePackageLevel = (userPackage = "SERBEST", requiredPackage = "SERBEST") =>
  getPackageLevel(userPackage) >= getPackageLevel(requiredPackage);

const getSignalRequiredPackage = (signal = {}) => {
  const score = Number(signal?.score ?? signal?.skor ?? 0);
  if (score >= 90) return "ULTRA";
  if (score >= 80) return "ELITE";
  if (score >= 70) return "ALTIN";
  if (score >= 60) return "PLATIN";
  return "SERBEST";
};



const getFirebaseApiKey = () =>
  import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDLL9Mm3YagSM7lCE9tZxP_QhpgcynbGBM";

const firebaseSignUpWithEmail = async (email, password) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${getFirebaseApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "SIGNUP_ERROR");
  return data;
};

const firebaseLoginWithEmail = async (email, password) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${getFirebaseApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "LOGIN_ERROR");
  return data;
};

const GM_USERNAME = "Gm54";
const GM_PASSWORD = "0956711996";
const DEFAULT_USERS = [
  { username: GM_USERNAME, password: GM_PASSWORD, name: "GM Yönetici", email: "gm54@traderpro.com", role: "GM", package: "ULTRA", expiresAt: "2099-12-31T23:59:59.000Z", status: "active" },
];

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const normalizeUser = (user) => ({
  role: "user",
  package: "SERBEST",
  expiresAt: null,
  status: "active",
  ...user,
});

const getStoredUsers = () => {
  const saved = readJson("trader_users", []);
  const merged = [...DEFAULT_USERS, ...saved].map(normalizeUser);
  const map = new Map();
  merged.forEach((u) => map.set(String(u.username).toLowerCase(), u));
  return Array.from(map.values());
};

const saveStoredUsers = (users) => {
  const normalUsers = users.filter((u) => String(u.role).toUpperCase() !== "GM");
  writeJson("trader_users", normalUsers.map(normalizeUser));
};

const addDaysIso = (days) => {
  if (days === "SINIRSIZ") return "2099-12-31T23:59:59.000Z";
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 30));
  return d.toISOString();
};


class ChartSafeBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorKey: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn("Grafik verisi temizlendi:", error, info);
    window.setTimeout(() => {
      this.setState((prev) => ({ hasError: false, errorKey: prev.errorKey + 1 }));
    }, 150);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[220px] w-full rounded-2xl border border-cyan-400/20 bg-black/30 flex items-center justify-center text-cyan-200 text-sm font-bold">
          Grafik verisi temizleniyor...
        </div>
      );
    }
    return <React.Fragment key={this.state.errorKey}>{this.props.children}</React.Fragment>;
  }
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorKey: 0 };
  }

  static getDerivedStateFromError(error) {
    console.warn("Geçici render hatası yakalandı:", error?.message || error);
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn("Panel otomatik toparlanıyor:", error, info);
    window.setTimeout(() => {
      this.setState((prev) => ({ hasError: false, errorKey: prev.errorKey + 1 }));
    }, 80);
  }

  render() {
    // Artık kullanıcıyı büyük hata ekranına düşürmüyoruz.
    // Hata gelirse 80ms içinde aynı ekran temiz state ile tekrar açılır.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex items-center justify-center">
          <div className="rounded-3xl border border-cyan-300/20 bg-white/10 px-6 py-4 text-cyan-100 font-black animate-pulse">
            Veri temizleniyor...
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.errorKey}>{this.props.children}</React.Fragment>;
  }
}

function TraderProApp() {
  const [favorites, setFavorites] = useState([]);
  const [coins, setCoins] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const packagesRef = useRef(null);
  const telegramCheckRef = useRef(0);
  const [highlightPackage, setHighlightPackage] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [plan, setPlan] = useState(() => {
    try {
      const savedPlan = localStorage.getItem("trader_plan");
      if (savedPlan) return savedPlan;
      const savedSub = localStorage.getItem("trader_subscription");
      if (savedSub) return JSON.parse(savedSub)?.plan || "SERBEST";
    } catch {}
    return "SERBEST";
  });
  const [trendData, setTrendData] = useState([]);
  const [candleSignals, setCandleSignals] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("trader_current_user");
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authEmailConfirm, setAuthEmailConfirm] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showResetBox, setShowResetBox] = useState(false);
  const [demoUsers, setDemoUsers] = useState(() => getStoredUsers());
  const [gmMode, setGmMode] = useState(() => {
    try { return localStorage.getItem("trader_gm_mode") === "1"; } catch { return false; }
  });
  const [gmNewUser, setGmNewUser] = useState({ username: "", password: "", name: "", email: "", package: "SERBEST", days: "30" });
  const [gmNotice, setGmNotice] = useState("");
  const [gmSearch, setGmSearch] = useState("");
  const [activeSubscription, setActiveSubscription] = useState(() => {
    try {
      const saved = localStorage.getItem("trader_subscription");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { plan: "SERBEST", purchasedAt: null, expiresAt: null };
  });
  const [signalSnapshots, setSignalSnapshots] = useState(() => {
    try {
      const saved = localStorage.getItem("trader_signal_snapshots");
      if (saved) return JSON.parse(saved) || {};
    } catch {}
    return {};
  });
  const [purchaseNotice, setPurchaseNotice] = useState("");

  useEffect(() => {
    saveStoredUsers(demoUsers);
  }, [demoUsers]);

  useEffect(() => {
    if (!currentUser || String(currentUser.role).toUpperCase() === "GM") return;
    const synced = normalizeUser({
      ...currentUser,
      username: currentUser.username || currentUser.email || `user_${Date.now()}`,
      email: currentUser.email || "",
      name: currentUser.name || currentUser.username || currentUser.email || "Kullanıcı",
      createdAt: currentUser.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
    setDemoUsers((prev) => {
      const key = String(synced.username || synced.email).toLowerCase();
      const exists = prev.some((u) =>
        String(u.username || "").toLowerCase() === key ||
        (synced.email && String(u.email || "").toLowerCase() === String(synced.email).toLowerCase())
      );
      if (exists) return prev.map((u) => {
        const same = String(u.username || "").toLowerCase() === key ||
          (synced.email && String(u.email || "").toLowerCase() === String(synced.email).toLowerCase());
        return same ? normalizeUser({ ...u, ...synced }) : u;
      });
      return [...prev, synced];
    });
  }, [currentUser]);

  useEffect(() => {
    const stopBadRuntimeData = (event) => {
      const msg = String(event?.reason?.message || event?.error?.message || event?.message || "");
      if (/ResizeObserver|recharts|NaN|undefined|null|Cannot read|graph|chart|veri|data/i.test(msg)) {
        console.warn("Geçici grafik/veri hatası ekrana düşmeden yakalandı:", msg);
        event?.preventDefault?.();
        return false;
      }
    };
    window.addEventListener("error", stopBadRuntimeData);
    window.addEventListener("unhandledrejection", stopBadRuntimeData);
    return () => {
      window.removeEventListener("error", stopBadRuntimeData);
      window.removeEventListener("unhandledrejection", stopBadRuntimeData);
    };
  }, []);

  const scrollToPackagesAndGlow = (packageKey) => {
    try {
      packagesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (packageKey) {
        setHighlightPackage(packageKey);
        window.setTimeout(() => {
          setHighlightPackage((current) => (current === packageKey ? "" : current));
        }, 5000);
      }
    } catch {}
  };

  const safeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatPrice = (value) => {
    const n = safeNumber(value);
    return n.toFixed(n > 0 && n < 1 ? 6 : 2);
  };

  function calculateEMAChart(prices, period) {
    if (!prices || prices.length === 0) return [];
    const k = 2 / (period + 1);
    let ema = prices[0];

    return prices.map((price) => {
      ema = price * k + ema * (1 - k);
      return ema;
    });
  }

  function calculateMACDChart(prices) {
    if (!prices || prices.length === 0) return [];

    const ema12 = calculateEMAChart(prices, 12);
    const ema26 = calculateEMAChart(prices, 26);

    const macdLine = prices.map((_, i) => ema12[i] - ema26[i]);
    const signalLine = calculateEMAChart(macdLine, 9);

    return prices.map((_, i) => ({
      time: String(i + 1),
      dif: macdLine[i],
      dea: signalLine[i],
      hist: macdLine[i] - signalLine[i],
    }));
  }

  function calculateSignals(macdData) {
    return macdData.map((item, i) => {
      if (i === 0) return { ...item, signal: null };
      const prev = macdData[i - 1];

      if (item.dif > item.dea && prev.dif <= prev.dea) {
        return { ...item, signal: "BUY" };
      }

      if (item.dif < item.dea && prev.dif >= prev.dea) {
        return { ...item, signal: "SELL" };
      }

      return { ...item, signal: null };
    });
  }

  function calculateRSIValue(prices, period = 14) {
    if (!prices || prices.length <= period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  const demoPrices = [
    100, 102, 101, 105, 103, 108, 104, 110, 107, 115, 112, 118, 114, 120,
    117, 122, 119, 125, 121, 126, 123, 129, 124,
  ];

  const cleanedLivePrices = Array.isArray(trendData) && trendData.length > 0
    ? trendData.map((d) => safeNumber(d?.price, NaN)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const livePrices = (cleanedLivePrices.length >= 20 ? cleanedLivePrices : demoPrices).slice(-100);

  const rsiData = livePrices.map((price, i) => ({
    time: String(i + 1),
    value:
      i >= 14
        ? calculateRSIValue(livePrices.slice(i - 14, i + 1))
        : 50,
  }));

  const macdData = calculateSignals(calculateMACDChart(livePrices));

  const getTrendAnalysis = (price) => {
    const base = safeNumber(price, 100);

    const data = [
      { time: "1", price: base * 0.94, trend: base * 0.93 },
      { time: "2", price: base * 0.96, trend: base * 0.945 },
      { time: "3", price: base * 0.955, trend: base * 0.96 },
      { time: "4", price: base * 0.99, trend: base * 0.975 },
      { time: "5", price: base * 1.01, trend: base * 0.99 },
      { time: "6", price: base * 1.035, trend: base * 1.005 },
      { time: "7", price: base * 1.02, trend: base * 1.02 },
      { time: "8", price: base * 1.055, trend: base * 1.035 },
      { time: "9", price: base * 1.02, trend: base * 1.05 },
      { time: "10", price: base * 0.995, trend: base * 1.065 },
      { time: "11", price: base * 1.015, trend: base * 1.08 },
      { time: "12", price: base * 0.98, trend: base * 1.095 },
    ];

    return {
      data,
      resistance: base * 1.055,
      support: base * 0.98,
      retestTop: base * 1.025,
      retestBottom: base * 0.995,
      breakPoint: [{ time: "10", price: base * 0.995 }],
      retestPoint: [{ time: "11", price: base * 1.015 }],
    };
  };

  const getTrendAnalysisFromCandles = (candles, fallbackPrice = 100) => {
    if (!candles || candles.length < 10) {
      return getTrendAnalysis(fallbackPrice);
    }

    const last = candles
      .filter((d) =>
        d &&
        Number.isFinite(Number(d.price)) &&
        Number.isFinite(Number(d.high)) &&
        Number.isFinite(Number(d.low))
      )
      .slice(-30);

    if (last.length < 10) {
      return getTrendAnalysis(fallbackPrice);
    }

    const highs = last.map((d) => safeNumber(d.high));
    const lows = last.map((d) => safeNumber(d.low));

    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    if (!Number.isFinite(resistance) || !Number.isFinite(support) || resistance <= 0 || support <= 0) {
      return getTrendAnalysis(fallbackPrice);
    }

    const firstLow = lows[0];
    const lastLow = lows[lows.length - 1];
    const slope = (lastLow - firstLow) / Math.max(1, last.length - 1);

    const data = last.map((d, i) => ({
      time: d.time,
      price: d.price,
      trend: firstLow + slope * i,
    }));

    const breakPoint = data.filter((d) => d.price < d.trend).slice(0, 1);
    const retestPoint = data
      .filter((d) => d.price > support && d.price < resistance)
      .slice(-1);

    return {
      data,
      resistance,
      support,
      retestTop: resistance,
      retestBottom: support,
      breakPoint,
      retestPoint,
    };
  };


  const calculateEMAValue = (values, period) => {
    const clean = (values || []).map((v) => safeNumber(v)).filter((v) => Number.isFinite(v));
    if (clean.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = clean[0];
    for (let i = 1; i < clean.length; i++) {
      ema = clean[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const calculateMACDValues = (closes) => {
    const clean = (closes || []).map((v) => safeNumber(v)).filter((v) => Number.isFinite(v) && v > 0);
    if (clean.length < 35) return { macd: 0, signalLine: 0, histogram: 0, crossedUp: false, crossedDown: false };

    const emaSeries = (arr, period) => {
      const k = 2 / (period + 1);
      let ema = arr[0];
      return arr.map((price, i) => {
        if (i === 0) return ema;
        ema = price * k + ema * (1 - k);
        return ema;
      });
    };

    const ema12 = emaSeries(clean, 12);
    const ema26 = emaSeries(clean, 26);
    const macdLine = clean.map((_, i) => ema12[i] - ema26[i]);
    const signalSeries = emaSeries(macdLine, 9);
    const last = macdLine.length - 1;
    const prev = Math.max(0, last - 1);
    return {
      macd: macdLine[last],
      signalLine: signalSeries[last],
      histogram: macdLine[last] - signalSeries[last],
      crossedUp: macdLine[last] > signalSeries[last] && macdLine[prev] <= signalSeries[prev],
      crossedDown: macdLine[last] < signalSeries[last] && macdLine[prev] >= signalSeries[prev],
    };
  };

  const analyzeCandlesForSignal = (candles, fallbackCoin = null) => {
    const clean = Array.isArray(candles)
      ? candles
          .map((c, i) => ({
            time: c?.time ?? String(i + 1),
            price: safeNumber(c?.price),
            high: safeNumber(c?.high),
            low: safeNumber(c?.low),
            volume: safeNumber(c?.volume),
          }))
          .filter((c) => c.price > 0 && c.high > 0 && c.low > 0 && Number.isFinite(c.volume))
      : [];

    if (clean.length < 35) return null;

    const closes = clean.map((c) => c.price);
    const highs = clean.map((c) => c.high);
    const lows = clean.map((c) => c.low);
    const volumes = clean.map((c) => c.volume);

    const lastClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2] || lastClose;
    const rsi = calculateRSIValue(closes.slice(-60), 14);
    const ema9 = calculateEMAValue(closes.slice(-50), 9);
    const ema20 = calculateEMAValue(closes.slice(-70), 20);
    const ema50 = calculateEMAValue(closes.slice(-100), 50);
    const macdInfo = calculateMACDValues(closes.slice(-100));

    const lookback = clean.slice(-36, -1);
    const resistance = Math.max(...lookback.map((c) => c.high));
    const support = Math.min(...lookback.map((c) => c.low));
    const avgVolume = volumes.slice(-36, -1).reduce((a, b) => a + b, 0) / Math.max(1, volumes.slice(-36, -1).length);
    const lastVolume = volumes[volumes.length - 1] || 0;
    const volumeRatio = avgVolume > 0 ? lastVolume / avgVolume : 1;
    const volumeBoost = volumeRatio >= 1.18;
    const volumeWeak = volumeRatio < 0.72;

    const recent = clean.slice(-24);
    const firstClose = recent[0]?.price || lastClose;
    const lastRecentClose = recent[recent.length - 1]?.price || lastClose;
    const trendSlopePct = firstClose > 0 ? ((lastRecentClose - firstClose) / firstClose) * 100 : 0;
    const trendUp = trendSlopePct > 0.25 && ema9 >= ema20 && ema20 >= ema50;
    const trendDown = trendSlopePct < -0.25 && ema9 <= ema20 && ema20 <= ema50;

    const resistanceBreak = lastClose > resistance * 1.001 && prevClose <= resistance;
    const supportBreak = lastClose < support * 0.999 && prevClose >= support;
    const nearResistance = resistance > 0 ? (resistance - lastClose) / resistance < 0.006 : false;
    const nearSupport = support > 0 ? (lastClose - support) / support < 0.006 : false;

    const emaBull = lastClose > ema9 && ema9 >= ema20 && ema20 >= ema50;
    const emaBear = lastClose < ema9 && ema9 <= ema20 && ema20 <= ema50;
    const macdBull = macdInfo.macd > macdInfo.signalLine && macdInfo.histogram > 0;
    const macdBear = macdInfo.macd < macdInfo.signalLine && macdInfo.histogram < 0;
    const rsiBull = rsi >= 48 && rsi <= 66;
    const rsiHot = rsi > 70;
    const rsiBear = rsi <= 42;

    const greenVolume = recent.filter((c, i) => i > 0 && c.price >= recent[i - 1].price).reduce((a, c) => a + c.volume, 0);
    const redVolume = recent.filter((c, i) => i > 0 && c.price < recent[i - 1].price).reduce((a, c) => a + c.volume, 0);
    const totalDirectionalVolume = Math.max(1, greenVolume + redVolume);
    const moneyIn = Math.round((greenVolume / totalDirectionalVolume) * 100);
    const moneyOut = Math.max(0, 100 - moneyIn);
    const traderBias = moneyIn >= 58 ? "ALICI YOĞUN" : moneyOut >= 58 ? "SATICI YOĞUN" : "DENGELİ";

    const newsPulseRaw = safeNumber(fallbackCoin?.priceChangePercent) + (volumeRatio - 1) * 2 + trendSlopePct / 3;
    const newsSentiment = newsPulseRaw >= 1.2 ? "POZİTİF" : newsPulseRaw <= -1.2 ? "NEGATİF" : "NÖTR";
    const whaleFlow = Math.round(Math.min(95, Math.max(5, volumeRatio * 28 + Math.abs(trendSlopePct) * 5)));

    let score = 50;
    if (rsiBull) score += 11;
    if (rsiHot) score -= 13;
    if (rsiBear) score -= 10;
    if (emaBull) score += 18;
    if (emaBear) score -= 18;
    if (macdBull) score += 16;
    if (macdBear) score -= 16;
    if (macdInfo.crossedUp) score += 9;
    if (macdInfo.crossedDown) score -= 12;
    if (trendUp) score += 15;
    if (trendDown) score -= 15;
    if (resistanceBreak && volumeBoost) score += 18;
    if (resistanceBreak && !volumeBoost) score += 6;
    if (supportBreak) score -= 18;
    if (nearResistance && !resistanceBreak) score -= 6;
    if (nearSupport && !supportBreak) score += 4;
    if (volumeBoost) score += 8;
    if (volumeWeak) score -= 10;
    if (moneyIn >= 62) score += 9;
    if (moneyOut >= 62) score -= 9;
    if (newsSentiment === "POZİTİF") score += 5;
    if (newsSentiment === "NEGATİF") score -= 5;

    score = Math.max(0, Math.min(100, Math.round(score)));

    const confirmations = [rsiBull, emaBull, macdBull, trendUp, volumeBoost, moneyIn >= 58, newsSentiment !== "NEGATİF"]
      .filter(Boolean).length;
    const sellConfirmations = [rsiBear, emaBear, macdBear, trendDown, supportBreak, moneyOut >= 58, newsSentiment === "NEGATİF"]
      .filter(Boolean).length;

    let text = "BEKLE";
    let type = "İZLE";
    let color = "text-yellow-300 bg-yellow-500/20";
    let icon = Target;
    let probability = Math.max(45, Math.min(72, score));
    let safety = "ORTA";

    // Güvenli mod: AL/SAT için tek gösterge yetmez, en az 5 onay ister.
    if (score >= 82 && confirmations >= 5 && !rsiHot && !volumeWeak) {
      text = "GÜÇLÜ AL";
      type = "SPOT";
      color = "text-emerald-300 bg-emerald-500/20";
      icon = TrendingUp;
      probability = Math.min(94, score + confirmations);
      safety = "YÜKSEK";
    } else if (score >= 70 && confirmations >= 4 && !rsiHot) {
      text = "BEKLE";
      type = "İZLE";
      color = "text-yellow-300 bg-yellow-500/20";
      icon = Target;
      probability = Math.min(78, score);
      safety = "ONAY BEKLİYOR";
    } else if (score <= 22 && sellConfirmations >= 5) {
      text = "GÜÇLÜ SAT";
      type = "KISA";
      color = "text-red-300 bg-red-500/20";
      icon = TrendingDown;
      probability = Math.min(94, 100 - score + sellConfirmations);
      safety = "YÜKSEK";
    } else if (score <= 35 && sellConfirmations >= 4) {
      text = "BEKLE";
      type = "İZLE";
      color = "text-yellow-300 bg-yellow-500/20";
      icon = Target;
      probability = Math.min(78, 100 - score);
      safety = "ONAY BEKLİYOR";
    }

    return {
      text,
      type,
      color,
      icon,
      score,
      probability,
      safety,
      confirmations,
      rsi: Math.round(rsi),
      ema: ema20,
      ema9,
      ema20,
      ema50,
      macd: macdInfo.macd,
      macdSignal: macdInfo.signalLine,
      macdHistogram: macdInfo.histogram,
      support,
      resistance,
      volumeBoost,
      volumeRatio,
      trendUp,
      trendDown,
      trendSlopePct,
      resistanceBreak,
      supportBreak,
      moneyIn,
      moneyOut,
      traderBias,
      newsSentiment,
      whaleFlow,
      analyzedAt: new Date().toISOString(),
    };
  };

  const shouldRenewSnapshot = (current, nextSignal) => {
    if (!current?.signal || !nextSignal) return true;
    return current.signal.text !== nextSignal.text || current.signal.type !== nextSignal.type;
  };

  const calculateRSI = (change) => {
    if (change >= 5) return 72;
    if (change >= 2) return 62;
    if (change <= -5) return 28;
    if (change <= -2) return 38;
    return 50;
  };

  const calculateEMA = (price, change) => price * (1 - change / 1000);
  const calculateMACD = (change) => change * 0.35;

  const getProSignal = (price, change, volume, coin, candleAnalysis = null) => {
    price = safeNumber(price);
    change = safeNumber(change);
    volume = safeNumber(volume);

    if (candleAnalysis && Number.isFinite(Number(candleAnalysis.score))) {
      return {
        ...candleAnalysis,
        icon: candleAnalysis.icon || getSignalIcon(candleAnalysis),
      };
    }

    const high = safeNumber(coin?.highPrice, price);
    const low = safeNumber(coin?.lowPrice, price);
    const range = high - low;
    const position = range > 0 ? ((price - low) / range) * 100 : 50;
    const rsi = calculateRSI(change);
    const ema = calculateEMA(price, change);
    const macd = calculateMACD(change);
    const volumeScore = volume > 500000000 ? 2 : volume > 100000000 ? 1 : volume < 10000000 ? -1 : 0;
    const moneyIn = Math.round(Math.min(90, Math.max(10, 50 + change * 5 + volumeScore * 6)));
    const moneyOut = 100 - moneyIn;
    const trendUp = change > 0.6 && price >= ema;
    const trendDown = change < -0.6 && price < ema;
    const resistance = high;
    const support = low;
    const resistanceBreak = price > high * 0.998 && change > 0.8;
    const supportBreak = price < low * 1.002 && change < -0.8;
    const newsSentiment = change > 1.5 ? "POZİTİF" : change < -1.5 ? "NEGATİF" : "NÖTR";
    const traderBias = moneyIn >= 58 ? "ALICI YOĞUN" : moneyOut >= 58 ? "SATICI YOĞUN" : "DENGELİ";

    let score = 50;
    if (rsi >= 48 && rsi <= 66) score += 10;
    if (rsi > 70) score -= 12;
    if (rsi < 38) score -= 8;
    if (price > ema) score += 13;
    if (price < ema) score -= 13;
    if (macd > 0) score += 12;
    if (macd < 0) score -= 12;
    if (trendUp) score += 14;
    if (trendDown) score -= 14;
    if (resistanceBreak && volumeScore >= 1) score += 12;
    if (supportBreak) score -= 15;
    if (moneyIn >= 62) score += 8;
    if (moneyOut >= 62) score -= 8;
    if (volumeScore === 2) score += 8;
    if (volumeScore === -1) score -= 8;
    if (newsSentiment === "POZİTİF") score += 5;
    if (newsSentiment === "NEGATİF") score -= 5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const confirmations = [rsi >= 48 && rsi <= 66, price > ema, macd > 0, trendUp, volumeScore >= 1, moneyIn >= 58, newsSentiment !== "NEGATİF"].filter(Boolean).length;
    const sellConfirmations = [rsi < 42, price < ema, macd < 0, trendDown, supportBreak, moneyOut >= 58, newsSentiment === "NEGATİF"].filter(Boolean).length;

    let text = "BEKLE";
    let type = "İZLE";
    let color = "text-yellow-300 bg-yellow-500/20";
    let icon = Target;
    let probability = Math.max(45, Math.min(72, score));
    let safety = "ORTA";

    if (score >= 82 && confirmations >= 5 && rsi <= 70) {
      text = "GÜÇLÜ AL";
      type = "SPOT";
      color = "text-emerald-300 bg-emerald-500/20";
      icon = TrendingUp;
      probability = Math.min(94, score + confirmations);
      safety = "YÜKSEK";
    } else if (score >= 70 && confirmations >= 4 && rsi <= 70) {
      text = "BEKLE";
      type = "İZLE";
      color = "text-yellow-300 bg-yellow-500/20";
      icon = Target;
      probability = Math.min(78, score);
      safety = "ONAY BEKLİYOR";
    } else if (score <= 22 && sellConfirmations >= 5) {
      text = "GÜÇLÜ SAT";
      type = "KISA";
      color = "text-red-300 bg-red-500/20";
      icon = TrendingDown;
      probability = Math.min(94, 100 - score + sellConfirmations);
      safety = "YÜKSEK";
    } else if (score <= 35 && sellConfirmations >= 4) {
      text = "BEKLE";
      type = "İZLE";
      color = "text-yellow-300 bg-yellow-500/20";
      icon = Target;
      probability = Math.min(78, 100 - score);
      safety = "ONAY BEKLİYOR";
    }

    return {
      text,
      type,
      color,
      icon,
      score,
      probability,
      safety,
      confirmations,
      rsi,
      ema,
      ema20: ema,
      ema50: ema,
      macd,
      support,
      resistance,
      resistanceBreak,
      supportBreak,
      volumeRatio: volumeScore === 2 ? 1.8 : volumeScore === 1 ? 1.25 : volumeScore === -1 ? 0.55 : 1,
      volumeBoost: volumeScore >= 1,
      trendUp,
      trendDown,
      trendSlopePct: change,
      moneyIn,
      moneyOut,
      traderBias,
      newsSentiment,
      whaleFlow: Math.min(95, Math.max(5, Math.round(Math.abs(change) * 8 + volumeScore * 12 + 20))),
    };
  };

  const getTargets = (price, signal) => {
    price = safeNumber(price);
    if (!signal || price <= 0) return null;

    const probability = safeNumber(signal.probability || signal.score, 60);
    const tight = probability >= 85 ? 1 : probability >= 75 ? 0.85 : 0.7;

    // Kısa TP modu: kullanıcı hızlı çıkış görebilsin diye hedefler yakın tutuldu.
    if (signal.type === "SPOT") {
      return {
        entry: price,
        tp1: price * (1 + 0.006 * tight),
        tp2: price * (1 + 0.012 * tight),
        tp3: price * (1 + 0.018 * tight),
        sl: price * (1 - 0.0075 * tight),
      };
    }

    if (signal.type === "KISA") {
      return {
        entry: price,
        tp1: price * (1 - 0.006 * tight),
        tp2: price * (1 - 0.012 * tight),
        tp3: price * (1 - 0.018 * tight),
        sl: price * (1 + 0.0075 * tight),
      };
    }

    return null;
  };

  const getSignalIcon = (signal) => {
    if (!signal) return Target;
    if (signal.type === "KISA" || String(signal.text || "").includes("SAT")) return TrendingDown;
    if (signal.type === "SPOT" || String(signal.text || "").includes("AL")) return TrendingUp;
    return Target;
  };

  const ensureSignalSnapshot = (coin, options = {}) => {
    if (!coin?.symbol) return;
    const nextSnapshot = makeSignalSnapshot(coin);
    if (!nextSnapshot) return;

    setSignalSnapshots((prev) => {
      const current = prev?.[coin.symbol];
      const lastMs = current?.createdAt ? new Date(current.createdAt).getTime() : 0;
      const isExpired = !lastMs || Date.now() - lastMs >= 15 * 60 * 1000;
      const shouldRefresh = options.force || !current || isExpired;

      if (!shouldRefresh) return prev;

      const updated = { ...prev, [coin.symbol]: nextSnapshot };
      try {
        localStorage.setItem("trader_signal_snapshots", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const getBestSignal = () => {
    let best = null;
    let bestScore = 0;

    coins.forEach((coin) => {
      const price = safeNumber(coin?.lastPrice);
      const change = safeNumber(coin?.priceChangePercent);
      const volume = safeNumber(coin?.quoteVolume);
      const signal = getProSignal(price, change, volume, coin);

      if (signal.score > bestScore) {
        bestScore = signal.score;
        best = coin;
      }
    });

    return best;
  };
const addAlert = (coin, signal) => {
  if (!coin || !signal || signal.score < 70) return;

  const alertKey = `${coin.symbol}-${signal.text}`;

  setAlerts((prev) => {
    if (prev.some((a) => a.key === alertKey)) return prev;

    return [
      {
        id: `${alertKey}-${Date.now()}`,
        key: alertKey,
        symbol: coin.symbol,
        text: signal.text,
        score: signal.score,
        price: coin.lastPrice,
        time: new Date().toLocaleTimeString("tr-TR"),
      },
      ...prev,
    ].slice(0, 4);
  });
};
  const getCoinLimit = () => {
    if (plan === "SERBEST") return 3;
    if (plan === "PLATIN") return 10;
    if (plan === "ALTIN") return 25;
    if (plan === "ELITE") return 50;
    if (plan === "ULTRA") return 100;
    return 3;
  };

  const getMiniChartPoints = (coin) => {
    const change = safeNumber(coin?.priceChangePercent);

    return Array.from({ length: 12 }, (_, i) => {
      const wave = Math.sin(i * 0.8) * 8;
      const trend = change * i * 0.6;
      const y = 45 - wave - trend;
      return `${i * 10},${Math.max(8, Math.min(55, y))}`;
    }).join(" ");
  };

  const fetchCoins = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.log("Coin verisi geçici gelmedi, eski liste korunuyor:", data);
        return;
      }

      const usdtPairs = data
        .filter((coin) => coin?.symbol?.endsWith("USDT"))
        .sort((a, b) => safeNumber(b.quoteVolume) - safeNumber(a.quoteVolume))
        .slice(0, 100);

      setCoins((prevCoins) => {
        if (prevCoins.length === 0 || !silent) {
          return usdtPairs;
        }

        const updatedMap = new Map(usdtPairs.map((coin) => [coin.symbol, coin]));

        return prevCoins.map((coin) =>
          updatedMap.has(coin.symbol)
            ? { ...coin, ...updatedMap.get(coin.symbol) }
            : coin
        );
      });

      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
    } catch (error) {
      console.error("Veri çekme hatası, eski liste korunuyor:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async (symbol) => {
    if (!symbol) return;

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`
      );

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.log("Trend data geçici gelmedi, eski grafik korunuyor:", data);
        return;
      }

      const candles = data
        .map((candle, i) => ({
          time: String(i + 1),
          price: Number(candle?.[4]),
          high: Number(candle?.[2]),
          low: Number(candle?.[3]),
          volume: Number(candle?.[5]),
        }))
        .filter((item) =>
          Number.isFinite(item.price) &&
          Number.isFinite(item.high) &&
          Number.isFinite(item.low)
        );

      if (candles.length > 5) {
        setTrendData(candles);
        const analysis = analyzeCandlesForSignal(candles, selectedCoin);
        if (analysis) {
          setCandleSignals((prev) => ({ ...prev, [symbol]: analysis }));
        }
      }
    } catch (err) {
      console.log("Trend veri hatası, eski grafik korunuyor:", err);
    }
  };

  useEffect(() => {
    // Sinyaller 15 dakikalık mum mantığıyla yenilenir.
    // İlk açılışta veri gelir, sonra her 15 dakikada bir güncellenir.
    const interval = setInterval(() => {
      fetchCoins(true);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("favoriteCoins");
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
  }, []);
  useEffect(() => {
    try { localStorage.setItem("trader_plan", plan); } catch {}
  }, [plan]);

  useEffect(() => {
    try { localStorage.setItem("trader_subscription", JSON.stringify(activeSubscription)); } catch {}
  }, [activeSubscription]);

  useEffect(() => {
    try {
      const restoreY = Number(localStorage.getItem("trader_scroll_y") || "0");
      if (Number.isFinite(restoreY) && restoreY > 0) {
        window.setTimeout(() => window.scrollTo({ top: restoreY, behavior: "auto" }), 300);
      }
      const rememberScroll = () => localStorage.setItem("trader_scroll_y", String(window.scrollY || 0));
      window.addEventListener("beforeunload", rememberScroll);
      return () => window.removeEventListener("beforeunload", rememberScroll);
    } catch {}
  }, []);


  useEffect(() => {
    if (!selectedCoin?.symbol) return;

    if (["ELITE", "ULTRA"].includes(plan)) {
      fetchTrendData(selectedCoin.symbol);
    } else {
      setTrendData([]);
    }
  }, [selectedCoin?.symbol, plan]);


  useEffect(() => {
    if (!selectedCoin?.symbol) return;
    const candleSignal = candleSignals?.[selectedCoin.symbol];
    if (!candleSignal) return;
    const current = signalSnapshots?.[selectedCoin.symbol];
    if (shouldRenewSnapshot(current, candleSignal)) {
      const snapshot = makeSignalSnapshot(selectedCoin);
      if (snapshot) {
        setSignalSnapshots((prev) => {
          const updated = { ...prev, [selectedCoin.symbol]: snapshot };
          try { localStorage.setItem("trader_signal_snapshots", JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    }
  }, [candleSignals, selectedCoin?.symbol]);
  useEffect(() => {
    if (!coins.length) return;

    const best = getBestSignal();
    if (best) {
      const price = safeNumber(best.lastPrice);
      const change = safeNumber(best.priceChangePercent);
      const volume = safeNumber(best.quoteVolume);
      const signal = getProSignal(price, change, volume, best);
      addAlert(best, signal);
    }

    const now = Date.now();
    const lastCheck = Number(localStorage.getItem("telegram_last_check_ms") || telegramCheckRef.current || 0);
    if (lastCheck && now - lastCheck < 15 * 60 * 1000) return;

    telegramCheckRef.current = now;
    try { localStorage.setItem("telegram_last_check_ms", String(now)); } catch {}

    const sentStrongMap = readJson("telegram_sent_strong_map", {});
    const currentlyStrong = new Set();

    const candidates = coins
      .map((coin) => {
        const price = safeNumber(coin.lastPrice);
        const change = safeNumber(coin.priceChangePercent);
        const volume = safeNumber(coin.quoteVolume);
        const candleAnalysis = candleSignals?.[coin.symbol] || null;
        const signal = getProSignal(price, change, volume, coin, candleAnalysis);
        const targets = getTargets(price, signal);
        const requiredPackage = getSignalRequiredPackage(signal);
        return { coin, signal, targets, requiredPackage };
      })
      .filter((item) => {
        const strong = item.signal?.text === "GÜÇLÜ AL" && safeNumber(item.signal?.score) >= 80 && item.targets;
        const packageOpen = canUsePackageLevel(plan, item.requiredPackage);
        if (strong && packageOpen) currentlyStrong.add(item.coin.symbol);
        return strong && packageOpen && !sentStrongMap[item.coin.symbol];
      })
      .sort((a, b) => safeNumber(b.signal.score) - safeNumber(a.signal.score));

    Object.keys(sentStrongMap).forEach((symbol) => {
      if (!currentlyStrong.has(symbol)) delete sentStrongMap[symbol];
    });

    if (!candidates.length) {
      try { localStorage.setItem("telegram_sent_strong_map", JSON.stringify(sentStrongMap)); } catch {}
      return;
    }

    const next = candidates[0];
    const message = buildTelegramSignalMessage(next.coin, next.signal, next.targets, next.requiredPackage);
    sendTelegramSignal(message);

    sentStrongMap[next.coin.symbol] = {
      sentAt: new Date().toISOString(),
      score: next.signal.score,
      signal: next.signal.text,
    };

    try { localStorage.setItem("telegram_sent_strong_map", JSON.stringify(sentStrongMap)); } catch {}
  }, [coins, candleSignals]);

  useEffect(() => {
    if (!coins.length) return;

    const wantedSymbol = selectedCoin?.symbol || (() => {
      try { return localStorage.getItem("trader_selected_coin"); } catch { return null; }
    })();

    if (!wantedSymbol) return;
    const freshCoin = coins.find((coin) => coin.symbol === wantedSymbol);

    if (freshCoin) {
      setSelectedCoin(freshCoin);
      ensureSignalSnapshot(freshCoin);
    }
  }, [coins]);

  const toggleFavorite = (symbol) => {
    if (!symbol) return;

    setFavorites((prev) => {
      const updated = prev.includes(symbol)
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol];

      localStorage.setItem("favoriteCoins", JSON.stringify(updated));
      return updated;
    });
  };


  const handleAuthDemo = async () => {
    const username = authUsername.trim();
    const password = authPassword.trim();
    const email = authEmail.trim();
    const emailConfirm = authEmailConfirm.trim();

    if (!username || !password) {
      setAuthMessage("Kullanıcı adı ve şifre gir.");
      return;
    }

    if (authMode === "register") {
      if (!email || !emailConfirm) {
        setAuthMessage("E-posta gir.");
        return;
      }

      if (email.toLowerCase() !== emailConfirm.toLowerCase()) {
        setAuthMessage("E-postalar eşleşmiyor.");
        return;
      }

      const exists = demoUsers.some(
        (user) => String(user.username).toLowerCase() === username.toLowerCase()
      );

      if (exists) {
        setAuthMessage("Bu kullanıcı zaten kayıtlı. Giriş yapabilirsin.");
        return;
      }

      try {
        await firebaseSignUpWithEmail(email, password);
      } catch (error) {
        const code = String(error?.message || "");
        if (!code.includes("EMAIL_EXISTS")) {
          if (code.includes("INVALID_EMAIL")) setAuthMessage("E-posta adresi geçersiz.");
          else if (code.includes("WEAK_PASSWORD")) setAuthMessage("Şifre en az 6 karakter olmalı.");
          else setAuthMessage(`Firebase kayıt hatası: ${code}`);
          return;
        }
      }

      const newUser = normalizeUser({
        username,
        password,
        name: username,
        email,
        role: "user",
        package: "SERBEST",
        expiresAt: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });

      setDemoUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setGmMode(false);

      try {
        localStorage.setItem("trader_current_user", JSON.stringify(newUser));
        localStorage.removeItem("trader_gm_mode");
      } catch {}

      setActiveSubscription({ plan: "SERBEST", purchasedAt: null, expiresAt: null });
      setPlan("SERBEST");
      setAuthUsername("");
      setAuthPassword("");
      setAuthEmail("");
      setAuthEmailConfirm("");
      setAuthMessage("Kayıt başarılı, giriş yapıldı.");
      return;
    }

    let foundUser = demoUsers.find(
      (user) =>
        (String(user.username).toLowerCase() === username.toLowerCase() || String(user.email || "").toLowerCase() === username.toLowerCase()) &&
        String(user.password) === password &&
        user.status !== "blocked"
    );

    if (!foundUser) {
      const candidateUser = demoUsers.find(
        (user) =>
          (String(user.username).toLowerCase() === username.toLowerCase() || String(user.email || "").toLowerCase() === username.toLowerCase()) &&
          user.status !== "blocked"
      );

      const loginEmail = candidateUser?.email || (username.includes("@") ? username : "");

      if (loginEmail) {
        try {
          await firebaseLoginWithEmail(loginEmail, password);
          foundUser = normalizeUser({
            ...(candidateUser || {}),
            username: candidateUser?.username || loginEmail.split("@")[0],
            email: loginEmail,
            password,
            role: candidateUser?.role || "user",
            package: candidateUser?.package || "SERBEST",
            status: "active",
          });
        } catch (error) {
          setAuthMessage("Hatalı kullanıcı adı/e-posta veya şifre.");
          return;
        }
      } else {
        setAuthMessage("Hatalı kullanıcı adı veya şifre.");
        return;
      }
    }

    const normalized = normalizeUser({ ...foundUser, password, lastLoginAt: new Date().toISOString() });
    setDemoUsers((prev) => {
      const exists = prev.some((u) => String(u.username).toLowerCase() === String(normalized.username).toLowerCase());
      if (!exists) return [...prev, normalized];
      return prev.map((u) =>
        String(u.username).toLowerCase() === String(normalized.username).toLowerCase() ? normalized : u
      );
    });
    setCurrentUser(normalized);

    try {
      localStorage.setItem("trader_current_user", JSON.stringify(normalized));
    } catch {}

    if (String(normalized.role).toUpperCase() === "GM") {
      setGmMode(true);
      try { localStorage.setItem("trader_gm_mode", "1"); } catch {}
      setActiveSubscription({ plan: "ULTRA", purchasedAt: new Date().toISOString(), expiresAt: "2099-12-31T23:59:59.000Z" });
      setPlan("ULTRA");
      setAuthMessage("GM girişi başarılı.");
      return;
    }

    const userPlan = normalized.package || "SERBEST";
    setGmMode(false);
    try { localStorage.removeItem("trader_gm_mode"); } catch {}
    setActiveSubscription({
      plan: userPlan,
      purchasedAt: new Date().toISOString(),
      expiresAt: normalized.expiresAt || null,
    });
    setPlan(userPlan);
    setAuthMessage("Giriş başarılı.");
  };


  const handlePasswordResetDemo = async () => {
    const mail = resetEmail.trim().toLowerCase();

    if (!mail) {
      setAuthMessage("Şifre sıfırlama için e-posta adresini yaz.");
      return;
    }

    const firebaseApiKey = getFirebaseApiKey();

    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: mail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const code = data?.error?.message || "UNKNOWN_ERROR";
        if (code.includes("EMAIL_NOT_FOUND")) {
          setAuthMessage("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
        } else if (code.includes("INVALID_EMAIL")) {
          setAuthMessage("E-posta adresi geçersiz.");
        } else {
          setAuthMessage(`Şifre sıfırlama maili gönderilemedi: ${code}`);
        }
        return;
      }

      setAuthMessage("Şifre sıfırlama maili gönderildi. E-postanı kontrol et.");
      setShowResetBox(false);
      setResetEmail("");
    } catch (error) {
      setAuthMessage("Bağlantı hatası. Biraz sonra tekrar dene.");
    }
  };

  const logoutDemo = () => {
    setCurrentUser(null);
    try { localStorage.removeItem("trader_current_user"); } catch {}
    setPurchaseNotice("");
  };

  const filteredCoins = coins
    .filter((coin) =>
      (coin?.symbol || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aFav = favorites.includes(a?.symbol);
      const bFav = favorites.includes(b?.symbol);

      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      return 0;
    });

  const bonusCoin = getBestSignal();
  const canSeeBestSignal = ["PLATIN", "ALTIN", "ELITE", "ULTRA"].includes(plan);
  const canSeeAlerts = ["ALTIN", "ELITE", "ULTRA"].includes(plan);
  const canSeeTrend = ["ELITE", "ULTRA"].includes(plan);

  const paidPackages = [
    { key: "PLATIN", title: "Platin", price: 3300, days: 30, desc: "Temel sinyal + daha fazla coin", features: ["10 coin listesi", "En güçlü sinyal", "Temel analiz"] },
    { key: "ALTIN", title: "Altın", price: 6600, days: 30, desc: "Otomatik bildirim ve gelişmiş sinyal", features: ["25 coin listesi", "Otomatik bildirim", "Gelişmiş sinyal"] },
    { key: "ELITE", title: "Elite", price: 13200, days: 30, desc: "Trend kırılım + gelişmiş AI analiz", features: ["50 coin listesi", "Trend kırılım grafiği", "Gelişmiş analiz", "Premium panel"] },
    { key: "ULTRA", title: "Ultra", price: 26400, days: 30, desc: "Tüm özellikler açık", features: ["100 coin listesi", "Ultra alarm", "Telegram bot hazır altyapı"] },
  ];

  const getRemainingDays = (expiresAt) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const planLevel = { SERBEST: 0, PLATIN: 1, ALTIN: 2, ELITE: 3, ULTRA: 4 };

  const hasActivePaidPlan =
    activeSubscription.plan !== "SERBEST" &&
    getRemainingDays(activeSubscription.expiresAt) > 0;

  const canOpenPlan = (targetPlan) => {
    if (targetPlan === "SERBEST") return true;
    if (!hasActivePaidPlan) return false;
    return planLevel[targetPlan] <= planLevel[activeSubscription.plan];
  };

  const handlePlanSwitch = (targetPlan) => {
    if (targetPlan !== "SERBEST") scrollToPackagesAndGlow(targetPlan);

    if (canOpenPlan(targetPlan)) {
      setPlan(targetPlan);
      setPurchaseNotice("");
      return;
    }

    const pkg = paidPackages.find((item) => item.key === targetPlan);
    setPurchaseNotice(
      `${pkg?.title || targetPlan} paketine girmek için önce bu paketi satın alın.`
    );
  };

  const buyPackageDemo = (packageKey) => {
    const pkg = paidPackages.find((item) => item.key === packageKey);
    if (!pkg) return;

    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + pkg.days);

    const nextSubscription = {
      plan: packageKey,
      purchasedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    setActiveSubscription(nextSubscription);
    setPlan(packageKey);
    if (currentUser) {
      const updatedUser = { ...currentUser, package: packageKey, expiresAt: expires.toISOString() };
      setCurrentUser(updatedUser);
      setDemoUsers((prev) =>
        prev.map((u) =>
          String(u.username).toLowerCase() === String(updatedUser.username).toLowerCase()
            ? { ...u, package: packageKey, expiresAt: expires.toISOString() }
            : u
        )
      );
    }
    scrollToPackagesAndGlow(packageKey);
    setPurchaseNotice(`${pkg.title} paketi aktif edildi. 30 gün kullanım başladı.`);
  };

  const resetSubscriptionDemo = () => {
    const resetSub = { plan: "SERBEST", purchasedAt: null, expiresAt: null };
    setActiveSubscription(resetSub);
    setPlan("SERBEST");
    if (currentUser && String(currentUser.role).toUpperCase() !== "GM") {
      const updatedUser = { ...currentUser, package: "SERBEST", expiresAt: null };
      setCurrentUser(updatedUser);
      setDemoUsers((prev) => prev.map((u) => String(u.username).toLowerCase() === String(updatedUser.username).toLowerCase() ? updatedUser : u));
    }
    try {
      localStorage.setItem("trader_plan", "SERBEST");
      localStorage.setItem("trader_subscription", JSON.stringify(resetSub));
    } catch {}
    setPurchaseNotice("Demo sıfırlandı. Şu an sadece Serbest paket açık.");
  };

  const openCoin = (coin) => {
    if (!coin?.symbol) return;
    const selected = { ...coin };
    try { localStorage.setItem("trader_selected_coin", selected.symbol); } catch {}
    ensureSignalSnapshot(selected);
    setSelectedCoin(selected);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  };

  const closeCoin = () => {
    try { localStorage.removeItem("trader_selected_coin"); } catch {}
    setSelectedCoin(null);
  };
  const selectedPrice = safeNumber(selectedCoin?.lastPrice);
  const selectedChange = safeNumber(selectedCoin?.priceChangePercent);
  const selectedVolume = safeNumber(selectedCoin?.quoteVolume);

  const selectedSnapshot = selectedCoin?.symbol ? signalSnapshots?.[selectedCoin.symbol] : null;
  const selectedCandleSignal = selectedCoin?.symbol ? candleSignals?.[selectedCoin.symbol] : null;
  const liveSelectedSignal = selectedCoin
    ? getProSignal(selectedPrice, selectedChange, selectedVolume, selectedCoin, selectedCandleSignal)
    : null;

  const rawSelectedSignal = selectedSnapshot?.signal
    ? {
        ...selectedSnapshot.signal,
        icon: getSignalIcon(selectedSnapshot.signal),
      }
    : liveSelectedSignal;

  const selectedSignal = (() => {
    const fallback = getProSignal(selectedPrice || 100, selectedChange || 0, selectedVolume || 0, selectedCoin || {}, null);
    const source = rawSelectedSignal || fallback || {};
    const score = Math.max(0, Math.min(100, safeNumber(source.score, fallback?.score || 50)));
    const clean = {
      ...fallback,
      ...source,
      text: source.text || fallback?.text || "BEKLE",
      type: source.type || fallback?.type || "İZLE",
      color: source.color || fallback?.color || "text-yellow-400 bg-yellow-500/20",
      score,
      rsi: Math.max(0, Math.min(100, safeNumber(source.rsi, fallback?.rsi || 50))),
      ema: safeNumber(source.ema, selectedPrice || fallback?.ema || 0),
      macd: safeNumber(source.macd, fallback?.macd || 0),
    };
    clean.icon = source.icon || getSignalIcon(clean) || Target;
    return clean;
  })();

  const cleanSnapshotTargets = selectedSnapshot?.targets
    ? {
        entry: safeNumber(selectedSnapshot.targets.entry, selectedPrice),
        tp1: safeNumber(selectedSnapshot.targets.tp1, selectedPrice * 1.02),
        tp2: safeNumber(selectedSnapshot.targets.tp2, selectedPrice * 1.04),
        tp3: safeNumber(selectedSnapshot.targets.tp3, selectedPrice * 1.06),
        sl: safeNumber(selectedSnapshot.targets.sl, selectedPrice * 0.98),
      }
    : null;

  const selectedTargets =
    cleanSnapshotTargets ||
    (selectedCoin && selectedSignal ? getTargets(selectedPrice, selectedSignal) : null);

  const selectedSignalDate = selectedSnapshot?.date || new Date().toLocaleDateString("tr-TR");
  const selectedSignalTime = selectedSnapshot?.time || lastUpdate || "Bekleniyor";

  const safeTrendData = Array.isArray(trendData)
    ? trendData.filter((item) => item && Number.isFinite(Number(item.price)))
    : [];

  const trend = (() => {
    try {
      const basePrice = selectedPrice > 0 ? selectedPrice : 100;
      if (selectedCoin && canSeeTrend && safeTrendData.length > 5) {
        return getTrendAnalysisFromCandles(safeTrendData, basePrice);
      }
      return getTrendAnalysis(basePrice);
    } catch (error) {
      console.error("Trend analiz güvenli moda alındı:", error);
      return getTrendAnalysis(selectedPrice > 0 ? selectedPrice : 100);
    }
  })();

  const sanitizeChartRows = (rows, keys) => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row, index) => {
        const clean = { ...row, time: String(row?.time ?? index + 1) };
        keys.forEach((key) => {
          clean[key] = safeNumber(row?.[key], 0);
        });
        return clean;
      })
      .filter((row) => keys.every((key) => Number.isFinite(row[key])));
  };

  const fallbackTrend = getTrendAnalysis(selectedPrice > 0 ? selectedPrice : 100);
  const safeTrendChartData = sanitizeChartRows(trend?.data, ["price", "trend"]);
  const chartTrend = safeTrendChartData.length >= 2 ? { ...trend, data: safeTrendChartData } : { ...fallbackTrend, data: sanitizeChartRows(fallbackTrend.data, ["price", "trend"]) };
  const trendPrices = chartTrend.data.map((d) => safeNumber(d.price, selectedPrice || 100));
  const trendMin = Math.min(...trendPrices, selectedPrice || 100);
  const trendMax = Math.max(...trendPrices, selectedPrice || 100);
  const safeSupport = safeNumber(chartTrend.support, trendMin);
  const safeResistance = safeNumber(chartTrend.resistance, trendMax);
  const safeRetestBottom = Math.min(safeNumber(chartTrend.retestBottom, safeSupport), safeNumber(chartTrend.retestTop, safeResistance));
  const safeRetestTop = Math.max(safeNumber(chartTrend.retestBottom, safeSupport), safeNumber(chartTrend.retestTop, safeResistance));
  const safeBreakPoints = sanitizeChartRows(chartTrend.breakPoint, ["price"]);
  const safeRetestPoints = sanitizeChartRows(chartTrend.retestPoint, ["price"]);
  const safeRsiData = sanitizeChartRows(rsiData, ["value"]).map((d) => ({ ...d, value: Math.max(0, Math.min(100, d.value)) }));
  const safeMacdData = sanitizeChartRows(macdData, ["dif", "dea", "hist"]).map((d) => ({ ...d, signal: d.signal || null }));

  const SelectedIcon = selectedSignal?.icon || Target;

  const gmSetUserPackage = (username, packageKey, days = 30) => {
    setDemoUsers((prev) => prev.map((user) => {
      if (String(user.username).toLowerCase() !== String(username).toLowerCase()) return user;
      const next = normalizeUser({ ...user, package: packageKey, expiresAt: packageKey === "SERBEST" ? null : addDaysIso(days) });
      return next;
    }));
    setGmNotice(`${username} için ${packageKey} paketi güncellendi.`);
  };

  const gmAddUser = () => {
    const username = gmNewUser.username.trim();
    const password = gmNewUser.password.trim();
    if (!username || !password) { setGmNotice("Kullanıcı adı ve şifre zorunlu."); return; }
    if (demoUsers.some((u) => String(u.username).toLowerCase() === username.toLowerCase())) {
      setGmNotice("Bu kullanıcı zaten var.");
      return;
    }
    const packageKey = gmNewUser.package || "SERBEST";
    const newUser = normalizeUser({
      username,
      password,
      name: gmNewUser.name.trim() || username,
      email: gmNewUser.email.trim() || `${username}@traderpro.com`,
      package: packageKey,
      expiresAt: packageKey === "SERBEST" ? null : addDaysIso(gmNewUser.days),
      role: "user",
    });
    setDemoUsers((prev) => [...prev, newUser]);
    setGmNewUser({ username: "", password: "", name: "", email: "", package: "SERBEST", days: "30" });
    setGmNotice(`${username} kullanıcısı oluşturuldu.`);
  };

  const gmDeleteUser = (username) => {
    if (String(username).toLowerCase() === GM_USERNAME.toLowerCase()) { setGmNotice("GM hesabı silinemez."); return; }
    setDemoUsers((prev) => prev.filter((u) => String(u.username).toLowerCase() !== String(username).toLowerCase()));
    setGmNotice(`${username} silindi.`);
  };

  const gmViewAsUser = (user) => {
    const normalized = normalizeUser(user);
    setCurrentUser({ ...normalized, viewedByGM: true });
    setGmMode(false);
    try { localStorage.setItem("trader_gm_mode", "0"); localStorage.setItem("trader_current_user", JSON.stringify({ ...normalized, viewedByGM: true })); } catch {}
    setActiveSubscription({ plan: normalized.package || "SERBEST", purchasedAt: new Date().toISOString(), expiresAt: normalized.expiresAt || null });
    setPlan(normalized.package || "SERBEST");
  };

  const gmEnterTrader = () => {
    const gmUser = normalizeUser(demoUsers.find((u) => String(u.role).toUpperCase() === "GM") || DEFAULT_USERS[0]);
    setCurrentUser(gmUser);
    setGmMode(false);
    try { localStorage.setItem("trader_gm_mode", "0"); localStorage.setItem("trader_current_user", JSON.stringify(gmUser)); } catch {}
    setActiveSubscription({ plan: "ULTRA", purchasedAt: new Date().toISOString(), expiresAt: "2099-12-31T23:59:59.000Z" });
    setPlan("ULTRA");
  };

  if (currentUser && String(currentUser.role).toUpperCase() === "GM" && gmMode) {
    const normalUsers = demoUsers.filter((u) => String(u.role).toUpperCase() !== "GM").map(normalizeUser);
    const filteredNormalUsers = normalUsers.filter((user) => {
      const q = gmSearch.trim().toLowerCase();
      if (!q) return true;
      return [user.username, user.name, user.email, user.package, user.status]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
    const premiumCount = normalUsers.filter((u) => (u.package || "SERBEST") !== "SERBEST").length;
    const blockedCount = normalUsers.filter((u) => u.status === "blocked").length;

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#164e63_0,#020617_35%,#050116_75%)] text-white p-4 md:p-6 overflow-hidden">
        <div className="pointer-events-none fixed inset-0 opacity-30">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-400 blur-3xl" />
          <div className="absolute top-24 right-10 h-96 w-96 rounded-full bg-fuchsia-500 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="rounded-[34px] border border-white/10 bg-white/10 backdrop-blur-2xl p-5 md:p-7 mb-6 shadow-2xl shadow-cyan-500/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-cyan-100 text-xs font-black tracking-[0.3em]">
                  ⚡ GM KOMUTA MERKEZİ
                </div>
                <h1 className="text-3xl md:text-5xl font-black mt-4 bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                  Kripto AI Trader Kontrol Paneli
                </h1>
                <p className="text-slate-300 mt-2">Kayıt olan kullanıcılar, paket yetkileri ve demo ödeme yönetimi tek ekranda.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={gmEnterTrader} className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-3 font-black transition">Siteye Git</button>
                <button onClick={logoutDemo} className="rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-300/20 px-4 py-3 font-black transition">Çıkış</button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              {[
                ["👥", "Toplam Kullanıcı", normalUsers.length, "from-cyan-400/20 to-blue-500/10"],
                ["💎", "Premium", premiumCount, "from-fuchsia-400/20 to-purple-500/10"],
                ["👑", "GM Yetki", "Sınırsız", "from-yellow-400/20 to-orange-500/10"],
                ["🛡️", "Engelli", blockedCount, "from-red-400/20 to-rose-500/10"],
              ].map(([icon, title, value, grad]) => (
                <div key={title} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${grad} p-5 shadow-xl`}>
                  <div className="text-3xl">{icon}</div>
                  <div className="text-slate-300 text-xs font-bold mt-3 uppercase tracking-wider">{title}</div>
                  <div className="text-3xl font-black mt-1">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {gmNotice && (
            <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-cyan-100 font-bold">
              {gmNotice}
            </div>
          )}

          <div className="grid lg:grid-cols-[380px_1fr] gap-5">
            <div className="rounded-[30px] border border-white/10 bg-black/35 backdrop-blur-2xl p-5 shadow-2xl shadow-cyan-500/10 h-fit">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black">Kullanıcı Oluştur</h2>
                  <p className="text-xs text-slate-400 mt-1">Manuel kullanıcı ekle, paket ata.</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-cyan-300/20 grid place-items-center text-2xl">➕</div>
              </div>
              <div className="space-y-3">
                <input value={gmNewUser.username} onChange={(e)=>setGmNewUser({...gmNewUser, username:e.target.value})} placeholder="Kullanıcı adı" className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-300" />
                <input value={gmNewUser.password} onChange={(e)=>setGmNewUser({...gmNewUser, password:e.target.value})} placeholder="Şifre" className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-300" />
                <input value={gmNewUser.name} onChange={(e)=>setGmNewUser({...gmNewUser, name:e.target.value})} placeholder="Ad soyad / görünme isim" className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-300" />
                <input value={gmNewUser.email} onChange={(e)=>setGmNewUser({...gmNewUser, email:e.target.value})} placeholder="E-posta" className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-300" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={gmNewUser.package} onChange={(e)=>setGmNewUser({...gmNewUser, package:e.target.value})} className="rounded-2xl bg-slate-900/80 border border-white/10 px-4 py-3 outline-none">
                    {['SERBEST','PLATIN','ALTIN','ELITE','ULTRA'].map((p)=><option key={p}>{p}</option>)}
                  </select>
                  <select value={gmNewUser.days} onChange={(e)=>setGmNewUser({...gmNewUser, days:e.target.value})} className="rounded-2xl bg-slate-900/80 border border-white/10 px-4 py-3 outline-none">
                    {['7','15','30','90','365','SINIRSIZ'].map((d)=><option key={d} value={d}>{d === 'SINIRSIZ' ? 'Sınırsız' : `${d} gün`}</option>)}
                  </select>
                </div>
                <button onClick={gmAddUser} className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 text-slate-950 py-3 font-black shadow-lg shadow-cyan-500/20 hover:scale-[1.01] transition">Kullanıcı Ekle</button>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/35 backdrop-blur-2xl p-5 shadow-2xl shadow-fuchsia-500/10 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl font-black">Kullanıcı Yönetimi</h2>
                  <p className="text-xs text-slate-400 mt-1">Kayıt olan kullanıcılar burada görünür. Paketleri tek tıkla değiştir.</p>
                </div>
                <input
                  value={gmSearch}
                  onChange={(e) => setGmSearch(e.target.value)}
                  placeholder="Kullanıcı ara..."
                  className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-300 min-w-[220px]"
                />
              </div>

              <div className="space-y-3 max-h-[620px] overflow-auto pr-1">
                {filteredNormalUsers.map((user) => (
                  <div key={user.username} className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-4 hover:border-cyan-300/30 transition">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-10 w-10 rounded-2xl bg-cyan-300/20 grid place-items-center font-black text-cyan-100">{String(user.name || user.username || 'U').slice(0,1).toUpperCase()}</div>
                          <div>
                            <div className="font-black text-lg">{user.name || user.username}</div>
                            <div className="text-xs text-slate-400 break-all">@{user.username} · {user.email || 'e-posta yok'}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                          <span className="rounded-full bg-cyan-400/15 border border-cyan-300/20 px-3 py-1 font-black text-cyan-100">{user.package || 'SERBEST'}</span>
                          <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-slate-200">Kalan: {user.package === 'SERBEST' ? '—' : `${getRemainingDays(user.expiresAt)} gün`}</span>
                          {user.createdAt && <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-slate-300">Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}</span>}
                          {user.lastLoginAt && <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-slate-300">Son giriş: {new Date(user.lastLoginAt).toLocaleDateString('tr-TR')}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 xl:items-end">
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          {['SERBEST','PLATIN','ALTIN','ELITE','ULTRA'].map((p) => (
                            <button key={p} onClick={() => gmSetUserPackage(user.username, p, 30)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${user.package === p ? 'bg-cyan-300 text-slate-950 border-cyan-200' : 'bg-white/10 hover:bg-cyan-400/20 border-white/10'}`}>{p}</button>
                          ))}
                        </div>
                        <div className="flex gap-2 xl:justify-end">
                          <button onClick={() => gmViewAsUser(user)} className="rounded-xl bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-300/20 px-3 py-2 font-black">Kullanıcı Gibi Gör</button>
                          <button onClick={() => gmDeleteUser(user.username)} className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-300/20 px-3 py-2 font-black">Sil</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredNormalUsers.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                    Henüz kullanıcı yok veya arama sonucu boş. Kullanıcı kayıt olunca burada görünecek.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    const loginTicker = [
      { sym: "BTC/USDT", status: "GÜÇLÜ AL", pct: "+0.82%", price: "$81.650", icon: "₿" },
      { sym: "ETH/USDT", status: "TREND KIRILIM", pct: "+1.24%", price: "$2.360", icon: "Ξ" },
      { sym: "SOL/USDT", status: "RSI 78", pct: "+3.41%", price: "$89.20", icon: "◎" },
      { sym: "BNB/USDT", status: "BEKLE", pct: "+0.37%", price: "$643", icon: "◆" },
    ];

    const loginFeatures = [
      { title: "AI Sinyal Motoru", text: "RSI + EMA + MACD birlikte tarar", icon: "🤖" },
      { title: "Trend Kırılım", text: "Elite paketlerde detay paneli", icon: "📊" },
      { title: "Telegram Alarm", text: "Ultra altyapısı hazır", icon: "🔔" },
      { title: "Premium Tarama", text: "En güçlü fırsatı öne çıkarır", icon: "💎" },
    ];

    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white px-5 py-6 flex items-center justify-center">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(34,211,238,.35), transparent 28%), radial-gradient(circle at 80% 30%, rgba(168,85,247,.28), transparent 28%), radial-gradient(circle at 50% 90%, rgba(59,130,246,.35), transparent 35%)" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
        <div className="absolute -top-28 -left-28 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
        <div className="absolute top-28 -right-20 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="absolute top-5 left-5 right-5 rounded-3xl border border-cyan-300/20 bg-black/30 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-cyan-500/10 hidden md:block">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="shrink-0 rounded-full bg-cyan-400/20 border border-cyan-300/30 px-4 py-2 text-xs font-black text-cyan-100">⚡ CANLI AI SİNYAL AKIŞI</div>
            <div className="flex gap-3 min-w-0">
              {[...loginTicker, ...loginTicker].map((item, i) => (
                <div key={i} className="min-w-[190px] rounded-2xl border border-white/10 bg-white/10 px-4 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-white">{item.icon} {item.sym}</span>
                    <span className="font-black text-cyan-300">{item.price}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300 font-black">{item.status}</span>
                    <span className="text-emerald-300">{item.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-7xl pt-20 md:pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px_1fr] gap-6 items-center">
            <div className="hidden lg:block space-y-4">
              <div className="rounded-[30px] border border-cyan-300/25 bg-white/10 backdrop-blur-2xl p-5 shadow-2xl shadow-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs tracking-[0.25em] text-cyan-200 font-black">MARKET RADAR</div>
                    <div className="text-2xl font-black mt-1">Canlı Piyasa</div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center text-2xl">📈</div>
                </div>
                <div className="mt-5 space-y-3">
                  {loginTicker.map((item) => (
                    <div key={item.sym} className="rounded-2xl bg-black/35 border border-white/10 p-4 hover:border-cyan-300/40 transition">
                      <div className="flex justify-between items-center">
                        <b>{item.icon} {item.sym}</b>
                        <span className="text-emerald-300 font-black">{item.pct}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" />
                      </div>
                      <div className="mt-2 text-xs text-cyan-100">{item.status} · AI skor aktif</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center">
                  <div className="text-4xl font-black text-emerald-300">128</div>
                  <div className="text-xs text-slate-300 mt-1">Bugünkü sinyal</div>
                </div>
                <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5 text-center">
                  <div className="text-4xl font-black text-yellow-200">%91</div>
                  <div className="text-xs text-slate-300 mt-1">Sinyal başarı</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 opacity-60 blur-lg" />
              <div className="relative rounded-[34px] border border-cyan-200/35 bg-slate-950/55 backdrop-blur-2xl p-6 shadow-2xl shadow-cyan-500/25 overflow-hidden">
                <div className="absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-2xl" />
                <div className="relative text-center mb-6">
                  <div className="mx-auto mb-3 h-18 w-18 rounded-3xl bg-gradient-to-br from-cyan-300 to-blue-600 border border-white/30 flex items-center justify-center text-4xl shadow-lg shadow-cyan-500/30">⚡</div>
                  <div className="text-xs tracking-[0.35em] text-cyan-200 font-black">KRİPTO AI TRADER</div>
                  <h1 className="text-4xl font-black mt-2 leading-tight">Trader Pro Giriş</h1>
                  <p className="text-sm text-slate-300 mt-2">Binance destekli profesyonel sinyal motoru</p>
                  
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 rounded-2xl bg-black/35 p-1 border border-white/10">
                  <button
                    onClick={() => { setAuthMode("login"); setAuthMessage(""); }}
                    className={`rounded-xl py-3 font-black transition ${authMode === "login" ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/30" : "text-slate-300 hover:bg-white/10"}`}
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => { setAuthMode("register"); setAuthMessage(""); }}
                    className={`rounded-xl py-3 font-black transition ${authMode === "register" ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/30" : "text-slate-300 hover:bg-white/10"}`}
                  >
                    Kayıt Ol
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Kullanıcı adı"
                    className="w-full rounded-2xl bg-black/40 border border-cyan-300/20 px-4 py-4 outline-none focus:ring-2 focus:ring-cyan-300 font-bold placeholder:text-slate-400"
                  />
                  <input
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Şifre"
                    type="password"
                    className="w-full rounded-2xl bg-black/40 border border-cyan-300/20 px-4 py-4 outline-none focus:ring-2 focus:ring-cyan-300 font-bold placeholder:text-slate-400"
                  />

                  {authMode === "login" && (
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <button
                        type="button"
                        onClick={() => { setShowResetBox((v) => !v); setAuthMessage(""); }}
                        className="w-full text-left text-sm font-black text-cyan-200 hover:text-white underline underline-offset-4"
                      >
                        Şifremi unuttum
                      </button>

                      {showResetBox && (
                        <div className="mt-3 space-y-2">
                          <input
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="E-posta adresini yaz"
                            type="email"
                            className="w-full rounded-xl bg-black/40 border border-cyan-300/20 px-3 py-3 outline-none focus:ring-2 focus:ring-cyan-300 font-bold placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handlePasswordResetDemo}
                            className="w-full rounded-xl bg-cyan-300 text-slate-950 font-black py-3"
                          >
                            Sıfırlama Maili Gönder
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {authMode === "register" && (
                    <>
                      <input
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="E-posta"
                        type="email"
                        className="w-full rounded-2xl bg-black/40 border border-cyan-300/20 px-4 py-4 outline-none focus:ring-2 focus:ring-cyan-300 font-bold placeholder:text-slate-400"
                      />

                      <input
                        value={authEmailConfirm}
                        onChange={(e) => setAuthEmailConfirm(e.target.value)}
                        placeholder="E-posta tekrar"
                        type="email"
                        className="w-full rounded-2xl bg-black/40 border border-cyan-300/20 px-4 py-4 outline-none focus:ring-2 focus:ring-cyan-300 font-bold placeholder:text-slate-400"
                      />
                    </>
                  )}

                  {authMessage && (
                    <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-cyan-100">
                      {authMessage}
                    </div>
                  )}
                  <button
                    onClick={handleAuthDemo}
                    className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 hover:scale-[1.01] hover:brightness-110 text-white font-black py-4 shadow-xl shadow-cyan-500/30 transition"
                  >
                    🚀 {authMode === "login" ? "Giriş Yap" : "Kayıt Ol ve Başla"}
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-lg font-black text-cyan-200">7/24</div>
                    <div className="text-[10px] text-slate-300">Tarama</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-lg font-black text-emerald-300">AI</div>
                    <div className="text-[10px] text-slate-300">Analiz</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-lg font-black text-yellow-200">PRO</div>
                    <div className="text-[10px] text-slate-300">Sinyal</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-3 text-xs text-yellow-100 leading-relaxed">
                  Gerçek sistemde Firebase Auth + iyzico ödeme sonrası paket otomatik aktif olur.
                </div>
              </div>
            </div>

            <div className="hidden lg:block space-y-4">
              <div className="rounded-[30px] border border-fuchsia-300/25 bg-white/10 backdrop-blur-2xl p-5 shadow-2xl shadow-fuchsia-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs tracking-[0.25em] text-fuchsia-200 font-black">PREMIUM SİSTEM</div>
                    <div className="text-2xl font-black mt-1">Avantajlar</div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-fuchsia-400/20 border border-fuchsia-300/30 flex items-center justify-center text-2xl">🚀</div>
                </div>
                <div className="mt-5 space-y-3">
                  {loginFeatures.map((f) => (
                    <div key={f.title} className="rounded-2xl bg-black/35 border border-white/10 p-4 flex items-center gap-3 hover:border-fuchsia-300/40 transition">
                      <div className="h-12 w-12 rounded-2xl bg-cyan-400/20 border border-cyan-300/20 flex items-center justify-center text-2xl">{f.icon}</div>
                      <div>
                        <div className="font-black">{f.title}</div>
                        <div className="text-xs text-slate-300 mt-1">{f.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[30px] border border-yellow-300/20 bg-gradient-to-br from-yellow-300/15 to-fuchsia-400/10 p-5">
                <div className="text-yellow-200 font-black text-xl">🏆 ULTRA PANEL</div>
                <p className="mt-2 text-sm text-slate-300">Canlı alarm, AI analiz, trend kırılım ve premium sinyal takibi tek ekranda.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-cyan-400/20 bg-black/35 backdrop-blur-xl px-5 py-3 text-sm text-cyan-100 overflow-hidden hidden md:block">
          <div className="flex gap-8 justify-center whitespace-nowrap font-bold">
            <span>🔥 BTC güçlü AL verdi</span>
            <span>⚡ ETH trend kırılımı tespit edildi</span>
            <span>🔔 Ultra alarm sistemi hazır</span>
            <span>💎 Premium coin tarama aktif</span>
            <span>🤖 AI analiz motoru çalışıyor</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6">
      <div className="absolute top-3 right-4 text-[11px] text-white/80 bg-black/30 px-3 py-2 rounded-lg border border-white/10">
        🕒 {lastUpdate || "Bekleniyor"}
      </div>

      <div className="max-w-7xl mx-auto">
       {canSeeAlerts && alerts.length > 0 && (
  <div className="mb-3 rounded-xl border border-cyan-400/30 bg-black/25 px-3 py-2">
    <div className="text-cyan-300 font-bold text-xs mb-2">
      🔔 Otomatik En İyi Sinyaller
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {alerts.slice(0, 4).map((alert) => (
        <div
          key={alert.id}
          className="rounded-lg bg-white/10 border border-white/10 px-2 py-2 flex justify-between items-center"
        >
          <div>
            <div className="font-bold text-xs">{alert.symbol}</div>
            <div className="text-[10px] text-slate-300">
              {alert.text} · {alert.score}/100
            </div>
          </div>

          <div className="text-right text-[10px]">
            <div>${formatPrice(alert.price)}</div>
            <div className="text-slate-400">{alert.time}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
        <div className="text-center text-cyan-200 font-black tracking-[0.38em] text-sm mb-2 uppercase">
          KRIPTO AI Trader
        </div>
        <h1 className="text-5xl font-black text-center mb-2">
          Kripto Y.Z Pro Çetin
        </h1>

        <p className="text-center text-slate-400 mb-8">
          RSI + EMA + MACD destekli profesyonel sinyal motoru
        </p>

        <div className="mb-8 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_96px] gap-4 items-stretch">
            <div className="rounded-3xl border border-cyan-400/20 bg-black/30 backdrop-blur-xl p-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-cyan-400/15 border border-cyan-300/25 flex items-center justify-center text-2xl">👤</div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{String(currentUser.role).toUpperCase() === "GM" ? "GM YÖNETİCİ" : currentUser.viewedByGM ? "GM ÖNİZLEME" : "KULLANICI"}</div>
                  <div className="text-white font-black leading-tight">{currentUser.name}</div>
                  <div className="text-xs text-slate-400">{currentUser.email}</div>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-300/20 p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold">AKTİF PAKET</div>
                    <div className="text-2xl font-black text-cyan-300">{activeSubscription.plan}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-bold">KALAN</div>
                    <div className="text-xl font-black text-white">
                      {activeSubscription.plan === "SERBEST" ? "—" : `${getRemainingDays(activeSubscription.expiresAt)} gün`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-3 mb-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-black">Üyelik Durumu</div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-black ${
                    activeSubscription.plan === "SERBEST"
                      ? "bg-slate-500/20 text-slate-200 border border-white/10"
                      : "bg-cyan-400/15 text-cyan-200 border border-cyan-300/20"
                  }`}>
                    {activeSubscription.plan === "SERBEST" ? "Ücretsiz" : "Premium Aktif"}
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  {activeSubscription.plan === "SERBEST"
                    ? "Premium özellikler kapalı. Paket satın alınca sistem otomatik açılır."
                    : `${activeSubscription.plan} paketi aktif. Premium alanlar kullanımına açıldı.`}
                </div>
              </div>

              {purchaseNotice && (
                <div className="mb-3 rounded-2xl border border-yellow-300/25 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-100">
                  ⚠️ {purchaseNotice}
                </div>
              )}

              {(currentUser.viewedByGM || String(currentUser.role).toUpperCase() === "GM") && (
                <button
                  onClick={() => {
                    const gmUser = normalizeUser(demoUsers.find((u) => String(u.role).toUpperCase() === "GM") || DEFAULT_USERS[0]);
                    setCurrentUser(gmUser);
                    setGmMode(true);
                    try { localStorage.setItem("trader_current_user", JSON.stringify(gmUser)); localStorage.setItem("trader_gm_mode", "1"); } catch {}
                  }}
                  className="w-full mb-2 px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-300/25 text-cyan-100 text-xs font-bold hover:bg-cyan-500/30"
                >
                  GM Paneline Dön
                </button>
              )}
              <button
                onClick={logoutDemo}
                className="w-full px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/25 text-red-100 text-xs font-bold hover:bg-red-500/25"
              >
                Çıkış Yap
              </button>
            </div>

            <div id="premium-packages" ref={packagesRef} className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-white/10 via-blue-500/10 to-black/30 p-5 shadow-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400/15 border border-yellow-300/25 px-3 py-1 text-[11px] text-yellow-200 font-black">
                    💳 ÖDEME / ÜYELİK DEMOSU
                  </div>
                  <h2 className="text-3xl font-black mt-2">30 Günlük Premium Paketler</h2>
                  <p className="text-sm text-slate-300 mt-1">Satın al demo. Gerçek sistemde bu buton iyzico ödeme sayfasını açacak.</p>
                </div>
                <button
                  onClick={resetSubscriptionDemo}
                  className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-400/30 text-red-100 font-bold text-sm hover:bg-red-500/25"
                >
                  Demo Sıfırla
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {paidPackages.map((pkg) => {
                  const isActive = activeSubscription.plan === pkg.key && getRemainingDays(activeSubscription.expiresAt) > 0;
                  const isUpgrade = activeSubscription.plan !== "SERBEST" && !isActive;

                  return (
                    <div
                      key={pkg.key}
                      className={`relative rounded-2xl p-4 border transition-all duration-300 min-h-[245px] flex flex-col ${
                        isActive
                          ? "border-yellow-300 bg-yellow-400/15 shadow-lg shadow-yellow-500/10 scale-[1.01]"
                          : "border-white/10 bg-black/35 hover:bg-white/10 hover:border-cyan-300/30"
                      } ${highlightPackage === pkg.key ? "scale-[1.05] ring-4 ring-cyan-300/70 shadow-[0_0_45px_rgba(34,211,238,0.8)]" : ""}` }
                    >
                      {isActive && (
                        <div className="absolute -top-3 left-4 rounded-full bg-yellow-400 text-black px-3 py-1 text-[10px] font-black shadow-lg">
                          AKTİF · {getRemainingDays(activeSubscription.expiresAt)} GÜN KALDI
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mt-1">
                        <div>
                          <div className="text-lg font-black text-white">{pkg.title}</div>
                          <div className="text-3xl font-black text-cyan-300 mt-1">₺{pkg.price.toLocaleString("tr-TR")}</div>
                          <div className="text-xs text-slate-400">{pkg.days} gün kullanım</div>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 flex items-center justify-center text-lg">
                          {pkg.key === "PLATIN" ? "💎" : pkg.key === "ALTIN" ? "🥇" : pkg.key === "ELITE" ? "🚀" : "👑"}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 mt-3 min-h-[34px] leading-relaxed">{pkg.desc}</p>

                      <div className="mt-3 space-y-1.5 flex-1">
                        {pkg.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-2 text-[11px] text-slate-200">
                            <span className="text-cyan-300">✓</span>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => buyPackageDemo(pkg.key)}
                        className={`mt-4 w-full rounded-xl px-3 py-2.5 text-sm font-black transition ${
                          isActive
                            ? "bg-yellow-400 text-black"
                            : "bg-cyan-500/25 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/40"
                        }`}
                      >
                        {isActive ? "Aktif Paket" : isUpgrade ? `${pkg.title} Paketine Yükselt` : `${pkg.title} Satın Al`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => fetchCoins(true)}
              className="rounded-3xl bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30 flex lg:flex-col items-center justify-center gap-2 px-5 py-4 font-black"
            >
              <RefreshCw size={22} />
              Yenile
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Para ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="rounded-3xl border border-cyan-400/20 bg-black/25 p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-black text-cyan-200">Paket Önizleme</div>
                  <div className="text-[11px] text-slate-400">Serbest dışındaki paketler satın alınmadan açılmaz.</div>
                </div>
                <div className="hidden md:block text-[11px] text-slate-400">Soldan sağa paket seviyesi</div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {["SERBEST", "PLATIN", "ALTIN", "ELITE", "ULTRA"].map((item) => {
                  const locked = !canOpenPlan(item);
                  const active = plan === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePlanSwitch(item)}
                      className={`relative rounded-2xl px-2 py-3 text-xs md:text-sm font-black transition border ${
                        active
                          ? "bg-cyan-300 text-black border-cyan-200 shadow-lg shadow-cyan-500/20"
                          : locked
                            ? "bg-black/35 text-slate-300 border-white/10 hover:border-yellow-300/40"
                            : "bg-cyan-500/15 text-cyan-100 border-cyan-300/20 hover:bg-cyan-500/25"
                      }`}
                    >
                      {locked && item !== "SERBEST" && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 text-black text-[10px] flex items-center justify-center">🔒</span>
                      )}
                      {item}
                    </button>
                  );
                })}
              </div>

              {purchaseNotice && (
                <div className="mt-3 rounded-2xl border border-yellow-300/25 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-100">
                  ⚠️ {purchaseNotice}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-black/30 via-blue-500/10 to-black/30 p-4 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 font-black text-cyan-200 text-lg">
                    <span>🚀</span>
                    Premium Kilitli Özellikler
                  </div>
                  <p className="text-xs text-slate-300">Paket yükselttikçe bu özellikler otomatik açılır.</p>
                </div>
                <div className="hidden md:block rounded-full bg-cyan-500/15 border border-cyan-300/20 px-4 py-2 text-xs font-black text-cyan-200">
                  Soldan sağa paket seviyesi
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  { icon: "🔥", title: "En Güçlü Sinyal", desc: "En iyi fırsatı üstte gösterir", planName: "PLATIN" },
                  { icon: "🔔", title: "Otomatik Bildirim", desc: "Güçlü sinyalde alarm üretir", planName: "ALTIN" },
                  { icon: "📊", title: "Trend Kırılım", desc: "Elite panelinde trend grafiği açılır", planName: "ELITE" },
                  { icon: "🤖", title: "AI Backtest", desc: "Premium analiz altyapısı", planName: "ULTRA" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3 rounded-2xl bg-black/30 border border-white/10 px-4 py-3 min-h-[92px]">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center text-2xl">{item.icon}</div>
                    <div className="min-w-0">
                      <div className="font-black text-white leading-tight">{item.title}</div>
                      <div className="text-[11px] text-slate-300 leading-snug mt-1">{item.desc}</div>
                      <div className="inline-flex mt-2 rounded-full bg-cyan-500/20 border border-cyan-300/20 px-2 py-1 text-[10px] text-cyan-200 font-black">{item.planName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!loading &&
  canSeeBestSignal &&
  bonusCoin &&
          (() => {
            const best = bonusCoin;
            const price = safeNumber(best?.lastPrice);
            const change = safeNumber(best?.priceChangePercent);
            const volume = safeNumber(best?.quoteVolume);
            const sig = getProSignal(price, change, volume, best);

            return (
              <div
                onClick={() => openCoin(best)}
                className="mb-5 rounded-3xl p-5 border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <p className="text-sm text-cyan-300 font-bold">
                  🔥 EN GÜÇLÜ SİNYAL
                </p>

                <div className="flex justify-between items-center mt-2">
                  <div>
                    <h2 className="text-3xl font-bold">
                      {(best?.symbol || "BTCUSDT").replace("USDT", "")}
                      <span className="ml-2 text-sm text-slate-300">/USDT</span>
                    </h2>
                    <p className={change >= 0 ? "text-green-400" : "text-red-400"}>
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">${formatPrice(price)}</p>
                    <p className={`mt-2 px-4 py-2 rounded-xl font-bold ${sig.color}`}>
                      {sig.text} · {sig.score}/100
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-white/10 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[
              ...filteredCoins.slice(0, getCoinLimit()),
              ...(plan === "SERBEST" && bonusCoin ? [bonusCoin] : []),
            ].map((coin, index) => {
              const isLocked = index >= getCoinLimit();
              const price = safeNumber(coin?.lastPrice);
              const change = safeNumber(coin?.priceChangePercent);
              const volume = safeNumber(coin?.quoteVolume);
              const signal = getProSignal(price, change, volume, coin);
              const SignalIcon = signal.icon || Target;
              const targets = getTargets(price, signal);

              return (
                <div
                  key={`${coin?.symbol || "coin"}-${index}`}
                  onClick={(e) => {
                    if (e.target.closest("button")) return;
                    e.preventDefault();
                    openCoin(coin);
                  }}
                  onMouseUp={(e) => {
                    if (e.button !== 0 || e.target.closest("button")) return;
                    openCoin(coin);
                  }}
                  onTouchEnd={(e) => {
                    if (e.target.closest("button")) return;
                    openCoin(coin);
                  }}
                  onDoubleClick={(e) => { e.preventDefault(); openCoin(coin); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openCoin(coin); }}
                  role="button"
                  tabIndex={0}
                  title="Coine tıkla: grafik açılır" className={`relative bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/10 shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:bg-white/5 hover:shadow-[0_0_25px_rgba(34,211,238,0.45)] ${
                    isLocked
                      ? "opacity-40 blur-sm pointer-events-none"
                      : favorites.includes(coin?.symbol)
                      ? "border-yellow-400/60 shadow-yellow-400/20"
                      : ""
                      
                    }`}
                
                >
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-bold">
                      {(coin?.symbol || "BTCUSDT").replace("USDT", "")}
                    </h2>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">/USDT</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(coin?.symbol);
                        }}
                        className="hover:scale-125 transition-transform"
                      >
                        <Star
                          className={
                            favorites.includes(coin?.symbol)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-400"
                          }
                        />
                      </button>
                    </div>
                 {isLocked && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
    <div className="text-center text-xs text-white">
      🔒 Kilitli
      <div className="text-cyan-300 mt-1">
        {plan === "SERBEST" ? "PLATIN ile açılır" : "Üst paket gerekli"}
      </div>
    </div>
  </div>
)}
                  </div>

                  <p className="text-2xl font-semibold mb-2">${formatPrice(price)}</p>

                  <p className={change >= 0 ? "text-green-400" : "text-red-400"}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </p>

                  <div className="my-3 h-16 rounded-xl bg-black/20 p-2 overflow-hidden">
                    <svg viewBox="0 0 110 60" className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={getMiniChartPoints(coin)}
                        className={change >= 0 ? "text-green-400" : "text-red-400"}
                      />
                    </svg>
                  </div>

                  <div
                    className={`flex items-center gap-2 mt-3 font-semibold ${signal.color} px-3 py-2 rounded-xl animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]`}
                  >
                    <SignalIcon size={18} />
                    <span>{signal.text}</span>
                  </div>


                  <div className="mt-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Skor</span>
                      <span>{signal.score}/100</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-emerald-300 font-semibold">Olasılık</span>
                      <span>%{Math.round(signal.probability || signal.score || 0)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-blue-300 font-semibold">Para Giriş/Çıkış</span>
                      <span>%{signal.moneyIn || 50} / %{signal.moneyOut || 50}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-purple-300 font-semibold">Trend/Haber</span>
                      <span>{signal.traderBias || "DENGELİ"} · {signal.newsSentiment || "NÖTR"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-cyan-300 font-semibold">RSI</span>
                      <span
                        className={`font-bold ${
                          signal.rsi >= 60
                            ? "text-green-400"
                            : signal.rsi >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {signal.rsi}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>EMA</span>
                      <span>${formatPrice(signal.ema)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>MACD</span>
                      <span>{safeNumber(signal.macd).toFixed(2)}</span>
                    </div>
                  </div>

                  {targets && (
                    <div className="mt-4 bg-black/30 rounded-xl p-3 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>İpucu</span>
                        <span className="font-bold">{signal.type}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-white font-semibold">Giriş</span>
                        <span>${formatPrice(targets.entry)}</span>
                      </div>

                      <div className="flex justify-between text-green-400">
                        <span className="text-green-300 font-semibold">TP1</span>
                        <span>${formatPrice(targets.tp1)}</span>
                      </div>

                      <div className="flex justify-between text-green-400">
                        <span className="text-green-300 font-semibold">TP2</span>
                        <span>${formatPrice(targets.tp2)}</span>
                      </div>

                      <div className="flex justify-between text-green-400">
                        <span className="text-green-300 font-semibold">TP3</span>
                        <span>${formatPrice(targets.tp3)}</span>
                      </div>

                      <div className="flex justify-between text-red-400">
                        <span className="text-red-300 font-semibold">Stop Loss</span>
                        <span>${formatPrice(targets.sl)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedCoin && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white overflow-y-auto">
          <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeCoin}
                  className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-2xl"
                >
                  ←
                </button>

                <div>
                  <h2 className="text-3xl font-bold">
                    {selectedCoin?.symbol || "BTCUSDT"}
                    <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-lg">
                      Binance
                    </span>
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Profesyonel Grafik ve Sinyal Paneli
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-4xl font-bold">${formatPrice(selectedPrice)}</p>
                <p className={selectedChange >= 0 ? "text-green-400" : "text-red-400"}>
                  {selectedChange >= 0 ? "+" : ""}
                  {selectedChange.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-sm">24h High</p>
              <p className="text-xl font-bold">
                ${formatPrice(selectedCoin?.highPrice || selectedPrice)}
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-sm">24h Low</p>
              <p className="text-xl font-bold">
                ${formatPrice(selectedCoin?.lowPrice || selectedPrice)}
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-sm">24h Volume</p>
              <p className="text-xl font-bold">
                {safeNumber(selectedCoin?.volume).toLocaleString()}
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-sm">USDT Volume</p>
              <p className="text-xl font-bold">
                ${safeNumber(selectedCoin?.quoteVolume).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 xl:grid-cols-4 gap-5">
            <div className="xl:col-span-3 bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <iframe
                title={selectedCoin?.symbol || "BTCUSDT"}
                src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${
                  selectedCoin?.symbol || "BTCUSDT"
                }&interval=15&theme=dark&style=1&locale=tr&toolbar_bg=%230f172a&enable_publishing=false&hide_top_toolbar=false&hide_legend=false&save_image=false`}
                width="100%"
                height="720"
                frameBorder="0"
              />

              <div className="mt-4 space-y-4 w-full">
                {canSeeTrend && (
                <div className="bg-black/40 border border-cyan-400/20 rounded-2xl p-4 w-full">
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-cyan-300 font-bold">
                        💹 Trend Kırılımı / Retest Analizi
                      </div>
                      <div className="text-xs text-yellow-300">
                        Gerçek Binance 15m mum verisi
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="rounded-xl bg-green-500/10 border border-green-400/20 p-2">
                        <div className="text-[10px] text-green-300 font-bold">DESTEK</div>
                        <div className="text-sm font-black text-white">
                          ${formatPrice(safeSupport)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-red-500/10 border border-red-400/20 p-2">
                        <div className="text-[10px] text-red-300 font-bold">DİRENÇ</div>
                        <div className="text-sm font-black text-white">
                          ${formatPrice(safeResistance)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/20 p-2">
                        <div className="text-[10px] text-cyan-300 font-bold">TREND</div>
                        <div className="text-sm font-black text-white">
                          {selectedSignal?.score >= 70 ? "YUKARI" : selectedSignal?.score >= 40 ? "KARARSIZ" : "AŞAĞI"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-yellow-500/10 border border-yellow-400/20 p-2">
                        <div className="text-[10px] text-yellow-300 font-bold">KIRILIM</div>
                        <div className="text-sm font-black text-white">
                          {selectedSignal?.score >= 70 ? "ONAYLI" : "BEKLENİYOR"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-3 py-2 text-xs text-slate-200 leading-relaxed">
                      Beyaz çizgi trend yönünü, mavi çizgi fiyat hareketini gösterir.
                      Fiyat direnç üstüne hacimli çıkarsa güçlü kırılım oluşur.
                      Sarı bölge retest alanıdır.
                    </div>
                  </div>

                  <ChartSafeBoundary>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={chartTrend.data}>
                      <XAxis dataKey="time" hide />
                      <YAxis
                        orientation="right"
                        tick={{ fill: "#aaa", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[Math.max(0, trendMin * 0.995), trendMax * 1.005]}
                      />
                      <Tooltip />

                      <ReferenceArea
                        y1={safeRetestBottom}
                        y2={safeRetestTop}
                        fill="rgba(34,211,238,0.12)"
                      />

                      <ReferenceLine
                        y={safeResistance}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={{
                          value: "Direnç",
                          fill: "#ef4444",
                          position: "right",
                          fontSize: 12,
                        }}
                      />

                      <ReferenceLine
                        y={safeSupport}
                        stroke="#22c55e"
                        strokeDasharray="5 5"
                        label={{
                          value: "Destek",
                          fill: "#22c55e",
                          position: "right",
                          fontSize: 12,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="trend"
                        stroke="#ffffff"
                        strokeWidth={2}
                        strokeDasharray="6 5"
                        dot={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        dot={false}
                      />

                      <Scatter
                        data={safeBreakPoints}
                        dataKey="price"
                        fill="#ef4444"
                      />

                      <Scatter
                        data={safeRetestPoints}
                        dataKey="price"
                        fill="#facc15"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  </ChartSafeBoundary>
                </div>
                )}

                {!canSeeTrend && (
                  <div className="bg-black/40 border border-yellow-400/20 rounded-2xl p-4 w-full text-sm text-yellow-200">
                    🔒 Trend Kırılımı / Retest Analizi sadece ELITE ve ULTRA paketlerinde açılır.
                  </div>
                )}

                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 w-full">
                  <div className="text-sm text-slate-400 mb-2">
                    RSI Grafik - Gerçek mum verisi
                  </div>

                  <ChartSafeBoundary>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={safeRsiData}>
                      <XAxis dataKey="time" hide />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        orientation="right"
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />

                      <ReferenceArea y1={70} y2={100} fill="rgba(255,0,0,0.1)" />
                      <ReferenceArea y1={30} y2={70} fill="rgba(0,255,0,0.05)" />
                      <ReferenceArea y1={0} y2={30} fill="rgba(0,0,255,0.1)" />
                      <ReferenceLine y={50} stroke="#888" strokeDasharray="3 3" />

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </ChartSafeBoundary>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 w-full">
                  <div className="text-sm text-slate-400 mb-2">
                    MACD Grafik - Gerçek mum verisi
                  </div>

                  <ChartSafeBoundary>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={safeMacdData}>
                      <XAxis dataKey="time" hide />
                      <YAxis
                        orientation="right"
                        tick={{ fill: "#aaa", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />

                      <Bar dataKey="hist" barSize={8}>
                        {safeMacdData.map((entry, index) => (
                          <Cell
                            key={`macd-${index}`}
                            fill={entry.hist >= 0 ? "#22c55e" : "#ef4444"}
                          />
                        ))}
                      </Bar>

                      <Line
                        type="monotone"
                        dataKey="dif"
                        stroke="#facc15"
                        strokeWidth={2}
                        dot={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="dea"
                        stroke="#d946ef"
                        strokeWidth={2}
                        dot={false}
                      />

                      <Scatter
                        data={safeMacdData.filter((d) => d.signal === "BUY")}
                        dataKey="dif"
                        fill="#22c55e"
                      />

                      <Scatter
                        data={safeMacdData.filter((d) => d.signal === "SELL")}
                        dataKey="dif"
                        fill="#ef4444"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  </ChartSafeBoundary>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-lg ${
                    selectedSignal.score >= 70
                      ? "text-green-400 bg-green-500/20 border border-green-500/30"
                      : selectedSignal.score >= 40
                      ? "text-yellow-400 bg-yellow-500/20 border border-yellow-500/30"
                      : "text-red-400 bg-red-500/20 border border-red-500/30"
                  }`}
                >
                  <SelectedIcon size={22} />
                  <span>{selectedSignal.text}</span>
                </div>

                <div className="mt-5 space-y-3 text-sm bg-black/20 rounded-2xl p-4 border border-white/10">
                  <div className="flex justify-between">
                    <span className="text-white font-semibold">İşlem Tipi</span>
                    <span className="font-bold">{selectedSignal.type}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-green-300 font-semibold">Alıcı Gücü</span>
                    <span className="font-bold text-green-300">%{Math.min(95, Math.max(5, Math.round(selectedSignal.score)))}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-red-300 font-semibold">Satıcı Gücü</span>
                    <span className="font-bold text-red-300">%{Math.max(5, 100 - Math.min(95, Math.max(5, Math.round(selectedSignal.score))))}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-semibold">Hacim Baskısı</span>
                    <span className="font-bold text-cyan-200">{selectedSignal.score >= 80 ? "Yüksek" : selectedSignal.score >= 55 ? "Orta" : "Düşük"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-yellow-300 font-semibold">Balina Oranı</span>
                    <span className="font-bold text-yellow-200">%{Math.min(42, Math.max(8, Math.round(Math.abs(safeNumber(selectedSignal.macd)) * 3 + selectedSignal.score / 5)))}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-semibold">Güven Skoru</span>
                    <span className="font-bold">{selectedSignal.score} / 100</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-emerald-300 font-semibold">Yön Olasılığı</span>
                    <span className="font-bold text-emerald-200">%{Math.round(selectedSignal.probability || selectedSignal.score || 0)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-blue-300 font-semibold">Para Girişi</span>
                    <span className="font-bold text-blue-200">%{selectedSignal.moneyIn || 50}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-pink-300 font-semibold">Para Çıkışı</span>
                    <span className="font-bold text-pink-200">%{selectedSignal.moneyOut || 50}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-purple-300 font-semibold">Trader Yoğunluğu</span>
                    <span className="font-bold text-purple-200">{selectedSignal.traderBias || "DENGELİ"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-yellow-300 font-semibold">Haber Nabzı</span>
                    <span className="font-bold text-yellow-200">{selectedSignal.newsSentiment || "NÖTR"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-orange-300 font-semibold">Direnç / Destek</span>
                    <span className="font-bold text-orange-200">${formatPrice(selectedSignal.resistance)} / ${formatPrice(selectedSignal.support)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-semibold">RSI</span>
                    <span className="font-bold">{selectedSignal.rsi}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-semibold">EMA</span>
                    <span className="font-bold">${formatPrice(selectedSignal.ema)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-semibold">MACD</span>
                    <span className="font-bold">
                      {safeNumber(selectedSignal.macd).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedTargets && (
                <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                 <div className="flex items-center justify-between mb-4">
  <h3 className="text-xl font-bold text-cyan-300">
    Ticaret Planı
  </h3>

  <div className="text-right text-xs text-slate-300">
    <div>Sinyal Güncelleme</div>
    <div className="font-bold text-cyan-300">
      {selectedSignalDate} · {selectedSignalTime}
    </div>
  </div>
</div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between bg-white/5 p-3 rounded-xl">
                      <span>Giriş</span>
                      <span className="font-bold">${formatPrice(selectedTargets.entry)}</span>
                    </div>

                    <div className="flex justify-between bg-green-500/10 text-green-400 p-3 rounded-xl">
                      <span>TP1</span>
                      <span className="font-bold">${formatPrice(selectedTargets.tp1)}</span>
                    </div>

                    <div className="flex justify-between bg-green-500/10 text-green-400 p-3 rounded-xl">
                      <span>TP2</span>
                      <span className="font-bold">${formatPrice(selectedTargets.tp2)}</span>
                    </div>

                    <div className="flex justify-between bg-green-500/10 text-green-400 p-3 rounded-xl">
                      <span>TP3</span>
                      <span className="font-bold">${formatPrice(selectedTargets.tp3)}</span>
                    </div>

                    <div className="flex justify-between bg-red-500/10 text-red-400 p-3 rounded-xl">
                      <span>Stop Loss</span>
                      <span className="font-bold">${formatPrice(selectedTargets.sl)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-200 backdrop-blur-md">
                Bu panel analiz/prototip amaçlıdır. Yatırım tavsiyesi değildir.
                <div className="mt-2 text-sm text-slate-300 text-right">
                  Sinyal saati: {selectedSignalTime}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  return (
    <AppErrorBoundary>
      <TraderProApp />
    </AppErrorBoundary>
  );
}
