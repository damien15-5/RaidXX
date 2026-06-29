import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/404';

import TaskList from './pages/tasks/TaskList';
import TaskUpload from './pages/tasks/TaskUpload';


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path='/' element={<Home />} />
  
        {/* Task Page */}
        <Route path='/task/upload' element={<TaskUpload />} />
        <Route path="/task" element={<TaskList />} />

        {/* 404 Page */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App