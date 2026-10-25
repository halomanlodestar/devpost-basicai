// On the way: service worker. Makes the app installable; push for
// "remind me when to leave" lands here in slice 6.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
