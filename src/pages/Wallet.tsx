import { useState } from 'react';

// Types
type TxType = 'topup' | 'withdraw';

interface Transaction {
  id: number;
  type: TxType;
  date: string; // e.g. "Oct 24, 2023"
  time: string; // e.g. "14:30"
  wallet: string; // full wallet address
  usdtAmount: number; // only for topup (USDT sent in)
  points: number; // only for withdraw (points redeemed)
}

// Mock history data 
// Top up  → user sends USDT in  → receives points  (shown as $xx.xx)
// Withdraw → user redeems points → receives USDT    (shown as xxx pts)
const HISTORY: Transaction[] = [
  {
    id: 1,
    type: 'topup',
    date: 'Oct 24, 2023',
    time: '14:30',
    wallet: '0x7a21c3f8e294b6d7a1082ef4c59f9d2b43e8f9e2',
    usdtAmount: 150.00,
    points: 1500,
  },
  {
    id: 2,
    type: 'withdraw',
    date: 'Oct 23, 2023',
    time: '09:15',
    wallet: '0x3b12a74f9c38d51e6bca8240e19d7f53e82ba4c1',
    points: 500,
    usdtAmount: 50.00,
  },
  {
    id: 3,
    type: 'topup',
    date: 'Oct 22, 2023',
    time: '18:45',
    wallet: '0x9d44e21c7f83a609d5b14238fc70e91d5247e2b3',
    usdtAmount: 50.00,
    points: 500,
  },
  {
    id: 4,
    type: 'withdraw',
    date: 'Oct 21, 2023',
    time: '11:20',
    wallet: '0x1c88b93d2f17a04e8560d9c32f7b148e93fcd9a0',
    points: 200,
    usdtAmount: 20.00,
  },
  {
    id: 5,
    type: 'topup',
    date: 'Oct 20, 2023',
    time: '16:05',
    wallet: '0x5f31da97c64b2e38a0912f7e4530b8c9a164b8c4',
    usdtAmount: 25.00,
    points: 250,
  },
  {
    id: 6,
    type: 'topup',
    date: 'Oct 19, 2023',
    time: '12:30',
    wallet: '0x2e99f148c30d82b61a9405e7f218b4c9f3d1a1f5',
    usdtAmount: 100.00,
    points: 1000,
  },
  {
    id: 7,
    type: 'withdraw',
    date: 'Oct 18, 2023',
    time: '08:45',
    wallet: '0x8d22c14a97e30b42d17f5c9384b1e62f93a7c3e7',
    points: 1000,
    usdtAmount: 100.00,
  },
  {
    id: 8,
    type: 'topup',
    date: 'Oct 17, 2023',
    time: '14:15',
    wallet: '0x4a55f38c92b1d70e9a0283c7b4d6e31a82f7f6d8',
    usdtAmount: 75.00,
    points: 750,
  },
  {
    id: 9,
    type: 'withdraw',
    date: 'Oct 16, 2023',
    time: '10:00',
    wallet: '0x6b11e29d84a5c30f7b1240e59c3f8d7a2b94e9a2',
    points: 150,
    usdtAmount: 15.00,
  },
  {
    id: 10,
    type: 'topup',
    date: 'Oct 15, 2023',
    time: '19:50',
    wallet: '0x0d33e7f24b9c81a60e3285d1f7c9a43e7b28b4f1',
    usdtAmount: 200.00,
    points: 2000,
  },
];

const Wallet = () => {
  const [balanceHidden, setBalanceHidden] = useState(false);

  return (
    <div className="min-h-screen bg-surface">

      {/* Header */}
      <header className="flex fixed top-0 left-0 right-0 z-10 w-full p-3 items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center text-white text-sm font-bold">
            U
          </div>
          <h1 className="text-lg font-bold text-gray-900">Username</h1>
        </div>
        <button
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="More options"
        >
          <i className="fa-solid fa-ellipsis-vertical text-sm" />
        </button>
      </header>

      {/* Balance Card */}
      <section className="mx-4 mt-20 rounded-2xl overflow-hidden shadow-sm">
        <div
          className="relative px-6 pt-6 pb-8"
          style={{ background: 'linear-gradient(135deg, #dde8ff 0%, #c7d9ff 40%, #bdd0ff 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute bottom-[-30px] left-[-20px] w-28 h-28 rounded-full bg-white/15" />

          {/* Label + eye */}
          <div className="flex items-center justify-between mb-2 relative">
            <span className="text-sm text-blue-800/70 font-medium">Total Balance</span>
            <button
              onClick={() => setBalanceHidden(v => !v)}
              className="text-blue-700/60 hover:text-blue-800 transition-colors"
              aria-label="Toggle balance visibility"
            >
              <i className={`fa-solid ${balanceHidden ? 'fa-eye-slash' : 'fa-eye'} text-lg`} />
            </button>
          </div>

          {/* Amount */}
          <p className="text-4xl font-extrabold text-gray-800 tracking-tight relative mb-6">
            {balanceHidden ? '••••••' : <div className='flex items-center'>1,000,000 <i className='fa-solid fa-coins text-lg ml-2' /></div>}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 relative">
            <button className="flex flex-1 justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow transition-all active:scale-95">
              <i className="fa-solid fa-circle-plus text-lg" />
              Top Up
            </button>
            <button className="flex flex-1 justify-center items-center gap-2 bg-white/70 backdrop-blur hover:bg-white/90 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95">
              <i className="fa-solid fa-arrow-up text-sm" />
              Withdraw
            </button>
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="mx-4 mt-5 mb-4">

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
          <button className="text-xs text-blue-500 font-medium hover:text-blue-700 transition-colors">
            See all
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {HISTORY.length === 0 ? (
            <p className="text-center text-gray-400">No transactions yet</p>
            ) : (
              HISTORY.map(tx => {
              const isTopup = tx.type === 'topup';
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 bg-white hover:bg-gray-50/80 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  {/* Icon bubble */}
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2
                    ${isTopup
                      ? 'border-blue-400 text-blue-500 bg-blue-50'
                      : 'border-red-400  text-red-400  bg-red-50'}`}
                  >
                    <i className={`fa-solid ${isTopup ? 'fa-circle-plus' : 'fa-arrow-up'} text-lg`} />
                  </div>
  
                  {/* Middle — label + date/time + wallet */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {isTopup ? 'Top Up' : 'Withdrawal'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.time}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {tx.date}
                    </p>
                  </div>
  
                  {/* Right — amount */}
                  <div className="text-right shrink-0">
                    {isTopup ? (
                      <>
                        <div className="flex items-center justify-end gap-0.5">
                          <p className="text-sm font-bold text-blue-600">
                            <i className="fa-solid fa-dollar-sign text-xs" />
                            {tx.usdtAmount.toFixed(2)}
                          </p>
                          <i className="fa-solid fa-arrow-right text-blue-400 text-xs mx-1" />
                          <p className="text-sm font-bold text-blue-600">
                            {tx.points.toLocaleString()}
                            <i className="fa-solid fa-coins text-xs ml-1" />
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">USDT to Points</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-end gap-0.5">
                          <p className="text-sm font-bold text-red-400">
                            {tx.points!.toLocaleString()}
                            <i className="fa-solid fa-coins text-xs ml-1" />
                          </p>
                          <i className="fa-solid fa-arrow-right text-red-400 text-xs mx-1" />
                          <p className="text-sm font-bold text-red-400">
                            <i className="fa-solid fa-dollar-sign text-xs" />
                            {tx.usdtAmount.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Points to USDT</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* breathing room above bottom bar */}
        <div className="h-4" />
      </section>
    </div>
  );
};

export default Wallet;
