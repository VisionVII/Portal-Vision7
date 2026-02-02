import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts, Post } from '@/hooks/usePosts';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';

const AdminDashboard = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setShowPostForm(true);
  };

  const handleCloseForm = () => {
    setShowPostForm(false);
    setEditingPost(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-portugal-green mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="text-portugal-green hover:text-portugal-green/80 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden md:block">
                {user.email}
              </span>
              <Button 
                onClick={() => {
                  setEditingPost(null);
                  setShowPostForm(!showPostForm);
                }}
                className="bg-portugal-green hover:bg-portugal-green/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Post
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <AdminStatsCards />

        {/* Formulário Novo Post */}
        {showPostForm && (
          <PostForm post={editingPost} onClose={handleCloseForm} />
        )}

        {/* Lista de Posts */}
        <PostsTable 
          posts={posts} 
          isLoading={postsLoading} 
          onEdit={handleEdit}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
