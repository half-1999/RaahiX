export function isFrontSeat(seat) {
  const number = String(seat?.seatNumber || seat || '').toUpperCase();
  const position = String(seat?.position || '').toUpperCase();
  return number.startsWith('A') || position === 'FRONT';
}

export function fareForSeat(ride, seat) {
  const configured = ride?.frontSeatPrice;
  if (isFrontSeat(seat) && configured !== null && configured !== undefined && configured !== '') {
    const amount = Number(configured);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return Number(ride.pricePerSeat);
}

export function quoteSeats(ride, seatNumbers) {
  const lines = seatNumbers.map((seatNumber) => {
    const found = (ride.seats || []).find((seat) => seat.seatNumber === seatNumber);
    const seat = found || { seatNumber };
    return { seatNumber: seat.seatNumber, amount: fareForSeat(ride, seat) };
  });
  const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, totalAmount, amountPerSeat: Number(ride.pricePerSeat) };
}
