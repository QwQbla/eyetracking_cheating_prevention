import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSwitcher = ({ currentRole }) => {
    const navigate = useNavigate();
    
    const handleSwitch = () => {
        if (currentRole === 'interviewer') {
            navigate('/interviewee/home');
        } else {
            navigate('/interviewer/home');
        }
    };

    return (
        <button className="role-switcher" onClick={handleSwitch}>
            {currentRole === 'interviewer' ? '切换到面试者视图' : '切换到面试官视图'}
        </button>
    );
};

export default RoleSwitcher;