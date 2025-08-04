import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import type { RackAnalysis } from '../types/rack';

export interface EnhancedUploadMetadata {
  title?: string;
  description?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  copyright?: string;
}

export interface ComponentAnnotation {
  id?: string;
  type: 'chain' | 'device' | 'macro' | 'general';
  component_id: string;
  position: { x: number; y: number };
  content: string;
}

export interface EnhancedUploadState {
  file: File | null;
  analysis: RackAnalysis | null;
  metadata: EnhancedUploadMetadata;
  annotations: ComponentAnnotation[];
  autoTags: string[];
  complexityScore: number;
  suggestedMetadata: Partial<EnhancedUploadMetadata>;
  currentStep: number;
  isAnalyzing: boolean;
  isSaving: boolean;
  analysisError: string | null;
  saveError: string | null;
  progress: number;
}

export const useEnhancedUpload = () => {
  const [state, setState] = useState<EnhancedUploadState>({
    file: null,
    analysis: null,
    metadata: {},
    annotations: [],
    autoTags: [],
    complexityScore: 0,
    suggestedMetadata: {},
    currentStep: 1,
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
      annotations: [],
      autoTags: [],
      suggestedMetadata: {},
      analysisError: null,
      saveError: null,
      progress: 0,
      currentStep: file ? 2 : 1,
    }));
  };

  const setMetadata = (metadata: Partial<EnhancedUploadMetadata>) => {
    setState(prev => ({
      ...prev,
      metadata: { ...prev.metadata, ...metadata },
    }));
  };

  const addAnnotation = (annotation: ComponentAnnotation) => {
    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, { ...annotation, id: `ann_${Date.now()}` }],
    }));
  };

  const updateAnnotation = (id: string, updates: Partial<ComponentAnnotation>) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(ann => 
        ann.id === id ? { ...ann, ...updates } : ann
      ),
    }));
  };

  const removeAnnotation = (id: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.filter(ann => ann.id !== id),
    }));
  };

  const nextStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4),
    }));
  };

  const prevStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  };

  const analyzeFile = async () => {
    if (!state.file) return;

    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      analysisError: null, 
      progress: 10 
    }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);

      const response = await fetch('/api/upload/analyze', {
        method: 'POST',
        headers: {
          ...AuthService.getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        analysis: result.analysis,
        autoTags: result.auto_tags || [],
        complexityScore: result.complexity_score || 0,
        suggestedMetadata: result.suggested_metadata || {},
        isAnalyzing: false,
        progress: 100,
        currentStep: 3,
      }));

      // Auto-populate metadata with suggestions
      setState(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          title: prev.metadata.title || result.suggested_metadata?.title,
          difficulty: prev.metadata.difficulty || result.suggested_metadata?.difficulty,
          tags: prev.metadata.tags || result.suggested_metadata?.auto_tags?.slice(0, 5) || [],
        },
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
        metadata: {
          title: state.metadata.title,
          description: state.metadata.description,
          genre: state.metadata.genre?.toLowerCase(),
          bpm: state.metadata.bpm,
          key: state.metadata.key,
          difficulty: state.metadata.difficulty,
          tags: state.metadata.tags,
          copyright: state.metadata.copyright,
        },
        annotations: state.annotations.map(ann => ({
          type: ann.type,
          component_id: ann.component_id,
          position: ann.position,
          content: ann.content,
        })),
        file_content: base64Content,
      };

      const response = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(completeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save rack');
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
      annotations: [],
      autoTags: [],
      complexityScore: 0,
      suggestedMetadata: {},
      currentStep: 1,
      isAnalyzing: false,
      isSaving: false,
      analysisError: null,
      saveError: null,
      progress: 0,
    });
  };

  const applySuggestedTags = () => {
    setState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        tags: [...new Set([...(prev.metadata.tags || []), ...prev.autoTags.slice(0, 8)])],
      },
    }));
  };

  return {
    ...state,
    setFile,
    setMetadata,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    nextStep,
    prevStep,
    analyzeFile,
    saveRack,
    reset,
    applySuggestedTags,
  };
};