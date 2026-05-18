import type { ProfessorRatingInput } from '../../db/validation';
import type { Professor, ProfessorDetails, ProfessorRating } from '../types';
import { api } from './apiClient';

export const professorsApi = {
  getProfessors: async () => {
    const response = await api.get<{ professors: Professor[] }>('/professors');
    return response.professors;
  },

  getProfessorDetails: async (id: number) => {
    const response = await api.get<{ professor: ProfessorDetails }>(`/professors/${id}`);
    return response.professor;
  },

  submitRating: async (rating: ProfessorRatingInput, token: string) => {
    const response = await api.post<{ rating: ProfessorRating }>('/professors/rate', rating, token);
    return response.rating;
  },

  syncProfessors: async (token: string) => {
    return api.post<{ message: string; instructorsFound: number }>('/professors/sync', {}, token);
  },
};
