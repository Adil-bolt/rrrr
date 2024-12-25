import React, { useState, useMemo } from 'react';
import { format, addHours, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Calendar, Phone, AlertCircle, User, MessageSquare, Mail, MessageCircle, Check } from 'lucide-react';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useWhatsApp } from '../../contexts/WhatsAppContext';
import { useData } from '../../contexts/DataContext';
import { formatters } from '../../utils/formatters';
import NotificationDelay from './NotificationDelay';
import TemplateSelector from './TemplateSelector';
import { useTemplates } from '../../hooks/useTemplates';
import { CommunicationStatus, UpcomingAppointment } from '../../types/notification';
import { getConsideredColor, getInitialCommunicationStatus } from '../../utils/notificationStatus';

export default function UpcomingAppointments() {
  const { appointments } = useAppointments();
  const { patients } = useData();
  const { templates } = useTemplates();
  const { sendMessage } = useWhatsApp();
  
  const [delayHours, setDelayHours] = useState(48);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});
  const [communicationStatus, setCommunicationStatus] = useState<Record<string, CommunicationStatus>>({});

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    const maxTime = addHours(now, delayHours);

    return appointments
      .filter(apt => {
        const aptTime = parseISO(apt.time);
        return isWithinInterval(aptTime, { start: now, end: maxTime });
      })
      .map(apt => {
        const patient = apt.patientId ? patients.find(p => p.id === apt.patientId) : null;
        return {
          id: apt.id,
          patientId: apt.patientId,
          patientName: patient 
            ? formatters.patientName(patient.nom, patient.prenom)
            : apt.nom && apt.prenom 
              ? formatters.patientName(apt.nom, apt.prenom)
              : 'Patient non spécifié',
          time: apt.time,
          contact: apt.contact || patient?.telephone
        };
      })
      .sort((a, b) => parseISO(a.time).getTime() - parseISO(b.time).getTime());
  }, [appointments, patients, delayHours]);

  const handleTemplateSelect = (appointmentId: string, templateId: string) => {
    setSelectedTemplates(prev => ({
      ...prev,
      [appointmentId]: templateId
    }));
  };

  const handleCommunication = async (
    appointment: UpcomingAppointment, 
    type: keyof CommunicationStatus
  ) => {
    if (!appointment.contact) {
      alert('Aucun numéro de téléphone disponible pour ce patient');
      return;
    }

    try {
      switch (type) {
        case 'whatsapp':
          await handleSendNotification(appointment);
          break;
        case 'sms':
          window.open(`sms:${appointment.contact}`);
          break;
        case 'email':
          const patient = patients.find(p => p.id === appointment.patientId);
          if (patient?.email) {
            window.open(`mailto:${patient.email}`);
          } else {
            alert('Aucune adresse email disponible');
            return;
          }
          break;
        case 'phone':
          window.open(`tel:${appointment.contact}`);
          break;
      }

      setCommunicationStatus(prev => ({
        ...prev,
        [appointment.id]: {
          ...prev[appointment.id],
          [type]: true,
          considered: true
        }
      }));
    } catch (error) {
      console.error(`Erreur lors de la communication ${type}:`, error);
      alert(`Erreur lors de la communication ${type}`);
    }
  };

  const handleSendNotification = async (appointment: UpcomingAppointment) => {
    if (!appointment.contact) {
      alert('Aucun numéro de téléphone disponible pour ce patient');
      return;
    }

    const templateId = selectedTemplates[appointment.id];
    if (!templateId) {
      alert('Veuillez sélectionner un modèle de message');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) {
      alert('Modèle non trouvé');
      return;
    }

    try {
      const message = template.content
        .replace('{patientName}', appointment.patientName)
        .replace('{appointmentDate}', format(parseISO(appointment.time), 'EEEE d MMMM', { locale: fr }))
        .replace('{appointmentTime}', format(parseISO(appointment.time), 'HH:mm'));

      await sendMessage(appointment.contact, message);

      setCommunicationStatus(prev => ({
        ...prev,
        [appointment.id]: {
          ...prev[appointment.id],
          whatsapp: true,
          considered: true
        }
      }));
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  const getCommunicationStatus = (appointmentId: string): CommunicationStatus => {
    return communicationStatus[appointmentId] || getInitialCommunicationStatus();
  };

  return (
    <div className="space-y-4">
      <NotificationDelay 
        defaultValue={delayHours} 
        onChange={setDelayHours}
      />

      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <AlertCircle className="h-4 w-4" />
        <span>{upcomingAppointments.length} rendez-vous dans les prochaines {delayHours} heures</span>
      </div>

      <div className="space-y-2">
        {upcomingAppointments.map(appointment => {
          const status = getCommunicationStatus(appointment.id);
          const patient = patients.find(p => p.id === appointment.patientId);

          return (
            <div 
              key={appointment.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">{appointment.patientName}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{format(parseISO(appointment.time), 'EEEE d MMMM', { locale: fr })}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{format(parseISO(appointment.time), 'HH:mm')}</span>
                  {appointment.contact && (
                    <>
                      <Phone className="h-4 w-4 ml-2" />
                      <span>{formatters.phoneNumber(appointment.contact)}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <TemplateSelector
                  templates={templates}
                  selectedTemplateId={selectedTemplates[appointment.id] || null}
                  onTemplateSelect={(templateId) => handleTemplateSelect(appointment.id, templateId)}
                />
                
                <div className="flex items-center space-x-2">
                  {/* WhatsApp */}
                  <button
                    onClick={() => handleCommunication(appointment, 'whatsapp')}
                    disabled={!appointment.contact}
                    className={`p-2 rounded-full ${
                      !appointment.contact
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : status.whatsapp
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
                    }`}
                    title="WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {/* SMS */}
                  <button
                    onClick={() => handleCommunication(appointment, 'sms')}
                    disabled={!appointment.contact}
                    className={`p-2 rounded-full ${
                      !appointment.contact
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : status.sms
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                    }`}
                    title="SMS"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>

                  {/* Email */}
                  <button
                    onClick={() => handleCommunication(appointment, 'email')}
                    disabled={!patient?.email}
                    className={`p-2 rounded-full ${
                      !patient?.email
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : status.email
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-600'
                    }`}
                    title="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </button>

                  {/* Téléphone */}
                  <button
                    onClick={() => handleCommunication(appointment, 'phone')}
                    disabled={!appointment.contact}
                    className={`p-2 rounded-full ${
                      !appointment.contact
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : status.phone
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                    }`}
                    title="Téléphone"
                  >
                    <Phone className="h-4 w-4" />
                  </button>

                  {/* Considéré */}
                  <div className={`px-3 py-1 rounded-full ${getConsideredColor(status)}`}>
                    <div className="flex items-center space-x-1">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-medium">Considéré</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {upcomingAppointments.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            Aucun rendez-vous prévu dans les prochaines {delayHours} heures
          </div>
        )}
      </div>
    </div>
  );
}