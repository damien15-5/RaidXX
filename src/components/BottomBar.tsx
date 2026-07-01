import { NavLink } from 'react-router-dom';

const BottomBar = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100/80 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-16 relative">
        
        {/* Left Side: Wallet & Tasks */}
        <div className="flex items-center justify-around flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[10px] font-bold tracking-wide transition-all duration-200
               ${isActive ? 'text-brand-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 mb-0.5
                    ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}
                >
                  <i className="fa-solid fa-wallet text-base" />
                </span>
                <span>Wallet</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/task"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[10px] font-bold tracking-wide transition-all duration-200
               ${isActive ? 'text-brand-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 mb-0.5
                    ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}
                >
                  <i className="fa-solid fa-list-check text-base" />
                </span>
                <span>Tasks</span>
              </>
            )}
          </NavLink>
        </div>

        {/* Center: Faucet FAB (3x bigger / prominent circular button) */}
        <div className="relative w-16 h-16 flex items-center justify-center -mt-6 z-20">
          <NavLink
            to="/faucet"
            className={({ isActive }) =>
              `absolute -top-3 flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 shadow-md active:scale-95
               ${isActive 
                 ? 'bg-gradient-to-tr from-brand-600 to-blue-500 text-white scale-110 shadow-brand-500/30 ring-4 ring-brand-100' 
                 : 'bg-white text-gray-400 border border-gray-100 hover:text-brand-500 hover:border-brand-100 shadow-sm'}`
            }
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center">
                <i className={`fa-solid fa-droplet text-xl ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span className={`text-[9px] font-extrabold mt-0.5 ${isActive ? 'text-white' : 'text-gray-500'}`}>Faucet</span>
              </div>
            )}
          </NavLink>
        </div>

        {/* Right Side: Upload & Verify */}
        <div className="flex items-center justify-around flex-1">
          <NavLink
            to="/task/upload"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[10px] font-bold tracking-wide transition-all duration-200
               ${isActive ? 'text-brand-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 mb-0.5
                    ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}
                >
                  <i className="fa-solid fa-circle-plus text-base" />
                </span>
                <span>Upload</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/task/verify"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[10px] font-bold tracking-wide transition-all duration-200
               ${isActive ? 'text-brand-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 mb-0.5
                    ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}
                >
                  <i className="fa-solid fa-shield-halved text-base" />
                </span>
                <span>Verify</span>
              </>
            )}
          </NavLink>
        </div>

      </div>
    </nav>
  );
};

export default BottomBar;

