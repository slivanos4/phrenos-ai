self.addEventListener("push", (event) => {
  let data = { title: "Market Desk", body: "", url: "/admin/market-desk" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Keep the defaults if the payload is not JSON.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/brand/phrenos_logo_green.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/market-desk";
  event.waitUntil(self.clients.openWindow(url));
});
