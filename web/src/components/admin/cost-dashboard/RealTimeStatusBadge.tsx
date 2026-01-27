// Real-time status indicator badge

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function RealTimeStatusBadge() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  const timeAgo = Math.round((Date.now() - lastUpdate.getTime()) / 60000);
  const displayTime = timeAgo < 1 ? "Just now" : `${timeAgo}m ago`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-xl rounded-lg border border-purple-500/20">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs text-gray-400">
        <Clock size={12} className="inline mr-1" />
        Updated: {displayTime}
      </span>
    </div>
  );
}
