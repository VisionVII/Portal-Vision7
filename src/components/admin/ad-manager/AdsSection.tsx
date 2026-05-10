import { useState } from 'react';
import {
  Grid3x3, Plus, Upload, ExternalLink, Eye, EyeOff, Calendar,
  Settings, TrendingUp, MousePointerClick, DollarSign, BarChart3,
  Trash2, Edit, Image, Link as LinkIcon, Play, Pause, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type AdProvider = 'custom' | 'adsense' | 'other';
type AdPosition = 'header' | 'sidebar' | 'article' | 'footer';
type AdStatus = 'active' | 'paused' | 'draft';

interface Ad {
  id: string;
  name: string;
  provider: AdProvider;
  position: AdPosition;
  status: AdStatus;
  imageUrl?: string;
  targetUrl?: string;
  advertiserName: string;
  advertiserEmail?: string;
  startDate: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  revenue: number;
  code?: string; // For AdSense or other embedded code
  createdAt: string;
}

const MOCK_ADS: Ad[] = [
  {
    id: '1',
    name: 'Anúncio Premium 300x250',
    provider: 'custom',
    position: 'sidebar',
    status: 'active',
    imageUrl: 'https://via.placeholder.com/300x250/0284C7/FFFFFF?text=Anúncio+Premium',
    targetUrl: 'https://example.com',
    advertiserName: 'Empresa Tech PT',
    advertiserEmail: 'contact@techdemo.pt',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    impressions: 12450,
    clicks: 285,
    revenue: 142.50,
    createdAt: '2026-03-25',
  },
  {
    id: '2',
    name: 'Google AdSense - Header',
    provider: 'adsense',
    position: 'header',
    status: 'active',
    advertiserName: 'Google AdSense',
    startDate: '2026-01-01',
    impressions: 45200,
    clicks: 892,
    revenue: 385.20,
    code: '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
    createdAt: '2025-12-15',
  },
];

export function AdsSection() {
  const [ads, setAds] = useState<Ad[]>(MOCK_ADS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview');

  // Form state
  const [formProvider, setFormProvider] = useState<AdProvider>('custom');
  const [formPosition, setFormPosition] = useState<AdPosition>('sidebar');
  const [formName, setFormName] = useState('');
  const [formAdvertiser, setFormAdvertiser] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const handleToggleStatus = (id: string) => {
    setAds(prev =>
      prev.map(ad =>
        ad.id === id
          ? { ...ad, status: ad.status === 'active' ? 'paused' : 'active' }
          : ad
      )
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este anúncio?')) {
      setAds(prev => prev.filter(ad => ad.id !== id));
    }
  };

  const handleCreateAd = () => {
    const newAd: Ad = {
      id: `ad-${Date.now()}`,
      name: formName || 'Novo Anúncio',
      provider: formProvider,
      position: formPosition,
      status: 'draft',
      advertiserName: formAdvertiser,
      advertiserEmail: formEmail || undefined,
      targetUrl: formUrl || undefined,
      code: formCode || undefined,
      startDate: formStartDate || new Date().toISOString().split('T')[0],
      endDate: formEndDate || undefined,
      impressions: 0,
      clicks: 0,
      revenue: 0,
      createdAt: new Date().toISOString(),
    };

    setAds(prev => [newAd, ...prev]);
    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormAdvertiser('');
    setFormEmail('');
    setFormUrl('');
    setFormCode('');
    setFormStartDate('');
    setFormEndDate('');
    setFormProvider('custom');
    setFormPosition('sidebar');
  };

  // Calculate totals
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
  const totalRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const activeAds = ads.filter(ad => ad.status === 'active').length;

  const providerLabels: Record<AdProvider, string> = {
    custom: 'Inserção Direta',
    adsense: 'Google AdSense',
    other: 'Outro',
  };

  const positionLabels: Record<AdPosition, string> = {
    header: 'Cabeçalho',
    sidebar: 'Barra Lateral',
    article: 'Artigo',
    footer: 'Rodapé',
  };

  const statusIcons = {
    active: <Play className="w-3 h-3" />,
    paused: <Pause className="w-3 h-3" />,
    draft: <Edit className="w-3 h-3" />,
  };

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    draft: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500">
              <Grid3x3 className="w-5 h-5 text-white" />
            </div>
            Gestão de Anúncios
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie anúncios personalizados, AdSense e outras fontes de monetização
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800">
              <Plus className="w-4 h-4 mr-2" />
              Novo Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Anúncio</DialogTitle>
              <DialogDescription>
                Configure um novo anúncio personalizado, AdSense ou outra fonte de monetização
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Tipo de Anúncio</Label>
                <Select value={formProvider} onValueChange={(v) => setFormProvider(v as AdProvider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Inserção Direta (Upload de Arte)</SelectItem>
                    <SelectItem value="adsense">Google AdSense</SelectItem>
                    <SelectItem value="other">Outro Provedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-name">Nome do Anúncio</Label>
                  <Input
                    id="ad-name"
                    placeholder="Ex: Banner Premium 300x250"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advertiser">Nome do Anunciante</Label>
                  <Input
                    id="advertiser"
                    placeholder="Ex: Empresa XYZ"
                    value={formAdvertiser}
                    onChange={(e) => setFormAdvertiser(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email do Anunciante (Opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label>Posição</Label>
                <Select value={formPosition} onValueChange={(v) => setFormPosition(v as AdPosition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Cabeçalho</SelectItem>
                    <SelectItem value="sidebar">Barra Lateral</SelectItem>
                    <SelectItem value="article">Dentro do Artigo</SelectItem>
                    <SelectItem value="footer">Rodapé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional fields based on provider */}
              {formProvider === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="url">URL de Destino</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://exemplo.com"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload de Arte
                    </Button>
                  </div>
                </div>
              )}

              {(formProvider === 'adsense' || formProvider === 'other') && (
                <div className="space-y-2">
                  <Label htmlFor="code">Código do Anúncio</Label>
                  <Textarea
                    id="code"
                    placeholder="Cole aqui o código do AdSense ou outro provedor..."
                    rows={5}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data de Início</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Data de Término (Opcional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAd}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Criar Anúncio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-card to-card/50 border-primary-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Impressões</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {totalImpressions.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary-500/10">
                    <Eye className="w-6 h-6 text-primary-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-secondary-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cliques</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {totalClicks.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary-500/10">
                    <MousePointerClick className="w-6 h-6 text-secondary-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-accent-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      €{totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-accent-500/10">
                    <DollarSign className="w-6 h-6 text-accent-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-emerald-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CTR Médio</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {avgCTR}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Ads Count */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Anúncios Ativos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {activeAds} de {ads.length}
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {Math.round((activeAds / ads.length) * 100)}% ativos
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          {ads.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Grid3x3 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">Nenhum anúncio criado ainda</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Anúncio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {ads.map((ad) => (
                <Card key={ad.id} className="group hover:border-primary-500/30 transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Preview (if custom ad with image) */}
                      {ad.imageUrl && (
                        <div className="w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={ad.imageUrl}
                            alt={ad.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {ad.provider !== 'custom' && (
                        <div className="w-full sm:w-48 h-32 rounded-lg bg-gradient-to-br from-primary-500/10 to-secondary-500/10 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-8 h-8 text-muted-foreground opacity-50" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{ad.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {providerLabels[ad.provider]}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {positionLabels[ad.position]}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${statusColors[ad.status]}`}>
                                {statusIcons[ad.status]}
                                <span className="ml-1 capitalize">{ad.status === 'draft' ? 'Rascunho' : ad.status === 'paused' ? 'Pausado' : 'Ativo'}</span>
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={ad.status === 'active'}
                              onCheckedChange={() => handleToggleStatus(ad.id)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Anunciante</p>
                            <p className="text-sm font-medium text-foreground">{ad.advertiserName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Impressões</p>
                            <p className="text-sm font-medium text-foreground">{ad.impressions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cliques</p>
                            <p className="text-sm font-medium text-foreground">{ad.clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Receita</p>
                            <p className="text-sm font-medium text-foreground">€{ad.revenue.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(ad.startDate).toLocaleDateString('pt-PT')}
                              {ad.endDate && ` → ${new Date(ad.endDate).toLocaleDateString('pt-PT')}`}
                            </div>
                            {ad.targetUrl && (
                              <a
                                href={ad.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary-500 transition-colors"
                              >
                                <LinkIcon className="w-3 h-3" />
                                Ver destino
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(ad.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
