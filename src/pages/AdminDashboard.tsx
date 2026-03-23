import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, LogOut, LayoutDashboard, FileText, Mail, Settings } from 'lucide-react';
import SiteSettingsManager from '@/components/admin/SiteSettingsManager';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts, Post } from '@/hooks/usePosts';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';
import NewsletterManager from '@/components/admin/NewsletterManager';

const AdminDashboard = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setShowPostForm(true);
    setActiveTab('posts');
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
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-portugal-green mx-auto"></div>
          <p className="mt-4 text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-portugal-green hover:text-portugal-green/80 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-portugal-green" />
                <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:block">
                {user.email}
              </span>
              <Button 
                onClick={() => {
                  setEditingPost(null);
                  setShowPostForm(true);
                  setActiveTab('posts');
                }}
                size="sm"
                className="bg-portugal-green hover:bg-portugal-green/90"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Novo Post</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="gap-1.5">
              <Mail className="h-4 w-4" />
              Newsletter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminStatsCards />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PostsTable 
                  posts={posts?.slice(0, 5)} 
                  isLoading={postsLoading} 
                  onEdit={handleEdit}
                />
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setEditingPost(null);
                        setShowPostForm(true);
                        setActiveTab('posts');
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Criar novo post
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => setActiveTab('newsletter')}
                    >
                      <Mail className="h-4 w-4" />
                      Ver subscritores
                    </Button>
                    <Link to="/" target="_blank">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Ver site público
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="posts">
            {showPostForm && (
              <PostForm post={editingPost} onClose={handleCloseForm} />
            )}
            <PostsTable 
              posts={posts} 
              isLoading={postsLoading} 
              onEdit={handleEdit}
            />
          </TabsContent>

          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
