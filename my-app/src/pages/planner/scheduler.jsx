import { useState } from "react";

export default function Scheduler() {
  const [events, setEvents] = useState([]);

  const addEvent = (start, end) => {
    setEvents(prev => [
      ...prev,
      { id: Date.now(), title: "New Event", start, end, color: "#16a34a" }
    ]);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-[60px_1fr] gap-2 h-[800px] relative border rounded-xl shadow">
        {/* Time Labels */}
        <div className="flex flex-col justify-between">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>{8 + i}:00</span>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {events.map(e => (
            <div
              key={e.id}
              className="absolute bg-green-500 text-white rounded-xl p-2 shadow"
              style={{
                top: getYFromTime(e.start),
                height: getYFromTime(e.end) - getYFromTime(e.start),
                left: 0,
                right: 0
              }}
            >
              {e.title}
            </div>
          ))}
          {/* Click handler for adding events */}
          <div
            className="absolute inset-0"
            onClick={(e) => {
              const start = getTimeFromY(e.nativeEvent.offsetY);
              addEvent(start, addMinutes(start, 30));
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Utility functions
const pxPerMinute = 2; // e.g., 120px per hour
const getYFromTime = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return ((h * 60 + m) - 480) * pxPerMinute; // assuming day starts 8:00
};
const getTimeFromY = (y) => {
  const totalMinutes = Math.round(y / pxPerMinute) + 480;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};
const addMinutes = (timeStr, minutes) => {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
};
