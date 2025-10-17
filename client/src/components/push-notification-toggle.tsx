import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications,
  checkPushSubscription,
  registerServiceWorker
} from '@/lib/push-notifications';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initPushNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        return;
      }

      await registerServiceWorker();
      const subscribed = await checkPushSubscription();
      setIsSubscribed(subscribed);
    };

    initPushNotifications();
  }, []);

  const handleToggle = async () => {
    if (!isSupported) {
      toast({
        title: "Tidak Didukung",
        description: "Browser Anda tidak mendukung push notifications",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setIsSubscribed(false);
          toast({
            title: "Notifikasi Dinonaktifkan",
            description: "Anda tidak akan menerima push notifications",
          });
        }
      } else {
        const success = await subscribeToPushNotifications();
        if (success) {
          setIsSubscribed(true);
          toast({
            title: "Notifikasi Diaktifkan",
            description: "Anda akan menerima push notifications untuk update penting",
          });
        } else {
          toast({
            title: "Gagal",
            description: "Gagal mengaktifkan notifikasi. Pastikan Anda memberikan izin.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengatur notifikasi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Browser Anda tidak mendukung push notifications
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid="card-push-notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Terima notifikasi langsung di perangkat Anda untuk update penting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium" data-testid="text-notification-status">
              {isSubscribed ? 'Aktif' : 'Nonaktif'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? 'Anda akan menerima notifikasi untuk booking, membership, dan update lainnya'
                : 'Aktifkan untuk menerima notifikasi penting'
              }
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
            data-testid="switch-push-notifications"
          />
        </div>
      </CardContent>
    </Card>
  );
}
