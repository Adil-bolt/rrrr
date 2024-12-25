import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ReminderProvider } from './contexts/ReminderContext';
import { WhatsAppProvider } from './contexts/WhatsAppContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { LogoProvider } from './contexts/LogoContext';
import { PatientManagementProvider } from './contexts/PatientManagementContext';
import AppContent from './components/AppContent';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LogoProvider>
          <PaymentProvider>
            <WhatsAppProvider>
              <ReminderProvider>
                <SidebarProvider>
                  <PatientManagementProvider>
                    <AppContent />
                  </PatientManagementProvider>
                </SidebarProvider>
              </ReminderProvider>
            </WhatsAppProvider>
          </PaymentProvider>
        </LogoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}