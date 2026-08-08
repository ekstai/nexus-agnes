import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ChatPage from './pages/ChatPage/ChatPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import PluginsPage from './pages/PluginsPage/PluginsPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ChatPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
