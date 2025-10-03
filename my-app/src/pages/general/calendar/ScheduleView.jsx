// components/Calendar/ScheduleView.jsx
import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useEffect,
} from "react";
import {
	getAllEventsSorted,
	getTodayKey,
	minutesToDurationString,
	parseTimeToMinutes,
	pad,
	formatDateKey,
} from "./dateUtils";
import "./ScheduleView.css";

const ScheduleView = forwardRef(({ events }, ref) => {
	// Accept events as a prop
	const listRef = useRef(null);
	const sortedEvents = getAllEventsSorted(events); // Use the passed events
	const todayKey = getTodayKey();

	useImperativeHandle(ref, () => ({
		scrollToToday: () => {
			if (!listRef.current) return;
			const firstToday = sortedEvents.find(
				(e) => formatDateKey(e.start) === todayKey
			);
			if (!firstToday) return;
			const el = listRef.current.querySelector(
				`#schedule-item-${firstToday.id}`
			);
			if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
		},
	}));

	useEffect(() => {
		// This useEffect can be simplified or removed if not needed for other purposes
		// The goToday functionality in Calendar.jsx handles scrolling now
	}, [sortedEvents, todayKey]);

	return (
		<section className="schedule" ref={listRef} aria-label="Schedule view">
			<ul className="schedule__list">
				{sortedEvents.map((e) => {
					const isToday = formatDateKey(e.start) === todayKey;
					const duration = e.end
						? Math.round(
								(e.end.getTime() - e.start.getTime()) / 60000
						  )
						: 60; // duration in minutes

					return (
						<li
							key={e.id}
							id={`schedule-item-${e.id}`}
							className={`schedule__item ${
								isToday ? "schedule__item--today" : ""
							}`}
						>
							<article>
								<h4 className="schedule__title">{e.title}</h4>
								<p className="schedule__meta">
									<time dateTime={e.start.toISOString()}>
										{e.start.toLocaleDateString()}
									</time>{" "}
									—{" "}
									<time dateTime={e.start.toISOString()}>
										{e.start.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
											hour12: false,
										})}
									</time>
									–
									{e.end && (
										<time dateTime={e.end.toISOString()}>
											{e.end.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
												hour12: false,
											})}
										</time>
									)}{" "}
									({minutesToDurationString(duration)})
								</p>
							</article>
						</li>
					);
				})}
			</ul>
		</section>
	);
});

export default ScheduleView;
