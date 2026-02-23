import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './Layout.css';

const AppLayout = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-main">
                <TopBar />
                <div className="app-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AppLayout;
