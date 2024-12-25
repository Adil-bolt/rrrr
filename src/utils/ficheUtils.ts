import { parseISO, isSameDay, isBefore } from 'date-fns';
import { Patient } from '../types/patient';
import { Appointment } from '../components/calendar/types';

export function getPreviousFicheNumbers(
  appointments: Appointment[],
  patients: Patient[],
  patientId: string | undefined, 
  currentVisitTime: string,
  currentPatient: { nom: string; prenom: string } | null
): string[] {
  if (!currentVisitTime) return [];
  
  const currentVisitDate = parseISO(currentVisitTime);
  
  // Récupérer tous les numéros de fiche précédents
  const previousFiches = appointments
    .filter(apt => {
      // Vérifier si c'est le même patient
      const isSamePatientById = apt.patientId === patientId;
      
      const aptPatient = patients.find(p => p.id === apt.patientId);
      const isSamePatientByName = currentPatient && (
        (aptPatient && 
          aptPatient.nom.toLowerCase() === currentPatient.nom.toLowerCase() &&
          aptPatient.prenom.toLowerCase() === currentPatient.prenom.toLowerCase()) ||
        (apt.nom && apt.prenom &&
          apt.nom.toLowerCase() === currentPatient.nom.toLowerCase() &&
          apt.prenom.toLowerCase() === currentPatient.prenom.toLowerCase())
      );

      const aptDate = parseISO(apt.time);
      
      return (isSamePatientById || isSamePatientByName) && 
             apt.ficheNumber && 
             apt.status === 'Validé' &&
             isBefore(aptDate, currentVisitDate);
    })
    .map(apt => apt.ficheNumber!)
    .filter((value, index, self) => self.indexOf(value) === index);

  // Grouper les numéros par préfixe FXX
  const groupedFiches = previousFiches.reduce((acc, fiche) => {
    const match = fiche.match(/F(\d+)-(\d+)/);
    if (!match) return acc;

    const [, prefix] = match;
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(fiche);
    return acc;
  }, {} as Record<string, string[]>);

  // Formater la sortie
  return Object.entries(groupedFiches).map(([prefix, fiches]) => {
    if (fiches.length === 1) {
      return fiches[0];
    }

    // Extraire et trier les suffixes numériques
    const suffixes = fiches
      .map(f => {
        const match = f.match(/F\d+-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .sort((a, b) => b - a)
      .map(n => n.toString().padStart(3, '0'));

    return `F${prefix}-${suffixes.join('+')}`;
  }).sort((a, b) => {
    const aPrefix = parseInt(a.match(/F(\d+)/)?.[1] || '0');
    const bPrefix = parseInt(b.match(/F(\d+)/)?.[1] || '0');
    return bPrefix - aPrefix;
  });
}

export function generateFicheNumber(prefix: string, sequence: number): string {
  return `F${prefix}-${sequence.toString().padStart(3, '0')}`;
}

export function validateFicheNumber(number: string): boolean {
  return /^F\d{4}-\d{3}$/.test(number);
}

export function formatFicheNumber(number: string): string {
  if (!number) return '';
  if (validateFicheNumber(number)) return number;
  
  const cleaned = number.replace(/[^0-9-]/g, '');
  const parts = cleaned.split('-');
  
  if (parts.length === 2) {
    const [prefix, sequence] = parts;
    if (prefix.length === 4 && sequence.length <= 3) {
      return generateFicheNumber(prefix, parseInt(sequence));
    }
  }
  
  return number;
}