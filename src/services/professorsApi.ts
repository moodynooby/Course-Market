import type { Professor, ProfessorRating } from '../types';

const API_BASE = '/.netlify/functions/professors';

export const professorsApi = {
  async getProfessors(search?: string, subject?: string, semester?: string): Promise<Professor[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (subject) params.append('subject', subject);
    if (semester) params.append('semester', semester);

    const response = await fetch(`${API_BASE}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch professors');
    const data = await response.json();
    return data.professors;
  },

  async getProfessorDetail(
    id: number,
  ): Promise<{ professor: Professor; ratings: ProfessorRating[] }> {
    const response = await fetch(`${API_BASE}?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch professor details');
    return response.json();
  },

  async submitRating(
    token: string,
    ratingData: Omit<ProfessorRating, 'id' | 'auth0UserId' | 'userDisplayName' | 'createdAt'>,
  ): Promise<void> {
    const response = await fetch(`${API_BASE}?action=rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ratingData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit rating');
    }
  },

  async syncProfessors(): Promise<{ professorsSynced: number }> {
    const response = await fetch(`${API_BASE}?action=sync`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to sync professors');
    return response.json();
  },
};
