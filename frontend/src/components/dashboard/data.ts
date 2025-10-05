export const getStatusColor = (status: string) => {
  return status.toLowerCase() === 'active' ? 'text-green-600' : 'text-gray-500';
};

export const getCompletionRateColor = (rate: number | 'N/A') => {
  if (rate === 'N/A') {
    return 'text-muted-foreground';
  }

  if (rate >= 90) return 'text-green-600';
  if (rate >= 80) return 'text-orange-600';
  return 'text-red-600';
};
