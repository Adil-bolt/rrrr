import React, { useState } from 'react';
import { Plus, MessageSquare, AlertTriangle, Settings, QrCode, Edit, Trash2 } from 'lucide-react';
import NotificationTemplateModal from '../components/NotificationTemplateModal';
import NotificationSettingsModal from '../components/NotificationSettingsModal';
import WhatsAppQRModal from '../components/WhatsAppQRModal';
import UpcomingAppointments from '../components/notifications/UpcomingAppointments';
import { useWhatsApp } from '../contexts/WhatsAppContext';
import { useTemplates } from '../hooks/useTemplates';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';

interface Template {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export default function Notifications() {
  const { isConnected, phoneNumber } = useWhatsApp();
  const { templates, addTemplate, updateTemplate, removeTemplate } = useTemplates();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const handleTemplateSubmit = (template: Template) => {
    if (editingTemplate) {
      updateTemplate(template.id, template);
    } else {
      addTemplate(template);
    }
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = (template: Template) => {
    setTemplateToDelete(template);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      removeTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifications WhatsApp</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <QrCode className="h-5 w-5 mr-2" />
            {isConnected ? `Connecté (${phoneNumber})` : 'Configurer WhatsApp'}
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Settings className="h-5 w-5 mr-2" />
            Paramètres
          </button>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau modèle
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                WhatsApp n'est pas configuré. Veuillez scanner le code QR pour activer les notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section des rendez-vous à venir */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Rendez-vous à venir
          </h3>
        </div>
        <div className="p-4">
          <UpcomingAppointments />
        </div>
      </div>

      {/* Section des modèles */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Modèles de messages
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Aucun modèle créé</p>
                <p className="text-sm">Cliquez sur "Nouveau modèle" pour commencer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.content}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        template.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <NotificationTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSubmit={handleTemplateSubmit}
        initialData={editingTemplate}
      />

      <NotificationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        templates={templates}
        onUpdate={(templateId, updates) => updateTemplate(templateId, updates)}
      />

      <WhatsAppQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={confirmDeleteTemplate}
        title="Supprimer le modèle"
        message={`Êtes-vous sûr de vouloir supprimer le modèle "${templateToDelete?.name}" ? Cette action est irréversible.`}
      />
    </div>
  );
}