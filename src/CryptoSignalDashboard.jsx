import React, { useEffect, useState } from 'react';
import { TrendingUp, Activity, Coins, BarChart3, RefreshCw } from 'lucide-react';

function CryptoSignalDashboard() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  const getSignal = (change) => {
    if (change >= 8) {
      return {
        text: 'GÜÇLÜ AL',
        color: 'text-green-400 bg-green-500/20 border border-green-500/30',
        icon: '🚀',
        score: 95,
      };
    }

    if (change >= 3) {
      return {
        text: 'AL',
        color: 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30',
        icon: '📈',
        score: 75,
      };
    }

    if (change > -3) {
      return {
        text: 'BEKLE',
        color: 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30',
        icon: '⏳',
        score: 50,
      };
    }

    return {
      text: 'SAT',
      color: 'text-red-400 bg-red-500/20 border border-red-500/30',
      icon: '📉',
      score: 25,
    };
  };

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
      );
      const data = await response.json();
      setCoins(data);
    } catch (error) {
      console.error('Veri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Crypto AI Trader Pro</h1>
            <p className="text-slate-400">
              100 Coin Canlı Analiz ve Sinyal Platformu
            </p>
          </div>
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <TrendingUp className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-semibold">Piyasa Trend</h3>
            <p className="text-emerald-400">Canlı Takip</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <Coins className="w-10 h-10 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold">Takip Edilen</h3>
            <p className="text-slate-300">100 Coin</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <Activity className="w-10 h-10 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold">Aktif Sinyal</h3>
            <p className="text-slate-300">Gerçek Zamanlı</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <BarChart3 className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold">Güncelleme</h3>
            <p className="text-slate-300">30 Saniye</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-7 h-7 text-emerald-400" />
            <h2 className="text-2xl font-bold">İlk 100 Coin Canlı Fiyatlar</h2>
          </div>

          {loading ? (
            <p className="text-slate-400">Veriler yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[900px] overflow-y-auto">
              {coins.map((coin) => {
                const signal = getSignal(coin.price_change_percentage_24h || 0);

                return (
                  <div
                    key={coin.id}
                    className="flex items-center justify-between bg-slate-800 rounded-xl p-5 hover:bg-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="w-10 h-10"
                      />
                      <div>
                        <h3 className="text-lg font-semibold">{coin.name}</h3>
                        <p className="text-slate-400 uppercase">
                          {coin.symbol}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold">
                        ${coin.current_price.toLocaleString()}
                      </p>

                      <p
                        className={`font-semibold ${
                          coin.price_change_percentage_24h >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {(coin.price_change_percentage_24h || 0).toFixed(2)}%
                      </p>

                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${signal.color}`}
                      >
                        {signal.icon} {signal.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CryptoSignalDashboard;