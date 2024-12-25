import React, { createContext, useContext, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Appointment } from '../components/calendar/types';
import { AppointmentStorage } from '../services/storage/AppointmentStorage';
import { getPaymentStatus, PAYMENT_STATUSES } from '../utils/paymentStatus';
import { useData } from './DataContext';
import { handleAppointmentStatusChange } from '../utils/appointmentStatusHandler';

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getAppointmentsByDate: (date: Date) => Appointment[];
  getAppointmentById: (id: string) => Appointment | undefined;
  isTimeSlotAvailable: (date: Date, time: string, excludeId?: string) => boolean;
  todayAppointments: Appointment[];
}

const AppointmentContext = createContext<AppointmentContextType | null>(null);

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
};

interface AppointmentProviderProps {
  children: React.ReactNode;
}

export const AppointmentProvider = ({ children }: AppointmentProviderProps) => {
  const { patients, updatePatient } = useData();
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const savedAppointments = AppointmentStorage.loadAppointments();
    return savedAppointments.map(apt => ({
      ...apt,
      displayStatus: apt.status === 'Validé' ? PAYMENT_STATUSES.CONFIRMED : getPaymentStatus(apt.amount),
      deleted: false
    }));
  });
  
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    AppointmentStorage.saveAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const filteredAppointments = appointments
      .filter(apt => !apt.deleted)
      .filter(apt => {
        const aptDate = parseISO(apt.time);
        return format(aptDate, 'yyyy-MM-dd') === todayStr;
      })
      .sort((a, b) => {
        const timeA = parseISO(a.time);
        const timeB = parseISO(b.time);
        return timeA.getTime() - timeB.getTime();
      });

    setTodayAppointments(filteredAppointments);
  }, [appointments]);

  const addAppointment = (appointment: Appointment) => {
    const newAppointment = {
      ...appointment,
      id: crypto.randomUUID(),
      status: appointment.status || 'En attente',
      displayStatus: appointment.status === 'Validé' ? PAYMENT_STATUSES.CONFIRMED : getPaymentStatus(appointment.amount),
      deleted: false
    };
    setAppointments(prev => [...prev, newAppointment]);
    AppointmentStorage.addAppointment(newAppointment);

    // Update patient numbers
    const updatedPatients = handleAppointmentStatusChange(
      [...appointments, newAppointment],
      patients,
      newAppointment
    );
    updatedPatients.forEach(patient => updatePatient(patient.id, patient));
  };

  const updateAppointment = (id: string, updatedAppointment: Partial<Appointment>) => {
    setAppointments(prevAppointments => {
      const newAppointments = prevAppointments.map(apt => {
        if (apt.id === id) {
          // S'assurer que la date est au bon format
          const updatedTime = updatedAppointment.time 
            ? new Date(updatedAppointment.time).toISOString()
            : apt.time;

          return {
            ...apt,
            ...updatedAppointment,
            time: updatedTime,
            displayStatus: updatedAppointment.status === 'Validé' 
              ? PAYMENT_STATUSES.CONFIRMED 
              : getPaymentStatus(updatedAppointment.amount || apt.amount)
          };
        }
        return apt;
      });

      AppointmentStorage.saveAppointments(newAppointments);
      return newAppointments;
    });
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.map(apt => 
      apt.id === id ? { ...apt, deleted: true } : apt
    ));
    AppointmentStorage.updateAppointment(id, { deleted: true });

    // Update patient numbers after deletion
    const deletedAppointment = appointments.find(apt => apt.id === id);
    if (deletedAppointment) {
      const updatedPatients = handleAppointmentStatusChange(
        appointments.filter(apt => apt.id !== id),
        patients,
        { ...deletedAppointment, deleted: true }
      );
      updatedPatients.forEach(patient => updatePatient(patient.id, patient));
    }
  };

  const getAppointmentsByDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.time);
      return !apt.deleted && format(aptDate, 'yyyy-MM-dd') === dateStr;
    });
  };

  const getAppointmentById = (id: string) => {
    return appointments.find(apt => apt.id === id && !apt.deleted);
  };

  const isTimeSlotAvailable = (date: Date, time: string, excludeId?: string) => {
    const dateTimeToCheck = format(date, "yyyy-MM-dd HH:mm");
    
    return !appointments.some(apt => {
      if (apt.deleted || (excludeId && apt.id === excludeId)) return false;
      
      const aptDate = parseISO(apt.time);
      const aptDateTime = format(aptDate, "yyyy-MM-dd HH:mm");
      
      return aptDateTime === dateTimeToCheck;
    });
  };

  return (
    <AppointmentContext.Provider value={{
      appointments: appointments.filter(apt => !apt.deleted),
      addAppointment,
      updateAppointment,
      deleteAppointment,
      getAppointmentsByDate,
      getAppointmentById,
      isTimeSlotAvailable,
      todayAppointments
    }}>
      {children}
    </AppointmentContext.Provider>
  );
};