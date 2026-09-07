import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AppShell from './layout/AppShell';
import TraineeShell from './layout/TraineeShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyEntry from './pages/DailyEntry';
import Trainees from './pages/Trainees';
import TraineeProfile from './pages/TraineeProfile';
import Assessment from './pages/Assessment';
import Reports from './pages/Reports';
import Modules from './pages/Modules';
import Rotation from './pages/Rotation';
import BuddyRating from './pages/BuddyRating';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Today from './pages/trainee/Today';
import MyLog from './pages/trainee/MyLog';
import MyBand from './pages/trainee/MyBand';
import MyChecklist from './pages/trainee/MyChecklist';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/daily" element={<DailyEntry />} />
          <Route path="/trainees" element={<Trainees />} />
          <Route path="/trainees/:code" element={<TraineeProfile />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/rotation" element={<Rotation />} />
          <Route path="/buddy-rating" element={<BuddyRating />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route element={<TraineeShell />}>
          <Route path="/t/today" element={<Today />} />
          <Route path="/t/log" element={<MyLog />} />
          <Route path="/t/band" element={<MyBand />} />
          <Route path="/t/checklist" element={<MyChecklist />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
