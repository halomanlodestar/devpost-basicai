// On the way: service worker. Installable app + "Notify me" pushes.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// { title, body, url, tag } from the API (apps/api/src/alerts/scheduler.ts)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title ?? "On the way", {
      body: data.body,
      tag: data.tag,
      renotify: true,
      icon: "/pwa-icon/192",
      badge: "/icon",
      data: { url: data.url ?? "/" },
    }),
  );
});

// Tap → the journey screen it was set from, reusing an open window if there is one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));

      if (open) return open.navigate(url).then((w) => (w ?? open).focus());

      return self.clients.openWindow(url);
    }),
  );
});
