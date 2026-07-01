import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Pages
import Wallet from './pages/Wallet';
import TaskList from './pages/tasks/TaskList';
import TaskUpload from './pages/tasks/TaskUpload';
import TaskVerify from './pages/tasks/TaskVerify';
import Faucet from './pages/Faucet';
import AdminUser from './pages/AdminUser';
import NotFound from './pages/404';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* All main pages share the bottom-bar layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Wallet />} />
          <Route path="/task" element={<TaskList />} />
          <Route path="/task/upload" element={<TaskUpload />} />
          <Route path="/task/verify" element={<TaskVerify />} />
          <Route path="/faucet" element={<Faucet />} />
        </Route>

        {/* Standalone Admin route (no bottom bar, completely separate interface) */}
        <Route path="/admin_user" element={<AdminUser />} />

        {/* 404 — no bottom bar */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;