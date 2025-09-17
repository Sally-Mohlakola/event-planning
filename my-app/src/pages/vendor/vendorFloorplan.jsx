import React, { useState } from "react";
import "./VendorFloorplan.css";

const dummyClients = [
  {
    id: 1,
    name: "Alice Johnson",
    date: "2025-09-01",
    history: {
      pending: [
        { id: 101, date: "2025-09-10", link: "#", name: "Contract A" },
        { id: 102, date: "2025-09-12", link: "#", name: "Contract B" },
      ],
      completed: [
        { id: 201, date: "2025-08-15", link: "#", name: "Contract X" },
        { id: 202, date: "2025-08-20", link: "#", name: "Contract Y" },
      ],
    },
  },
  {
    id: 2,
    name: "Bob Smith",
    date: "2025-08-25",
    history: {
      pending: [],
      completed: [{ id: 301, date: "2025-08-05", link: "#", name: "Contract Z" }],
    },
  },
];

const VendorFloorplan = () => {
  const [clients] = useState(dummyClients);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("asc");
  const [selectedClient, setSelectedClient] = useState(null);
  const [pendingOrder, setPendingOrder] = useState("desc");
  const [completedOrder, setCompletedOrder] = useState("desc");

  const filteredClients = clients
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (order === "asc") return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });

  const sortHistory = (historyArray, sortOrder) => {
    return [...historyArray].sort((a, b) => {
      if (sortOrder === "asc") return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });
  };

  return (
    <div className="floorplan-page">
      <header>
        <h1>Vendor Floorplan</h1>
        <p>Manage tiles received from your clients</p>
      </header>

      <div className="controls">
        <input
          type="text"
          placeholder="Search client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="sort-dropdown"
        >
          <option value="asc">Date Ascending</option>
          <option value="desc">Date Descending</option>
        </select>
      </div>

      <div className="tiles-grid">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="client-tile"
              onClick={() => setSelectedClient(client)}
            >
              <h3>{client.name}</h3>
              <p>Date: {new Date(client.date).toLocaleDateString()}</p>
            </div>
          ))
        ) : (
          <p className="no-results">No clients found</p>
        )}
      </div>

      {/* Modal */}
      {selectedClient && (
        <div
          className="modal-overlay active"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedClient.name} - Document History</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedClient(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Pending Section */}
              <section className="history-section">
                <div className="history-header">
                  <h3>Pending</h3>
                  <select
                    value={pendingOrder}
                    onChange={(e) => setPendingOrder(e.target.value)}
                  >
                    <option value="asc">Oldest first</option>
                    <option value="desc">Newest first</option>
                  </select>
                </div>
                {selectedClient.history.pending.length > 0 ? (
                  <ul>
                    {sortHistory(selectedClient.history.pending, pendingOrder).map(
                      (item) => (
                        <li key={item.id}>
                          <span>{item.name} - </span>
                          <span>Last updated: {new Date(item.date).toLocaleDateString()}</span>{" "}
                          - <a href={item.link}>View</a>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>No pending documents</p>
                )}
              </section>

              {/* Completed Section */}
              <section className="history-section">
                <div className="history-header">
                  <h3>Completed</h3>
                  <select
                    value={completedOrder}
                    onChange={(e) => setCompletedOrder(e.target.value)}
                  >
                    <option value="asc">Oldest first</option>
                    <option value="desc">Newest first</option>
                  </select>
                </div>
                {selectedClient.history.completed.length > 0 ? (
                  <ul>
                    {sortHistory(selectedClient.history.completed, completedOrder).map(
                      (item) => (
                        <li key={item.id}>
                          <span>{item.name} - </span>
                          <span>Last updated: {new Date(item.date).toLocaleDateString()}</span>{" "}
                          - <a href={item.link}>View</a>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>No completed documents</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorFloorplan;
