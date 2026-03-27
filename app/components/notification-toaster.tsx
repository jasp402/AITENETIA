'use client';

import 'sileo/styles.css';
import { Toaster } from 'sileo';

export function NotificationToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      offset={{ top: 20, right: 20 }}
      options={{
        roundness: 18,
        autopilot: { expand: 4200, collapse: 2200 },
      }}
    />
  );
}
