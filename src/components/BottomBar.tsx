import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', icon: 'fa-solid fa-wallet', label: 'Wallet' },
  { to: '/task', icon: 'fa-solid fa-list-check', label: 'Tasks' },
  { to: '/task/upload', icon: 'fa-solid fa-circle-plus', label: 'Upload' },
  { to: '/task/verify', icon: 'fa-solid fa-shield-halved', label: 'Verify' },
];

const BottomBar = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-100/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-1 py-3 text-xs font-medium transition-colors
               ${isActive
                 ? 'text-brand-600'
                 : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors
                    ${isActive ? 'bg-brand-100' : ''}`}
                >
                  <i className={`${icon} text-base`} />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomBar;
