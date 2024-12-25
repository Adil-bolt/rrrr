import { Appointment } from '../components/calendar/types';
import { Patient } from '../types/patient';
import { enrichPatientWithAppointments, assignPatientNumbers } from './patientUtils';

export function handleAppointmentStatusChange(
  appointments: Appointment[],
  patients: Patient[],
  updatedAppointment: Appointment
): Patient[] {
  // Get all non-deleted appointments
  const validAppointments = appointments.filter(apt => !apt.deleted);

  // Enrich all patients with their appointment data
  const enrichedPatients = patients.map(patient => 
    enrichPatientWithAppointments(patient, validAppointments)
  );

  // Reassign patient numbers based on current status
  const updatedPatients = assignPatientNumbers(enrichedPatients);

  return updatedPatients;
}

export function getAppointmentStatus(appointment: Appointment): 'pending' | 'validated' {
  if (appointment.status === 'Validé') {
    return 'validated';
  }
  return 'pending';
}