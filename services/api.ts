import { User, Patient, VitalSign, PatientCategory } from '../types';

// Hardcoded for production to bypass Vercel environment variable build issues
const API_URL = import.meta.env.DEV ? '/api' : 'https://catechcare.onrender.com/api';

export const api = {
  async login(credentials: any): Promise<{ access: string; user: User }> {
    const response = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 500) {
        throw new Error('Server Crash (500): Database is missing tables! You MUST run "python manage.py migrate" on your server.');
      }
      throw new Error(data.detail || 'Login failed');
    }
    return data;
  },

  async getDashboardSummary() {
    const response = await fetch(`${API_URL}/dashboard/summary/`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    return response.json();
  },

  async searchPatients(query: string) {
    const response = await fetch(`${API_URL}/patients/?search=${query}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    return response.json();
  },

  async getRecentVitals() {
    const response = await fetch(`${API_URL}/vitals/recent/`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    return response.json();
  },

  async getClinicStats(startDate: string, endDate: string, category: string) {
    const response = await fetch(`${API_URL}/vitals/?start_date=${startDate}&end_date=${endDate}&category=${category}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Failed to fetch clinic stats for export');
    return response.json();
  },

  async registerPatient(patientData: any) {
    const response = await fetch(`${API_URL}/patients/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(patientData),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async updatePatient(id: string, partialData: any) {
    const response = await fetch(`${API_URL}/patients/${id}/`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(partialData),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async deletePatient(id: string) {
    const response = await fetch(`${API_URL}/patients/${id}/`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error(await response.text());
    // DELETE typically returns 204 No Content, so we don't try to parse JSON
    return true;
  },

  async addVitals(vitalsData: any) {
    const response = await fetch(`${API_URL}/vitals/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(vitalsData),
    });
    if (!response.ok) {
      let errorMessage = 'Failed to add vitals';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch (e) {
        // Fallback to text if not JSON
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async verifyPassword(password: string) {
    const response = await fetch(`${API_URL}/verify-password/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error('Invalid password');
    return response.json();
  },

  async getAlarms() {
    const response = await fetch(`${API_URL}/alarms/`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    if (!response.ok) throw new Error('Failed to fetch alarms');
    return response.json();
  },

  async acknowledgeAlarm(id: string) {
    const response = await fetch(`${API_URL}/alarms/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Failed to acknowledge alarm');
    return response.json();
  },

  async acknowledgeAllAlarms() {
    const response = await fetch(`${API_URL}/alarms/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to acknowledge all alarms');
    return response.json();
  },

  async deleteAlarm(id: string) {
    const response = await fetch(`${API_URL}/alarms/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Failed to delete alarm');
    return response.json();
  },

  async updateProfile(profileData: any) {
    const response = await fetch(`${API_URL}/profile/update/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(profileData),
    });
    if (!response.ok) {
      let errorMessage = 'Failed to update profile';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch (e) {
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async logPatientAction(patientId: string, actionName: string, details: string = '') {
    const response = await fetch(`${API_URL}/patients/${patientId}/log_action/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ action: actionName, details })
    });
    if (!response.ok) throw new Error('Failed to log action');
    return response.json();
  },

  async logout() {
    const response = await fetch(`${API_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.ok;
  },

  async logSystemAction(actionName: string, details: string = '') {
    const response = await fetch(`${API_URL}/log-system-action/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ action: actionName, details })
    });
    if (!response.ok) throw new Error('Failed to log system action');
    return response.json();
  }
};
