import React, { useState } from 'react';
import './NewEvent.css';

export default function NewEvent({ setActivePage }) {
  const [inputs, setInputs] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(values => ({ ...values, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", inputs);
    // TODO: handle save event logic here
  };

  return (
    <section className="page-container">

      {/* Header Section */}
      <section className="dashboard-intro">
        <section>
          <h1 className="dashboard-title">New Event</h1>
          <p className="dashboard-subtitle">Input your event's details</p>
        </section>
      </section>


      <form className="main-content" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="eventName">Event Name</label>
          <input id="eventName" type="text" name="eventName" value={inputs.eventName || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="eventDescription">Event Description</label>
          <textarea id="eventDescription" name="eventDescription" value={inputs.eventDescription || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="eventTheme">Event Theme</label>
          <input id="eventTheme" type="text" name="eventTheme" value={inputs.eventTheme || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="eventLocation">Event Location</label>
          <input id="eventLocation" type="text" name="eventLocation" value={inputs.eventLocation || ""} onChange={handleChange} />
        </div>

        <div className="date-time">
          <label htmlFor="eventBudget">Event Budget</label>
          <input id="eventBudget" type="number" name="eventBudget" value={inputs.eventBudget || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="eventNotes">Event Notes</label>
          <textarea id="eventNotes" name="eventNotes" value={inputs.eventNotes || ""} onChange={handleChange} />
        </div>

        <div className="date-time">
          <label htmlFor="startTime">Start Date & Time</label>
          <input id="startTime" type="datetime-local" name="startTime" value={inputs.startTime || ""} onChange={handleChange} />
        </div>

        <div className="date-time">
          <label htmlFor="endTime">End Date & Time</label>
          <input id="endTime" type="datetime-local" name="endTime" value={inputs.endTime || ""} onChange={handleChange} />
        </div>

        <button type="submit" className="page-button">Save Event</button>
      </form>
    </section>
  );
}
