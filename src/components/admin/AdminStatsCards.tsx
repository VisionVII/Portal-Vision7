import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Eye, PenTool } from 'lucide-react';
import { usePosts, usePostStats } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const AdminStatsCards = () => {
  const { data: stats, isLoading } = usePostStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-14 w-full sm:h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6 mb-6">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <PenTool className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 dark:text-primary-400" />
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Posts</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{stats?.total || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-secondary-600 dark:text-secondary-400" />
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Visualizações</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {(stats?.totalViews || 0).toLocaleString('pt-PT')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Edit className="h-6 w-6 sm:h-8 sm:w-8 text-primary-500 dark:text-primary-300" />
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Rascunhos</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{stats?.drafts || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-primary-700 dark:text-primary-300" />
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Este Mês</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{stats?.thisMonth || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;
