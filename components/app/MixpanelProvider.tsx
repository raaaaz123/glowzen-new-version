"use client";

import mixpanel from "mixpanel-browser";
import { useEffect } from "react";

const MIXPANEL_TOKEN = "1f32df326b5e6c0a95a11b621db7f0a2";

export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize mixpanel
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV !== "production",
      track_pageview: true,
      persistence: "localStorage",
      record_sessions_percent: 100,
    });
  }, []);

  return <>{children}</>;
}
