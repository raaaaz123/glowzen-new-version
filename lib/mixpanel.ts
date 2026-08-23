import mixpanel from "mixpanel-browser";

/**
 * Ensures mixpanel functions are only called on the client side,
 * preventing SSR crashes.
 */
const isClient = typeof window !== "undefined";

export const mixpanelTrack = (eventName: string, properties?: Record<string, any>) => {
  if (isClient) {
    mixpanel.track(eventName, properties);
  }
};

export const mixpanelIdentify = (uid: string) => {
  if (isClient) {
    mixpanel.identify(uid);
  }
};

export const mixpanelReset = () => {
  if (isClient) {
    mixpanel.reset();
  }
};

export const mixpanelPeopleSet = (properties: Record<string, any>) => {
  if (isClient) {
    mixpanel.people.set(properties);
  }
};
