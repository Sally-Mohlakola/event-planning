import React, { useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import "./PlannerFloorPlan.css";

const TEMPLATES = [
  { id: "blank", name: "Blank", color: "#ffffff" },
  { id: "banquet", name: "Banquet (rect rows)", color: "#f8fafc" },
  { id: "theatre", name: "Theatre (rows)", color: "#fbf7ff" },
  { id: "cocktail", name: "Cocktail (open)", color: "#fff8f0" },
];

const ITEM_PROTOTYPES = {
  table_small: { type: "table", w: 80, h: 80, shape: "round", color: "#eab308" },
  table_square: { type: "table", w: 80, h: 80, shape: "square", color: "#f97316" },
  table_large: { type: "table", w: 140, h: 80, shape: "rect", color: "#f97316" },
  chair: { type: "chair", w: 22, h: 22, shape: "round", color: "#60a5fa" },
  stage: { type: "stage", w: 300, h: 80, shape: "rect", color: "#6b7280" },
  light_small: { type: "light", w: 20, h: 20, shape: "round", color: "#fef08a" },
  light_medium: { type: "light", w: 30, h: 30, shape: "round", color: "#fef08a" },
  light_large: { type: "light", w: 40, h: 40, shape: "round", color: "#fef08a" },
  piano: { type: "piano", w: 120, h: 60, shape: "rect", color: "#000000" },
  dance_floor: { type: "dance_floor", w: 200, h: 200, shape: "square", color: "#d1d5db" },
  drink_bar: { type: "drink_bar", w: 150, h: 50, shape: "rect", color: "#7f1d1d" },
  cake_table: { type: "cake_table", w: 60, h: 60, shape: "square", color: "#fbcfe8" },
  head_table: { type: "head_table", w: 200, h: 60, shape: "rect", color: "#db2777" },
  walkway_carpet: { type: "walkway_carpet", w: 300, h: 40, shape: "rect", color: "#b91c1c" },
  catering_stand: { type: "catering_stand", w: 100, h: 50, shape: "rect", color: "#15803d" },
  exit_door: { type: "exit_door", w: 60, h: 30, shape: "rect", color: "#dc2626" },
};

let nextId = 1;

const PlannerFloorPlan = ({ eventId: initialEventId, setActivePage }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0].id);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const containerRef = useRef(null);

  const dragRef = useRef({
    dragging: false,
    id: null,
    offsetX: 0,
    offsetY: 0,
    pointerId: null,
    startX: 0,
    startY: 0,
  });

  // Fetch planner's events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          console.warn("No authenticated user, skipping event fetch");
          setEvents([]);
          return;
        }
        const token = await user.getIdToken(true);
        console.log("Fetching events from https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events");
        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`Fetch events failed with status ${res.status}: ${text.slice(0, 100)}...`);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Events fetched:", data);
        setEvents(data.events || []);
        if (!selectedEventId && data.events?.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      } catch (err) {
        console.error("Fetch events error:", err.message);
        setEvents([]);
        alert("Failed to fetch events. Please try again.");
      }
    };
    fetchEvents();
  }, []);

  // Fetch vendors when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) {
      setVendors([]);
      setSelectedVendor("");
      return;
    }
    const fetchVendors = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = user ? await user.getIdToken(true) : "";
        console.log(`Fetching vendors for event ${selectedEventId}`);
        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${selectedEventId}/vendors`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`Fetch vendors failed with status ${res.status}: ${text.slice(0, 100)}...`);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Vendors fetched:", data);
        if (data.message === "No vendors found for this event") {
          setVendors([]);
        } else {
          setVendors(data.vendors || []);
        }
      } catch (err) {
        console.error("Fetch vendors error:", err.message);
        setVendors([]);
        alert("Failed to fetch vendors. Please try again.");
      }
    };
    fetchVendors();
  }, [selectedEventId]);

  const addItem = (key) => {
    const proto = ITEM_PROTOTYPES[key];
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newItem = {
      id: `it-${nextId++}`,
      ...proto,
      x: rect.width / 2,
      y: rect.height / 2,
      rotation: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    setIsDirty(true);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
    setIsDirty(true);
  };

  const onPointerDownItem = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    container.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const it = items.find((i) => i.id === id);
    if (!it) return;

    setSelectedId(id);
    dragRef.current = {
      dragging: false,
      id,
      offsetX: mouseX - it.x,
      offsetY: mouseY - it.y,
      pointerId: e.pointerId,
      startX: mouseX,
      startY: mouseY,
    };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.id || dragRef.current.pointerId !== e.pointerId) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const threshold = 5;
    if (
      !dragRef.current.dragging &&
      (Math.abs(mouseX - dragRef.current.startX) > threshold ||
        Math.abs(mouseY - dragRef.current.startY) > threshold)
    ) {
      dragRef.current.dragging = true;
    }

    if (!dragRef.current.dragging) return;

    const { id, offsetX, offsetY } = dragRef.current;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              x: Math.max(
                calculateBoundingHalf(it.w, it.h, it.rotation || 0, "w"),
                Math.min(
                  rect.width - calculateBoundingHalf(it.w, it.h, it.rotation || 0, "w"),
                  mouseX - offsetX
                )
              ),
              y: Math.max(
                calculateBoundingHalf(it.w, it.h, it.rotation || 0, "h"),
                Math.min(
                  rect.height - calculateBoundingHalf(it.w, it.h, it.rotation || 0, "h"),
                  mouseY - offsetY
                )
              ),
            }
          : it
      )
    );
    setIsDirty(true);
  };

  const calculateBoundingHalf = (w, h, rotation, dim) => {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const bb_w = w * cos + h * sin;
    const bb_h = w * sin + h * cos;
    return dim === "w" ? bb_w / 2 : bb_h / 2;
  };

  const onPointerUp = (e) => {
    if (dragRef.current.id && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = {
        dragging: false,
        id: null,
        offsetX: 0,
        offsetY: 0,
        pointerId: null,
        startX: 0,
        startY: 0,
      };
    }
  };

  const scaleSelected = (factor) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== selectedId) return it;
        const newW = Math.max(8, it.w * factor);
        const newH = Math.max(8, it.h * factor);
        const rect = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 1000 };
        const newX = Math.max(
          calculateBoundingHalf(newW, newH, it.rotation || 0, "w"),
          Math.min(rect.width - calculateBoundingHalf(newW, newH, it.rotation || 0, "w"), it.x)
        );
        const newY = Math.max(
          calculateBoundingHalf(newW, newH, it.rotation || 0, "h"),
          Math.min(rect.height - calculateBoundingHalf(newW, newH, it.rotation || 0, "h"), it.y)
        );
        return { ...it, w: newW, h: newH, x: newX, y: newY };
      })
    );
    setIsDirty(true);
  };

  const rotateSelected = (delta) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== selectedId) return it;
        const newRotation = ((it.rotation || 0) + delta + 360) % 360;
        const rect = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 1000 };
        const newX = Math.max(
          calculateBoundingHalf(it.w, it.h, newRotation, "w"),
          Math.min(rect.width - calculateBoundingHalf(it.w, it.h, newRotation, "w"), it.x)
        );
        const newY = Math.max(
          calculateBoundingHalf(it.w, it.h, newRotation, "h"),
          Math.min(rect.height - calculateBoundingHalf(it.w, it.h, newRotation, "h"), it.y)
        );
        return { ...it, rotation: newRotation, x: newX, y: newY };
      })
    );
    setIsDirty(true);
  };

  const createFloorplanBlob = () => {
    const container = containerRef.current;
    if (!container) {
      throw new Error("Canvas container not found");
    }

    const rect = container.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    const ctx = canvas.getContext("2d");

    // Draw background
    const tpl = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];
    ctx.fillStyle = tpl.color || "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e6e6e6";
    ctx.lineWidth = 1;
    const gridStep = 25 * scale;
    for (let x = 0; x < canvas.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw items
    items.forEach((it) => {
      const x = Math.round(it.x * scale);
      const y = Math.round(it.y * scale);
      const w = Math.round(it.w * scale);
      const h = Math.round(it.h * scale);
      const rotation = (it.rotation || 0) * (Math.PI / 180);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = it.color || "#999";

      if (it.shape === "round") {
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      if (it.type !== "chair" && it.type !== "light") {
        ctx.fillStyle = ["piano", "stage", "drink_bar", "walkway_carpet", "catering_stand", "exit_door", "head_table"].includes(it.type)
          ? "#fff"
          : "#000";
        const fontSize = (Math.min(it.w, it.h) < 50 ? 10 : 12) * scale;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), 0, 0);
      }
      ctx.restore();
    });

    // Convert to base64
    return new Promise((resolve) => {
      const dataUrl = canvas.toDataURL("image/png", 0.9);
      const base64Data = dataUrl.split(",")[1]; // Remove "data:image/png;base64," prefix
      resolve({ base64Data, mimeType: "image/png", fileName: `floorplan-${selectedEventId || "event"}.png` });
    });
  };

  const uploadToVendor = async () => {
    if (!selectedEventId) {
      alert("Please choose an event first.");
      return;
    }
    if (!selectedVendor) {
      alert("Please choose a vendor to upload to.");
      return;
    }

    try {
      const { base64Data, mimeType, fileName } = await createFloorplanBlob();

      const auth = getAuth();
      const user = auth.currentUser;
console.log("Current user:", user);
if (!user) {
  console.error("No authenticated user");
  alert("Please log in to upload the floorplan.");
  return;
}
      if (!user) {
        console.error("No authenticated user");
        alert("Please log in to upload the floorplan.");
        return;
      }

      const token = await user.getIdToken(true);
      console.log("Uploading floorplan:", {
        eventId: selectedEventId,
        vendorId: selectedVendor,
        url: `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${selectedEventId}/vendors/${selectedVendor}/floorplan-base64`,
        token: token.substring(0, 10) + "...",
        base64Length: base64Data.length,
        mimeType,
        fileName,
      });

      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${selectedEventId}/vendors/${selectedVendor}/floorplan-base64`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageData: base64Data,
            fileName,
            mimeType,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`Upload failed with status ${res.status}: ${text}`);
        throw new Error(`Upload failed: ${text}`);
      }

      const data = await res.json();
      console.log("Upload response:", data);
      alert(data.message || "Floorplan uploaded successfully");
      setIsDirty(false);
    } catch (err) {
      console.error("Upload error:", err.message);
      alert("Upload failed: " + err.message);
      console.log(selectedVendor);
    }
  };

  const exportToPNG = async () => {
    try {
      const { base64Data, fileName } = await createFloorplanBlob();
      const dataUrl = `data:image/png;base64,${base64Data}`;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Export to PNG failed:", error);
      alert("Failed to export floorplan: " + error.message);
    }
  };

  const saveLocal = () => {
    if (!selectedEventId) {
      alert("Please select an event to save the draft.");
      return;
    }
    localStorage.setItem(`floorplan-${selectedEventId}`, JSON.stringify({ template, items }));
    setIsDirty(false);
    alert("Draft saved locally");
  };

  const loadLocal = () => {
    if (!selectedEventId) {
      alert("Please select an event to load the draft.");
      return;
    }
    const raw = localStorage.getItem(`floorplan-${selectedEventId}`);
    if (!raw) return alert("No saved draft found");
    try {
      const obj = JSON.parse(raw);
      if (obj.template) setTemplate(obj.template);
      if (Array.isArray(obj.items)) {
        setItems(obj.items.map((it) => ({ ...it, rotation: it.rotation ?? 0 })));
      }
      alert("Draft loaded");
    } catch (e) {
      console.error("Load draft failed:", e);
      alert("Failed to load draft");
    }
  };

  return (
    <main className="floorplan-page">
      <header className="floorplan-header">
        <button className="back-button" onClick={() => setActivePage("event-details")}>
          ← Back
        </button>
        <h2>Floorplan Designer</h2>
      </header>

      <div className="floorplan-content">
        <aside className="floorplan-sidebar">
          <h3>Choose Event</h3>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="event-select"
          >
            <option value="">Select an event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name || event.id}
              </option>
            ))}
          </select>

          <h3>Choose Vendor</h3>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="vendor-select"
            disabled={!selectedEventId}
          >
            <option value="">Select a vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName || v.id}
              </option>
            ))}
          </select>

          <h3>Template</h3>
          <select value={template} onChange={(e) => setTemplate(e.target.value)}>
            {TEMPLATES.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <h3>Add Items</h3>
          <div className="tool-buttons">
            <button onClick={() => addItem("table_small")}>Add Small Round Table</button>
            <button onClick={() => addItem("table_square")}>Add Square Table</button>
            <button onClick={() => addItem("table_large")}>Add Rectangle Table</button>
            <button onClick={() => addItem("chair")}>Add Chair</button>
            <button onClick={() => addItem("stage")}>Add Stage</button>
            <button onClick={() => addItem("light_small")}>Add Small Light Fixture</button>
            <button onClick={() => addItem("light_medium")}>Add Medium Light Fixture</button>
            <button onClick={() => addItem("light_large")}>Add Large Light Fixture</button>
            <button onClick={() => addItem("piano")}>Add Piano</button>
            <button onClick={() => addItem("dance_floor")}>Add Dance Floor</button>
            <button onClick={() => addItem("drink_bar")}>Add Drink Bar</button>
            <button onClick={() => addItem("cake_table")}>Add Cake Table</button>
            <button onClick={() => addItem("head_table")}>Add Head Table</button>
            <button onClick={() => addItem("walkway_carpet")}>Add Walkway Carpet</button>
            <button onClick={() => addItem("catering_stand")}>Add Catering Stand</button>
            <button onClick={() => addItem("exit_door")}>Add Exit Door</button>
          </div>

          <h3>Selected</h3>
          <div className="selected-controls">
            <div className="id-selection">
              <label htmlFor="selected-id">Selected ID:</label>
              <select
                id="selected-id"
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                <option value="">—</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.id} ({it.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())})
                  </option>
                ))}
              </select>
            </div>
            {selectedId && (
              <div className="control-buttons">
                <div className="scale-controls">
                  <button onClick={() => scaleSelected(0.9)} disabled={!selectedId}>
                    Scale Down
                  </button>
                  <button onClick={() => scaleSelected(1.1)} disabled={!selectedId}>
                    Scale Up
                  </button>
                </div>
                <div className="rotate-controls">
                  <button onClick={() => rotateSelected(-15)} disabled={!selectedId}>
                    Rotate -15°
                  </button>
                  <button onClick={() => rotateSelected(15)} disabled={!selectedId}>
                    Rotate +15°
                  </button>
                </div>
                <button className="danger" onClick={removeSelected} disabled={!selectedId}>
                  Remove
                </button>
              </div>
            )}
          </div>

          <h3>Save / Upload</h3>
          <div className="save-controls">
            <button onClick={exportToPNG} disabled={!selectedEventId}>
              Download PNG
            </button>
            <button onClick={uploadToVendor} disabled={!selectedEventId || !selectedVendor}>
              Send to Selected Vendor
            </button>
            <button onClick={saveLocal} disabled={!selectedEventId}>
              Save Draft
            </button>
            <button onClick={loadLocal} disabled={!selectedEventId}>
              Load Draft
            </button>
          </div>

          <p className="hint">Tip: Click an item to select, drag to move, use scale/rotate buttons, or remove.</p>
        </aside>

        <section className="floorplan-canvas-wrap">
          <div
            className="floorplan-canvas"
            ref={containerRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ background: TEMPLATES.find((t) => t.id === template)?.color || "#fff" }}
          >
            {items.map((it) => (
              <div
                key={it.id}
                className={`fp-item ${selectedId === it.id ? "selected" : ""} ${it.type} ${
                  it.shape === "round" ? "round" : ""
                }`}
                style={{
                  left: `${it.x}px`,
                  top: `${it.y}px`,
                  width: `${it.w}px`,
                  height: `${it.h}px`,
                  background: it.color,
                  transform: `translate(-50%, -50%) rotate(${it.rotation || 0}deg)`,
                  transformOrigin: "center center",
                }}
                onPointerDown={(e) => onPointerDownItem(e, it.id)}
              >
                <div className="fp-label">{it.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PlannerFloorPlan;