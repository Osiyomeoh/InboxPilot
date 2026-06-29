export function checkCalendar(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  if (start < today) {
    return { available: false, reason: 'Start date is in the past' };
  }

  const dayOfWeek = start.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return {
    available: !isWeekend,
    startDate,
    endDate,
    slots: isWeekend
      ? []
      : [
          { date: startDate, time: '09:00', available: true },
          { date: startDate, time: '14:00', available: true },
        ],
    reason: isWeekend ? 'No availability on weekends' : null,
    earliestAvailable: isWeekend
      ? new Date(start.setDate(start.getDate() + (8 - dayOfWeek))).toISOString().split('T')[0]
      : startDate,
  };
}
