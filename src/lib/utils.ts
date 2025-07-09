import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to make fetch requests with ngrok headers
 * @param url - The URL to fetch from
 * @param options - Fetch options (optional)
 * @returns Promise with the fetch response
 */
export const fetchWithNgrok = async (url: string, options: RequestInit = {}) => {
  // Merge the ngrok header with any existing headers
  const headers = {
    'ngrok-skip-browser-warning': '69420',
    ...(options.headers || {}),
  };

  // Return fetch with merged options
  return fetch(url, {
    ...options,
    headers,
  });
};
