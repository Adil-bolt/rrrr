import React, { useState, useMemo } from 'react';
import { Search, Calendar, Mail, Edit, Trash2, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAppointments } from '../contexts/AppointmentContext';
import { getUniquePatients, enrichPatientWithAppointments } from '../utils/patientUtils';
import { formatters } from '../utils/formatters';
import PatientConsultationModal from '../components/PatientConsultationModal';
import ConsultationListModal from '../components/ConsultationListModal';
import PatientModal from '../components/PatientModal';
import DeletePatientModal from '../components/patient/DeletePatientModal';
import ConsultationFilters from '../components/patient/ConsultationFilters';
import { PatientNumberService } from '../services/patient/PatientNumberService';

export default function Patients() {
  const { patients, updatePatient, deletePatient } = useData();
  const { appointments, deleteAppointment } = useAppointments();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showConsultationHistory, setShowConsultationHistory] = useState(false);
  const [showConsultationList, setShowConsultationList] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Consultation filter states
  const [hideConsultations, setHideConsultations] = useState(false);
  const [showSpecificConsultations, setShowSpecificConsultations] = useState(false);
  const [hideCount, setHideCount] = useState('');
  const [showCount, setShowCount] = useState('');

  const enrichedPatients = useMemo(() => {
    const uniquePatients = getUniquePatients(patients);
    return uniquePatients.map(patient => enrichPatientWithAppointments(patient, appointments));
  }, [patients, appointments]);

  const { activePatients, pendingPatients } = useMemo(() => {
    const active = enrichedPatients.filter(patient => patient.nombreConsultations > 0);
    const pending = enrichedPatients.filter(patient => patient.nombreConsultations === 0);
    return { activePatients: active, pendingPatients: pending };
  }, [enrichedPatients]);

  const filteredPatients = useMemo(() => {
    const allPatients = [...activePatients, ...pendingPatients];
    return allPatients.filter(patient => {
      // Basic search filter
      const searchTerms = searchTerm.toLowerCase().split(' ');
      const matchesSearch = searchTerms.every(term => {
        const searchableContent = [
          patient.nom,
          patient.prenom,
          patient.numeroPatient,
          patient.telephone,
          patient.email,
          patient.ville,
          patient.cin,
          patient.dateNaissance,
          patient.mutuelle?.active ? `mutuelle ${patient.mutuelle.nom}` : 'sans mutuelle',
          ...patient.antecedents,
          `${patient.nombreConsultations} consultation${patient.nombreConsultations > 1 ? 's' : ''}`
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableContent.includes(term);
      });

      // Date range filter
      const dateFilter = !dateRange.startDate || !dateRange.endDate || (() => {
        const consultDate = patient.derniereConsultation ? 
          new Date(patient.derniereConsultation.split('/').reverse().join('-')) :
          null;
        if (!consultDate) return matchesSearch;
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        return consultDate >= start && consultDate <= end;
      })();

      // Consultation count filters
      const hideFilter = !hideConsultations || 
        (hideConsultations && patient.nombreConsultations !== parseInt(hideCount));
      
      const showFilter = !showSpecificConsultations || 
        (showSpecificConsultations && patient.nombreConsultations === parseInt(showCount));

      return matchesSearch && dateFilter && hideFilter && showFilter;
    });
  }, [activePatients, pendingPatients, searchTerm, dateRange, hideConsultations, showSpecificConsultations, hideCount, showCount]);

  const handlePatientNameClick = (patient: any) => {
    setSelectedPatient(patient);
    setShowConsultationHistory(true);
  };

  const handleConsultationCountClick = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setShowConsultationList(true);
  };

  const handleEdit = (patient: any) => {
    setSelectedPatient(patient);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    const patient = patients.find(p => p.id === id);
    if (patient?.numeroPatient) {
      PatientNumberService.releaseNumber(patient.numeroPatient, patients.filter(p => p.id !== id));
    }
    deletePatient(id);
    
    // Delete associated appointments
    const patientAppointments = appointments.filter(apt => apt.patientId === id);
    patientAppointments.forEach(apt => {
      deleteAppointment(apt.id);
    });
  };

  const handleUpdatePatient = (updatedPatient: any) => {
    updatePatient(updatedPatient.id, updatedPatient);
    setShowEditModal(false);
    setSelectedPatient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Patients ({filteredPatients.length})
          </h2>
          <div className="mt-1 text-sm text-gray-500">
            {activePatients.length} patients actifs (PXXXX) • {pendingPatients.length} patients en attente (PAXXXX)
          </div>
        </div>
        <button
          onClick={() => setShowNewPatientModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau patient
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Rechercher un patient..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        <ConsultationFilters
          hideConsultations={hideConsultations}
          showSpecificConsultations={showSpecificConsultations}
          hideCount={hideCount}
          showCount={showCount}
          onHideChange={setHideConsultations}
          onShowChange={setShowSpecificConsultations}
          onHideCountChange={setHideCount}
          onShowCountChange={setShowCount}
        />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ville
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mutuelle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière consultation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prochain RDV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatters.patientNumber(patient.numeroPatient, patient.nombreConsultations)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handlePatientNameClick(patient)}
                      className="text-left hover:text-indigo-600"
                    >
                      {formatters.patientName(patient.nom, patient.prenom)}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => handleConsultationCountClick(patient, e)}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      {patient.nombreConsultations} consultation{patient.nombreConsultations > 1 ? 's' : ''}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {formatters.phoneNumber(patient.telephone)}
                      </span>
                      {patient.email && (
                        <a 
                          href={`mailto:${patient.email}`}
                          className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          {patient.email}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatters.city(patient.ville)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatters.cin(patient.cin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      patient.mutuelle?.active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {patient.mutuelle?.active ? `Oui - ${patient.mutuelle.nom}` : 'Non'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.derniereConsultation || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {patient.prochainRdv || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(patient)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Modifier"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(patient.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PatientModal
        isOpen={showNewPatientModal}
        onClose={() => setShowNewPatientModal(false)}
        onSubmit={(patient) => {
          const newPatient = { ...patient, id: crypto.randomUUID() };
          updatePatient(newPatient.id, newPatient);
          setShowNewPatientModal(false);
        }}
      />

      {showEditModal && selectedPatient && (
        <PatientModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPatient(null);
          }}
          onSubmit={handleUpdatePatient}
          initialData={selectedPatient}
        />
      )}

      {selectedPatient && (
        <>
          <PatientConsultationModal
            isOpen={showConsultationHistory}
            onClose={() => {
              setShowConsultationHistory(false);
              setSelectedPatient(null);
            }}
            patient={selectedPatient}
          />
          <ConsultationListModal
            isOpen={showConsultationList}
            onClose={() => {
              setShowConsultationList(false);
              setSelectedPatient(null);
            }}
            patient={selectedPatient}
          />
        </>
      )}

      {showDeleteConfirm && (
        <DeletePatientModal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
          patientName={formatters.patientName(
            patients.find(p => p.id === showDeleteConfirm)?.nom,
            patients.find(p => p.id === showDeleteConfirm)?.prenom
          )}
        />
      )}
    </div>
  );
}