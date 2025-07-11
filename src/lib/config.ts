// API Configuration for different environments
const getApiBaseUrl = () => {
  // In production, use the environment variable
  // if (process.env.NEXT_PUBLIC_API_URL) {
  //   console.log('Using production API URL:', process.env.NEXT_PUBLIC_API_URL);
  //   return process.env.NEXT_PUBLIC_API_URL;
  // }
  
  // In development, use local API routes (default Next.js behavior)
  return 'https://meetings-flux-races-jerusalem.trycloudflare.com';
};

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  
  endpoints: {
    sendNotification: '/api/send-notification',
    mistralBackend: '/api/mistralbackend',
    uploadUrl: '/api/upload-url',
    scheduleNotifications: '/api/schedule-notifications',
    manageSubscription: '/api/manage-subscription'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}`;
};

// Helper function to check if we're using external API
export const isExternalAPI = (): boolean => {
  return !!process.env.NEXT_PUBLIC_API_URL;
}; 