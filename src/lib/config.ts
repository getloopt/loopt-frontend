// API Configuration for different environments
const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_URL || 'http://localhost:3001';  


  return url
};

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  
  endpoints: {
    sendNotification: '/api/send-notification',
    mistralBackend: '/api/mistralbackend',
    uploadUrl: '/api/upload-url',
    manageSubscription: '/api/manage-subscription',
    customPushNotify: '/api/custom-push-notify'

  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}`;
};
