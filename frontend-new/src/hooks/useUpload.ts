import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import type { RackAnalysis } from '../types/rack';

export interface UploadMetadata {
  description?: string;
  producer_name?: string;
  tags?: string[];
  genre?: string;
  bpm?: number;
  key?: string;
}

export interface UploadState {
  file: File | null;
  analysis: RackAnalysis | null;
  metadata: UploadMetadata;
  isAnalyzing: boolean;
  isSaving: boolean;
  analysisError: string | null;
  saveError: string | null;
  progress: number;
}

export const useUpload = () => {
  const [state, setState] = useState<UploadState>({
    file: null,
    analysis: null,
    metadata: {},
    isAnalyzing: false,
    isSaving: false,
    analysisError: null,
    saveError: null,
    progress: 0,
  });
  
  const navigate = useNavigate();

  const setFile = (file: File | null) => {
    setState(prev => ({
      ...prev,
      file,
      analysis: null,
      analysisError: null,
      saveError: null,
      progress: 0,
    }));
  };

  const setMetadata = (metadata: Partial<UploadMetadata>) => {
    setState(prev => ({
      ...prev,
      metadata: { ...prev.metadata, ...metadata },
    }));
  };

  const analyzeFile = async () => {
    if (!state.file) return;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null, progress: 10 }));

    try {
      const response = await ApiService.analyzeRack(
        state.file,
        state.metadata.description,
        state.metadata.producer_name
      );

      setState(prev => ({
        ...prev,
        analysis: response.analysis,
        isAnalyzing: false,
        progress: 100,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisError: error instanceof Error ? error.message : 'Analysis failed',
        progress: 0,
      }));
    }
  };

  const saveRack = async () => {
    if (!state.file || !state.analysis) return;

    setState(prev => ({ ...prev, isSaving: true, saveError: null }));

    try {
      // Convert file to base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(state.file!);
      });

      const base64Content = fileContent.split(',')[1];

      const completeData = {
        analysis: state.analysis,
        filename: state.file.name,
        user_info: {
          description: state.metadata.description,
          producer_name: state.metadata.producer_name,
          tags: state.metadata.tags,
          genre: state.metadata.genre,
          bpm: state.metadata.bpm,
          key: state.metadata.key,
        },
        file_content: base64Content,
      };

      const response = await fetch('/api/analyze/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(completeData),
      });

      if (!response.ok) {
        throw new Error('Failed to save rack');
      }

      const result = await response.json();
      
      setState(prev => ({ ...prev, isSaving: false }));
      
      // Navigate to the rack page
      if (result.rack_id) {
        navigate(`/rack/${result.rack_id}`);
      } else {
        navigate('/profile');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        saveError: error instanceof Error ? error.message : 'Failed to save rack',
      }));
    }
  };

  const reset = () => {
    setState({
      file: null,
      analysis: null,
      metadata: {},
      isAnalyzing: false,
      isSaving: false,
      analysisError: null,
      saveError: null,
      progress: 0,
    });
  };

  return {
    ...state,
    setFile,
    setMetadata,
    analyzeFile,
    saveRack,
    reset,
  };
};