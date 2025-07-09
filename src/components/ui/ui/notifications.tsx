import React from 'react';
import { BellIcon } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../../../../firebase-config';
import { getApiUrl } from '@/lib/config';

// Helper function to convert base64 string to Uint8Array
const urlB64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const NotificationSettings = () => {
  const [permission, setPermission] = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
  };

  const generateSubscription = async (registration: ServiceWorkerRegistration) => {
    try {
      console.log('Generating subscription...');
      
      const subscription = await registration.pushManager.subscribe(options);
      console.log('Push subscription generated:', subscription);
      
      // Get current user
      const user = auth.currentUser;
      console.log('Current user:', user?.uid);
      
      if (!user) {
        toast.error('Please sign in to enable period reminders');
        return;
      }

      console.log('Attempting to save to Admin DB via API...');
      
      // Save subscription using Admin SDK via API route
      const subscriptionData = JSON.parse(JSON.stringify(subscription));
      console.log('Data being saved via API:', subscriptionData);
      
      const response = await fetch(getApiUrl('manageSubscription'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          subscription: subscriptionData,
          userId: user.uid
        })
      });

      if (response.ok) {
        console.log('✅ Successfully saved to Admin DB via API!');
        toast.success('Period reminders enabled successfully!', {
          description: 'You\'ll get notified 10 minutes before each class'
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save subscription:', errorData);
        toast.error('Failed to save subscription: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error in generateSubscription:', error);
      console.error('Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      toast.error('Failed to enable period reminders');
    }
  };

  const subscribeToNotifications = async () => {
    if (!navigator.onLine) {
      toast.error('You need to be online to enable period reminders');
      return;
    }

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        generateSubscription(registration);
      } else {
        console.log('No service worker registration found');
        toast.error('Service worker not registered');
      }
    }
  };

  const requestNotificationPermission = async () => {
    console.log('Requesting notification permission');
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast.error('This browser does not support period reminders');
        return;
      }

      if (!navigator.onLine) {
        toast.error('You need to be online to enable period reminders');
        return;
      }

      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToNotifications();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Error requesting period reminder permission');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <button 
        onClick={() => {
          if (permission === 'granted') {
            toast.info('Period reminders are already enabled!', {
              description: 'You\'ll get notified 10 minutes before each class'
            });
          } else if (permission === 'default') {
            requestNotificationPermission();
          } else {
            toast.info(
              'Please change notification settings in your browser settings',
              {
                description: 'You have already blocked notifications'
              }
            );
          }
        }}
        className="rounded-full p-2 hover:bg-gray-100 transition-colors"
      >
        <BellIcon className={`h-6 w-6 ${permission === 'granted' ? 'text-blue-600' : 'text-gray-600'}`} />
      </button>
    </div>
  );
};