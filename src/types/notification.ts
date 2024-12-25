export interface CommunicationStatus {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  phone: boolean;
  considered: boolean;
}

export interface UpcomingAppointment {
  id: string;
  patientId?: string;
  patientName: string;
  time: string;
  contact?: string;
}