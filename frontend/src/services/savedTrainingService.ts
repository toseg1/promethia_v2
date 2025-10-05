import { apiClient } from './apiClient';

export interface SavedTraining {
  id: string;
  name: string;
  sport: string;
  description?: string;
  training_data: any;
  creator: string;
  creator_name: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export async function getSavedTrainings(sport?: string) {
  const params = sport ? `?sport=${sport}` : '';
  const response = await apiClient.get(`/saved-trainings/${params}`);
  return response.data as SavedTraining[];
}

export async function getSavedTrainingsBySport() {
  const response = await apiClient.get('/saved-trainings/by_sport/');
  return response.data as Record<string, SavedTraining[]>;
}

export async function createSavedTraining(data: {
  name: string;
  sport: string;
  description?: string;
  training_data: any;
}) {
  const response = await apiClient.post('/saved-trainings/', data);
  return response.data as SavedTraining;
}

export async function updateSavedTraining(id: string, data: Partial<SavedTraining>) {
  const response = await apiClient.put(`/saved-trainings/${id}/`, data);
  return response.data as SavedTraining;
}

export async function deleteSavedTraining(id: string) {
  await apiClient.delete(`/saved-trainings/${id}/`);
}
