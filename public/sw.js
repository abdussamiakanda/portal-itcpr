self.addEventListener("install", (event) => {
    console.log("Service Worker Installed");
    self.skipWaiting(); // Forces activation immediately
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker Activated");
    event.waitUntil(clients.claim()); // Forces new service worker to take control
});


