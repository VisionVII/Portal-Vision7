import React, { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Mail, TrendingUp } from 'lucide-react';

const CrmContactsTable = lazy(() => import('@/components/admin/CrmContactsTable'));
const NewsletterManager = lazy(() => import('@/components/admin/NewsletterManager'));
const CrmDealsBoard = lazy(() => import('@/components/admin/CrmDealsBoard'));

const Fallback = () => (
  <div className="space-y-4 pt-4">
    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
  </div>
);

const CrmView: React.FC = () => (
  <Tabs defaultValue="contacts" className="w-full">
    <TabsList className="mb-4 h-auto w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsTrigger value="contacts" className="gap-1.5 px-3 py-2 text-xs sm:px-4">
        <Users className="h-4 w-4 shrink-0" /> Contactos
      </TabsTrigger>
      <TabsTrigger value="newsletter" className="gap-1.5 px-3 py-2 text-xs sm:px-4">
        <Mail className="h-4 w-4 shrink-0" /> Newsletter
      </TabsTrigger>
      <TabsTrigger value="deals" className="gap-1.5 px-3 py-2 text-xs sm:px-4">
        <TrendingUp className="h-4 w-4 shrink-0" /> Pipeline
      </TabsTrigger>
    </TabsList>
    <TabsContent value="contacts">
      <Suspense fallback={<Fallback />}>
        <CrmContactsTable />
      </Suspense>
    </TabsContent>
    <TabsContent value="newsletter">
      <Suspense fallback={<Fallback />}>
        <NewsletterManager />
      </Suspense>
    </TabsContent>
    <TabsContent value="deals">
      <Suspense fallback={<Fallback />}>
        <CrmDealsBoard />
      </Suspense>
    </TabsContent>
  </Tabs>
);

export default CrmView;
