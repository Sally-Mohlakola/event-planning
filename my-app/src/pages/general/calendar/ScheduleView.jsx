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
} from "./dateUtils";
import "./ScheduleView.css";

const ScheduleView = forwardRef(({ selectedDate }, ref) => {
	const listRef = useRef(null);
	const events = getAllEventsSorted();
	const todayKey = getTodayKey();

	useImperativeHandle(ref, () => ({
		scrollToToday: () => {
			if (!listRef.current) return;
			const firstToday = events.find((e) => e.date === todayKey);
			if (!firstToday) return;
			const el = listRef.current.querySelector(
				`#schedule-item-${firstToday.id}`
			);
			if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
		},
	}));

	useEffect(() => {
		if (
			selectedDate &&
			`${selectedDate.getFullYear()}-${pad(
				selectedDate.getMonth() + 1
			)}-${pad(selectedDate.getDate())}` === todayKey
		) {
			const firstToday = events.find((e) => e.date === todayKey);
			if (firstToday) {
				const el = listRef.current?.querySelector(
					`#schedule-item-${firstToday.id}`
				);
				if (el)
					el.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}
	}, [selectedDate, events, todayKey]);

	return (
		<section className="schedule" ref={listRef} aria-label="Schedule view">
			<ul className="schedule__list">
				{events.map((e) => {
					const isToday = e.date === todayKey;
					const duration =
						parseTimeToMinutes(e.end) - parseTimeToMinutes(e.start);
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
									<time dateTime={`${e.date}T${e.start}`}>
										{e.date}
									</time>{" "}
									—{" "}
									<time dateTime={`${e.date}T${e.start}`}>
										{e.start}
									</time>
									–
									<time dateTime={`${e.date}T${e.end}`}>
										{e.end}
									</time>{" "}
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
