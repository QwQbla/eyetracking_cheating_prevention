//App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route , Outlet} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import InterviewerHomePage from './pages/InterviewerHomePage';
import IntervieweeHomePage from './pages/IntervieweeHomePage';
import IntervieweeProfile from './pages/IntervieweeProfile';
import InterviewerProfile from './pages/InterviewerProfile';
import IntervieweeContent from './pages/IntervieweeContent';
import InterviewerContent from './pages/InterviewerContent';
import CameraCalibrationPage from './pages/CameraCalibrationPage';
import { WebgazerProvider } from './contexts/WebgazerProvider'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// 创建一个共享 Provider 的布局组件
const GazeTrackingLayout = () => (
    <WebgazerProvider>
        <Outlet />
    </WebgazerProvider>
);

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/interviewer/home" element={<InterviewerHomePage />} />
                <Route path="/interviewee/home" element={<IntervieweeHomePage />} />
                <Route path="/interviewee/profile" element={<IntervieweeProfile />} />
                <Route path="/interviewer/profile" element={<InterviewerProfile />} />
                <Route path="/interviewer/content/:roomId" element={<InterviewerContent />} />
                <Route element={<GazeTrackingLayout />}>
                    <Route path="/calibration/:roomId" element={<CameraCalibrationPage />} />
                    <Route path="/interviewee/content/:roomId" element={<IntervieweeContent />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;
