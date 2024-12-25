import { isSameMonth, isSameDay } from 'date-fns';

export function useDayCellStyles(day: Date, currentDate: Date) {
  const baseClasses = "min-h-[120px] p-2 border cursor-pointer hover:bg-gray-50 transition-colors";
  
  const monthClasses = isSameMonth(day, currentDate)
    ? 'bg-white'
    : 'bg-gray-50';
    
  const todayClasses = isSameDay(day, new Date())
    ? 'border-indigo-500 bg-indigo-50'
    : 'border-gray-200';

  const containerClassName = `${baseClasses} ${monthClasses} ${todayClasses}`;

  return { containerClassName };
}