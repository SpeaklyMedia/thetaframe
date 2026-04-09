export const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

export const getMondayOfCurrentWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
};
