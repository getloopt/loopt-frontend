// API Configuration for different environments
const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_URL;  

  console.log('Using API URL:', url);
  return url;
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
