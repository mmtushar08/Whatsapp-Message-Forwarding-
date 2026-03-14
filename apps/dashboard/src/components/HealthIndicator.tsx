import { useEffect, useState } from 'react';
import { fetchHealth } from '../api/client';

export default function HealthIndicator() {
  const [online, setOnline] = useState<boolean | null>(null);

  const check = () => {
    fetchHealth()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (online === null) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white/70">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        Checking…
      </span>
    );
  }

  if (online) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-300" />
        </span>
        Online
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-sm text-white">
      <span className="h-2 w-2 rounded-full bg-red-400" />
      Offline
    </span>
  );
}
