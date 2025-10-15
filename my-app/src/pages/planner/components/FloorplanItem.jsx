// src/components/FloorplanItem.jsx
import React from "react";
import PropTypes from "prop-types";

const FloorplanItem = ({ item, selectedId, onPointerDown }) => {
  const isSelected = selectedId === item.id;

  return (
    <div
      className={`fp-item ${isSelected ? "selected" : ""} ${item.type} ${
        item.shape === "round" ? "round" : ""
      }`}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.w}px`,
        height: `${item.h}px`,
        background: item.color,
        transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
        transformOrigin: "center center",
      }}
      onPointerDown={(e) => onPointerDown(e, item.id)}
    >
      <div className="fp-label">
        {item.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </div>
    </div>
  );
};

FloorplanItem.propTypes = {
  item: PropTypes.object.isRequired,
  selectedId: PropTypes.string,
  onPointerDown: PropTypes.func.isRequired,
};

export default FloorplanItem;
