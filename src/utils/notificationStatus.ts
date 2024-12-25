import { CommunicationStatus } from '../types/notification';

export function getConsideredColor(status: CommunicationStatus): string {
  if (!status.considered) return 'bg-red-600 text-white'; // Rouge vif
  if (status.whatsapp) return 'bg-green-100 text-green-800';
  if (status.sms) return 'bg-blue-100 text-blue-800';
  if (status.email) return 'bg-yellow-100 text-yellow-800';
  if (status.phone) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}

export function getInitialCommunicationStatus(): CommunicationStatus {
  return {
    whatsapp: false,
    sms: false,
    email: false,
    phone: false,
    considered: false
  };
}