import React, { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import "./AdminReports.css";
import { auth } from "../../../firebase"; // Adjust path as needed

const AdminReports = () => {
  const [monthlyFinancials, setMonthlyFinancials] = useState([]);
  const [newEventsData, setNewEventsData] = useState([]);
  const [guestRsvpData, setGuestRsvpData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();

        // Fetch events for financials and new events trend
        const eventsRes = await fetch("https://us-central1-planit-sdp.cloudfunctions.net/api/admin/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!eventsRes.ok) throw new Error(`Failed to fetch events: ${eventsRes.status}`);
        const eventsData = await eventsRes.json();
        const events = eventsData.events || [];

        // Determine date range dynamically
        const today = new Date();
        const eventDates = events.map(event => new Date(event.date)).filter(date => !isNaN(date.getTime()));
        const minDate = eventDates.length ? Math.min(today, ...eventDates) : today;
        const maxDate = eventDates.length ? Math.max(...eventDates) : new Date(today.getFullYear(), today.getMonth() + 6, 1); // 6 months forward
        const months = [];
        for (let d = new Date(minDate); d <= maxDate; d.setMonth(d.getMonth() + 1)) {
          months.push(d.toLocaleString('default', { month: 'long' }));
        }

        // Process monthly financials (budget vs. spending)
        const financialsMap = {};
        months.forEach(month => {
          financialsMap[month] = { month, budget: 0, spending: 0 };
        });
        events.forEach(event => {
          const eventDate = new Date(event.date);
          const month = eventDate.toLocaleString('default', { month: 'long' });
          if (months.includes(month)) {
            const budgetValue = parseFloat(event.budget || 0);
            financialsMap[month].budget += budgetValue;
            financialsMap[month].spending += budgetValue * 0.9; // 90% spending placeholder
          }
        });
        setMonthlyFinancials(Object.values(financialsMap));

        // Process new events trend (count events per month)
        const eventsByMonth = {};
        months.forEach(month => {
          eventsByMonth[month] = 0;
        });
        events.forEach(event => {
          const eventDate = new Date(event.date);
          const month = eventDate.toLocaleString('default', { month: 'long' });
          if (months.includes(month)) {
            eventsByMonth[month] += 1; // Increment count for each event
          }
        });
        setNewEventsData(months.map(month => ({ month, newEvents: eventsByMonth[month] })));

        // Process guest RSVP data (simulate based on expectedGuestCount)
        const rsvpMap = { Attending: 0, Pending: 0, "Not Attending": 0, Maybe: 0 };
        events.forEach(event => {
          const totalGuests = Number(event.expectedGuestCount) || 0;
          rsvpMap["Attending"] += Math.floor(totalGuests * 0.5); // 50% attending
          rsvpMap["Pending"] += Math.floor(totalGuests * 0.3);   // 30% pending
          rsvpMap["Not Attending"] += Math.floor(totalGuests * 0.15); // 15% not attending
          rsvpMap["Maybe"] += Math.floor(totalGuests * 0.05);    // 5% maybe
          console.log(totalGuests);
        });
        setGuestRsvpData(Object.keys(rsvpMap).map(status => ({ name: status, value: rsvpMap[status] })));

      } catch (err) {
        console.error("Error fetching report data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ["#2e7d32", "#ff6d00", "#d50000", "#2962ff"];

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading reports...</p></div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="main-container">
      <div className="charts">
        {/* Chart 1: Monthly Financial Overview */}
        <div className="chart-container">
          <h4>Monthly Financials (Budget vs. Spending)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyFinancials} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#8884d8" name="Budgeted Amount" />
              <Bar dataKey="spending" fill="#82ca9d" name="Actual Spending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: New Event Creation Trend */}
        <div className="chart-container">
          <h4>New Event Creation Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={newEventsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 'auto']} type="number" tickFormatter={value => Math.round(value)} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="newEvents" stroke="#ff6d00" strokeWidth={2} name="New Events Created" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Guest RSVP Status Breakdown */}
        <div className="chart-container">
          <h4>Guest RSVP Status (All Events)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={guestRsvpData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {guestRsvpData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Placeholder for another chart */}
        <div className="chart-container">
          <h4>Upcoming Feature</h4>
          <div className="placeholder-chart">
            <p>More reports coming soon...</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminReports;