"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service worker registration failed", err);
        });
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register);
      }
    }
  }, []);

  return null;
}
