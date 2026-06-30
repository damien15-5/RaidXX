import { Outlet } from 'react-router-dom';
import BottomBar from './BottomBar';
import DevnetGuard from './DevnetGuard';

const Layout = () => {
  return (
    <div className="flex flex-col min-h-full bg-surface max-w-lg mx-auto relative">
      {/* Devnet network warning banner */}
      <DevnetGuard />

      {/* Page content */}
      <main className="flex-1 pb-safe overflow-y-auto">
        <Outlet />
      </main>

      {/* Sticky bottom navigation */}
      <BottomBar />
    </div>
  );
};

export default Layout;
