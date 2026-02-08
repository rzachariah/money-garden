const {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek
} = require("date-fns");

const WEEK_STARTS_ON = {
  sunday: 0,
  monday: 1
};

function getWeekStartsOn(setting) {
  return WEEK_STARTS_ON[setting] ?? WEEK_STARTS_ON.monday;
}

function getWeekStart(date, weekStartsOn) {
  return startOfWeek(date, { weekStartsOn });
}

function getWeekRangeLabel(weekStart, weekEnd) {
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `Week of ${format(weekStart, "MMM d")}-${format(weekEnd, "d")}`;
  }
  return `Week of ${format(weekStart, "MMM d")}-${format(weekEnd, "MMM d")}`;
}

function getWeeksBetween(startDate, endDate, weekStartsOn) {
  const weeks = [];
  let cursor = getWeekStart(startDate, weekStartsOn);
  const lastWeekStart = getWeekStart(endDate, weekStartsOn);
  while (cursor <= lastWeekStart) {
    weeks.push({
      start: cursor,
      end: addDays(cursor, 6)
    });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function getMonthRange(date) {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  };
}

module.exports = {
  getMonthRange,
  getWeekRangeLabel,
  getWeekStartsOn,
  getWeeksBetween
};

