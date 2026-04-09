import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';
import { WifiOff, Wifi } from 'lucide-react';

const NetworkStatusNotifier = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { toast } = useToast();
  const hasShownOfflineToast = useRef(false);

  useEffect(() => {
    if (!isOnline && !hasShownOfflineToast.current) {
      toast({
        title: 'Sem conexão',
        description: 'Verifique a sua ligação à internet.',
        variant: 'destructive',
        duration: 5000,
      });
      hasShownOfflineToast.current = true;
    }

    if (isOnline && wasOffline && hasShownOfflineToast.current) {
      toast({
        title: 'Conexão restabelecida',
        description: 'A carregar dados atualizados...',
        duration: 3000,
      });
      hasShownOfflineToast.current = false;
    }
  }, [isOnline, wasOffline, toast]);

  return null;
};

export default NetworkStatusNotifier;
