describe('Attendance percentage calculation', () => {
  function percentage(present: number, total: number) {
    return total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
  }

  it('computes 100% when all sessions present', () => {
    expect(percentage(5, 5)).toBe(100);
  });

  it('computes 0% when total is 0', () => {
    expect(percentage(0, 0)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(percentage(2, 3)).toBe(66.7);
  });
});
