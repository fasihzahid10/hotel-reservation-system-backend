export function normalizeDateRange(checkInDate: string, checkOutDate: string) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new Error('Invalid date range provided.');
  }

  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);

  if (checkOut <= checkIn) {
    throw new Error('Check-out date must be after check-in date.');
  }

  return { checkIn, checkOut };
}

export function calculateNights(checkIn: Date, checkOut: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay);
}

export function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
