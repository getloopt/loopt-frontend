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
      
      const apiUrl = getApiUrl('manageSubscription');
      console.log('API URL:', apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
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

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (response.ok) {
          console.log('✅ Successfully saved to Admin DB via API!');
          toast.success('Period reminders enabled successfully!', {
            description: 'You\'ll get notified 10 minutes before each class'
          });
        } else {
          // Try to read the response as text first
          const contentType = response.headers.get('content-type');
          console.log('Response content-type:', contentType);
          
          let errorMessage = 'Failed to save subscription';
          
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              console.error('❌ Failed to save subscription:', errorData);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              console.error('Failed to parse error response as JSON');
            }
          } else {
            // If not JSON, read as text
            const errorText = await response.text();
            console.error('❌ Non-JSON error response:', errorText);
            
            if (errorText.includes('CORS')) {
              errorMessage = 'CORS error - backend needs to be restarted with updated configuration';
            } else if (errorText.includes('Offline')) {
              errorMessage = 'Backend server appears to be offline';
            } else {
              errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
          }
          
          toast.error(errorMessage);
        }
      } catch (fetchError) {
        console.error('❌ Network error:', fetchError);
        console.error('Failed to connect to:', apiUrl);
        
        // Provide helpful error message based on the error type
        if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          toast.error('Cannot connect to backend server', {
            description: `Make sure the backend is running on ${apiUrl}`
          });
          
          // Additional debugging info in console
          console.log('Debugging tips:');
          console.log('1. Check if backend is running on port 3001');
          console.log('2. Current frontend URL:', window.location.origin);
          console.log('3. Trying to reach backend at:', apiUrl);
          console.log('4. You may need to restart the backend after the CORS update');
        } else {
          toast.error('Network error: ' + (fetchError as Error).message);
        }
        
        throw fetchError;
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

  const clearOldSubscription = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Clear from server
      try {
        const response = await fetch(getApiUrl('manageSubscription'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            userId: user.uid
          })
        });

        // Log response details
        console.log('Clear subscription response status:', response.status);
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('Failed to clear subscription:', errorData);
          } else {
            const errorText = await response.text();
            console.error('Non-JSON error while clearing:', errorText);
          }
        }
      } catch (fetchError) {
        console.error('Network error while clearing subscription:', fetchError);
        // Continue with local cleanup even if server fails
      }

      // Clear from service worker
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
            console.log('✅ Old subscription cleared');
          }
        }
      }

      toast.success('Old subscription cleared - now re-enabling notifications...');
      
      // Now re-register with new VAPID keys
      setTimeout(() => {
        requestNotificationPermission();
      }, 1000);

    } catch (error) {
      console.error('Error clearing old subscription:', error);
      toast.error('Error clearing old subscription');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 sm:-right-50 sm:-top-60 md:right-18 md:top-60 lg:-right-120 lg:-top-45">
      <button 
        className="rounded-full p-2 hover:bg-gray-100 transition-colors"
        onClick={() => {
          if (permission === 'granted') {
            // When notifications are already granted but we click the bell icon,
            // we want to clear the old subscription and create a new one.
            // This helps fix issues where notifications stop working,
            // by removing the old subscription data and registering fresh.
            clearOldSubscription();
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
      >
        <BellIcon className={`h-6 w-6 ${permission === 'granted' ? 'text-yellow-600' : 'text-gray-600'}`} />
      </button>
    </div>
  );
};