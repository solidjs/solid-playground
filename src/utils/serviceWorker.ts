import { register } from "register-service-worker";
import { eventBus } from "./eventBus";

export function registerServiceWorker() {
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    window.addEventListener("load", () => {
      register("/sw.js", {
        ready(registration) {
          console.log("Service worker is active.", { registration });
        },
        registered(registration) {
          console.log("✔ Application is now available offline", {
            registration,
          });
        },
        cached(registration) {
          console.log("Content has been cached for offline use.", {
            registration,
          });
        },
        updatefound(registration) {
          console.log("New content is downloading.", { registration });
        },
        updated(registration) {
          eventBus.emit("sw-update", registration);
          console.log("New content is available; please refresh.", {
            registration,
          });
        },
        offline() {
          console.log(
            "No internet connection found. App is running in offline mode."
          );
        },
        error(error) {
          console.error(
            "❌ Application couldn't be registered offline:",
            error
          );
        },
      });
    });
  }
}
