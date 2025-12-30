
export const isValidPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

export const isValidName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 15;
};
