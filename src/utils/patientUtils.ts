import { Patient } from '../types/patient';
import { Appointment } from '../components/calendar/types';
import { format, parseISO, startOfDay, isSameDay, isAfter, isBefore, compareAsc } from 'date-fns';
import { fr } from 'date-fns/locale';

const PENDING_STATUSES = ['-', 'Annulé', 'Reporté', 'Absent'];

export function getUniquePatients(patients: Patient[]): Patient[] {
  const patientMap = new Map();

  patients.forEach(patient => {
    const fullName = `${patient.nom.toLowerCase()} ${patient.prenom.toLowerCase()}`;
    
    if (!patientMap.has(fullName)) {
      patientMap.set(fullName, patient);
    } else {
      const existingPatient = patientMap.get(fullName);
      if (parseInt(patient.numeroPatient.slice(1)) < parseInt(existingPatient.numeroPatient.slice(1))) {
        patientMap.set(fullName, patient);
      }
    }
  });

  return Array.from(patientMap.values());
}

export function enrichPatientWithAppointments(
  patient: Patient, 
  appointments: Appointment[]
): Patient & {
  nombreConsultations: number;
  derniereConsultation?: string;
  prochainRdv?: string;
  patientStatus: 'pending' | 'validated';
} {
  const today = startOfDay(new Date());
  
  const patientAppointments = appointments.filter(apt => 
    !apt.deleted && 
    (apt.patientId === patient.id || 
    (apt.nom?.toLowerCase() === patient.nom.toLowerCase() && 
     apt.prenom?.toLowerCase() === patient.prenom.toLowerCase()))
  );

  // Check if patient has any validated appointments
  const hasValidatedAppointment = patientAppointments.some(apt => apt.status === 'Validé');
  
  // Check if all appointments have pending statuses
  const allAppointmentsPending = patientAppointments.every(apt => 
    PENDING_STATUSES.includes(apt.status || '-')
  );

  const validatedAppointments = patientAppointments.filter(apt => apt.status === 'Validé');
  
  const sortedAppointments = [...patientAppointments].sort((a, b) => {
    const dateA = parseISO(a.time);
    const dateB = parseISO(b.time);
    return compareAsc(dateA, dateB);
  });

  const lastAppointment = [...sortedAppointments]
    .reverse()
    .find(apt => {
      const aptDate = parseISO(apt.time);
      return isBefore(aptDate, today) && !isSameDay(aptDate, today);
    });

  const nextAppointment = sortedAppointments
    .find(apt => {
      const aptDate = parseISO(apt.time);
      return isAfter(aptDate, today) || isSameDay(aptDate, today);
    });

  // Determine patient status
  const patientStatus = hasValidatedAppointment ? 'validated' : 'pending';

  return {
    ...patient,
    nombreConsultations: validatedAppointments.length,
    derniereConsultation: lastAppointment ? 
      format(parseISO(lastAppointment.time), 'dd/MM/yyyy', { locale: fr }) : 
      undefined,
    prochainRdv: nextAppointment ? 
      format(parseISO(nextAppointment.time), 'dd/MM/yyyy HH:mm', { locale: fr }) : 
      undefined,
    patientStatus
  };
}

export function shouldRemovePatient(patient: Patient, appointments: Appointment[]): boolean {
  const validAppointments = appointments.filter(apt => 
    !apt.deleted && 
    (apt.patientId === patient.id || 
    (apt.nom?.toLowerCase() === patient.nom.toLowerCase() && 
     apt.prenom?.toLowerCase() === patient.prenom.toLowerCase()))
  );

  return validAppointments.length === 0;
}

export function generatePatientNumber(index: number, status: 'pending' | 'validated'): string {
  const prefix = status === 'pending' ? 'PA' : 'P';
  return `${prefix}${String(index).padStart(4, '0')}`;
}

export function assignPatientNumbers(patients: (Patient & { patientStatus: 'pending' | 'validated' })[]): Patient[] {
  // Separate patients by status
  const pendingPatients = patients.filter(p => p.patientStatus === 'pending');
  const validatedPatients = patients.filter(p => p.patientStatus === 'validated');

  // Assign numbers to each group
  const numberedPatients = [
    ...pendingPatients.map((patient, index) => ({
      ...patient,
      numeroPatient: generatePatientNumber(index + 1, 'pending')
    })),
    ...validatedPatients.map((patient, index) => ({
      ...patient,
      numeroPatient: generatePatientNumber(index + 1, 'validated')
    }))
  ];

  return numberedPatients;
}