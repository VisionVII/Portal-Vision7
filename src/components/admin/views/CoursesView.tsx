import React from 'react';
import AdminCoursesManager from '@/components/admin/AdminCoursesManager';

interface CoursesViewProps {
  searchQuery?: string;
}

const CoursesView: React.FC<CoursesViewProps> = ({ searchQuery }) => <AdminCoursesManager searchQuery={searchQuery} />;

export default CoursesView;
