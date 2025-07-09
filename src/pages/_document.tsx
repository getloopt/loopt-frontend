import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
                          __html: `
                // Only register service worker in production (not localhost)
                if('serviceWorker' in navigator && !window.location.hostname.includes('localhost')){
                  console.log('Service Worker is supported');
                  window.addEventListener('load', () => {
                    // Check if service worker is already registered
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      if (registrations.length > 0) {
                        console.log('Service Worker already registered');
                        return;
                      }
                      
                      console.log('Registering Service Worker...');
                      navigator.serviceWorker.register('/custom-sw.js')
                        .then(registration => {
                          console.log('Service Worker registration successful:', registration);
                        })
                        .catch(error => {
                          console.error('Service Worker registration failed:', error);
                        });
                    });
                  })
                } else if ('serviceWorker' in navigator) {
                  console.log('Service Worker disabled in development mode');
                  // Unregister any existing service workers in development
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => {
                      registration.unregister();
                      console.log('Unregistered service worker');
                    });
                  });
                } else {
                  console.log('Service Worker is not supported in this browser');
                }
              `
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
