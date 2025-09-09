import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import InterviewerHomePage from './pages/InterviewerHomePage';
import IntervieweeHomePage from './pages/IntervieweeHomePage';
import IntervieweeProfile from './pages/IntervieweeProfile';
import InterviewerProfile from './pages/InterviewerProfile';
import IntervieweeContent from './pages/IntervieweeContent';
import InterviewerContent from './pages/InterviewerContent';
import './App.css';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/interviewer/home" element={<InterviewerHomePage />} />
                <Route path="/interviewee/home" element={<IntervieweeHomePage />} />
                <Route path="/interviewee/profile" element={<IntervieweeProfile />} />
                <Route path="/interviewer/profile" element={<InterviewerProfile />} />
                <Route path="/interviewee/content" element={<IntervieweeContent />} />
                <Route path="/interviewer/content" element={<InterviewerContent />} />
            </Routes>
        </Router>
    );
};

export default App;
