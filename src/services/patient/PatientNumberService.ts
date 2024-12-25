import { Patient } from '../../types/patient';
import { Appointment } from '../../components/calendar/types';
import { getPatientStatus, formatPatientNumber } from '../../utils/patientStatusUtils';

export class PatientNumberService {
  private static readonly STORAGE_KEY = 'patient_numbers';

  public static getNextPatientNumber(): string {
    const numbers = this.getStoredNumbers();
    let counter = 1;
    
    while (counter <= 9999) {
      const candidateNumber = counter.toString().padStart(4, '0');
      if (!numbers.includes(`P${candidateNumber}`)) {
        return `P${candidateNumber}`;
      }
      counter++;
    }
    
    throw new Error('No available patient numbers');
  }

  public static releaseNumber(number: string, patients: Patient[]): void {
    const numbers = this.getStoredNumbers();
    const index = numbers.indexOf(number);
    if (index > -1 && !this.isNumberUsedByOtherPatient(number, patients)) {
      numbers.splice(index, 1);
      this.saveNumbers(numbers);
    }
  }

  public static reserveNumber(number: string): void {
    const numbers = this.getStoredNumbers();
    if (!numbers.includes(number)) {
      numbers.push(number);
      this.saveNumbers(numbers);
    }
  }

  private static isNumberUsedByOtherPatient(number: string, patients: Patient[]): boolean {
    return patients.some(p => p.numeroPatient === number);
  }

  private static getStoredNumbers(): string[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static saveNumbers(numbers: string[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(numbers));
  }
}