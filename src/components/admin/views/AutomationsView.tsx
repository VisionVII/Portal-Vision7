import React from 'react';
import AdminAutomationPanel from '@/components/admin/AdminAutomationPanel';

const AutomationsView: React.FC<{ isActive?: boolean }> = ({ isActive }) => <AdminAutomationPanel isActive={isActive} />;

export default AutomationsView;
