import { apiRequest } from './api';

// Tipos para las respuestas de la API
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ChangeEmailRequest {
  email: string;
}

export interface ChangeEmailResponse {
  message: string;
}

export interface EmailAddress {
  id: number;
  email: string;
  verified: boolean;
  primary: boolean;
}

export interface EmailListResponse {
  results: EmailAddress[];
}

export interface ResendVerificationResponse {
  message: string;
}

export interface DeleteEmailResponse {
  message: string;
}

export interface SetPrimaryEmailResponse {
  message: string;
}

// Servicio para configuración de cuenta
export const accountSettingsService = {
  // Cambio de contraseña usando la API personalizada
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await apiRequest('/api/admin/change-password/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.data as ChangePasswordResponse;
  },

  // Obtener lista de emails del usuario (usando dj-rest-auth)
  async getEmailAddresses(): Promise<EmailListResponse> {
    const response = await apiRequest('/api/auth/user/');
    const userData = response.data as any;
    // La respuesta de dj-rest-auth incluye la información del usuario con emails
    return {
      results: [{
        id: 1,
        email: userData?.email || '',
        verified: userData?.email_verified || false,
        primary: true
      }]
    };
  },

  // Agregar nuevo email (usando dj-rest-auth)
  async addEmailAddress(data: ChangeEmailRequest): Promise<ChangeEmailResponse> {
    // Esta funcionalidad requiere implementación personalizada en el backend
    // Por ahora, simulamos la respuesta
    throw new Error('Funcionalidad de agregar email no implementada aún');
  },

  // Reenviar verificación de email
  async resendEmailVerification(emailId: number): Promise<ResendVerificationResponse> {
    // Esta funcionalidad requiere implementación personalizada en el backend
    throw new Error('Funcionalidad de reenvío de verificación no implementada aún');
  },

  // Eliminar email
  async deleteEmailAddress(emailId: number): Promise<DeleteEmailResponse> {
    // Esta funcionalidad requiere implementación personalizada en el backend
    throw new Error('Funcionalidad de eliminar email no implementada aún');
  },

  // Establecer email como principal
  async setPrimaryEmail(emailId: number): Promise<SetPrimaryEmailResponse> {
    // Esta funcionalidad requiere implementación personalizada en el backend
    throw new Error('Funcionalidad de email principal no implementada aún');
  },

  // Solicitar restablecimiento de contraseña
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await apiRequest('/api/auth/password/reset/', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return response.data as { message: string };
  }
};
