import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HelpCircle,
  Sparkles,
  Brain,
  CheckCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  UploadCloud,
  AlertTriangle,
  Copy,
  Trash2,
  Check,
  RefreshCw,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

type InputType = 'text' | 'image' | 'pdf';
type ProcessingState = 'idle' | 'uploading' | 'extracting' | 'extracted' | 'error';
type ActiveStep = 'form' | 'review' | 'preview' | 'success';

export const AskDoubt: React.FC = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [activeStep, setActiveStep] = useState<ActiveStep>('form');

  // Step 1: Subject State
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);

  // Step 2 & 3: Doubt Input & Mode
  const [question, setQuestion] = useState('');
  const [inputType, setInputType] = useState<InputType>('text');

  // Image/PDF Upload & OCR Processing
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [originalUploadUrl, setOriginalUploadUrl] = useState('');

  // Step 4: AI Review Editable text
  const [editedExtractedText, setEditedExtractedText] = useState('');
  const [copied, setCopied] = useState(false);

  // Step 5 & 6: AI Analysis & Preview
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    keywords: string[];
    explanation?: string;
  } | null>(null);
  const [aiError, setAiError] = useState<'busy' | 'timeout' | null>(null);
  const [lastAnalyzedText, setLastAnalyzedText] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [peers, setPeers] = useState<any[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_URL}/subjects`);
        setSubjects(response.data);
        if (response.data.length > 0) {
          setSubjectCode(response.data[0].code);
        }
      } catch (err) {
        console.error('Failed to retrieve subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  // Handle Tab Switch
  const handleInputTypeChange = (type: InputType) => {
    setInputType(type);
    // Reset file-related states if switching
    if (type !== inputType) {
      setUploadedFile(null);
      setUploadProgress(0);
      setProcessingState('idle');
      setErrorMessage('');
      setExtractedText('');
      setEditedExtractedText('');
      setOriginalUploadUrl('');
      // If going to text mode, keep question. If entering image/pdf, we clear question until OCR is approved
      if (type !== 'text') {
        setQuestion('');
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  // Process and upload file
  const processSelectedFile = async (file: File) => {
    setErrorMessage('');
    setUploadedFile(file);

    // Validate type and size limits
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (inputType === 'image') {
      if (!isImage) {
        setErrorMessage('Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.');
        setProcessingState('error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Large file detected. Image size must not exceed 10 MB.');
        setProcessingState('error');
        return;
      }
    } else if (inputType === 'pdf') {
      if (!isPdf) {
        setErrorMessage('Unsupported file type. Please upload a PDF document.');
        setProcessingState('error');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage('Large file detected. PDF size must not exceed 20 MB.');
        setProcessingState('error');
        return;
      }
    }

    // Trigger upload and OCR
    uploadAndExtract(file);
  };

  const uploadAndExtract = async (file: File) => {
    setProcessingState('uploading');
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate/Show upload progress
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/ai/ocr`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : ''
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const current = progressEvent.loaded;
          const percent = Math.min(Math.round((current * 100) / total), 95);
          setUploadProgress(percent);
        }
      });

      setUploadProgress(100);
      setProcessingState('extracting');

      // Add a small delay for extraction simulation feel
      await new Promise((resolve) => setTimeout(resolve, 800));

      const { extractedText, originalUploadUrl } = response.data;

      setExtractedText(extractedText);
      setEditedExtractedText(extractedText);
      setOriginalUploadUrl(originalUploadUrl);
      setProcessingState('extracted');
      
      // Move to review step
      setActiveStep('review');
    } catch (err: any) {
      console.error('File extraction failed:', err);
      const msg = err.response?.data?.message || 'Network failure or server error during text extraction.';
      setErrorMessage(msg);
      setProcessingState('error');
    }
  };

  // OCR Action Handlers
  const handleCopyText = () => {
    navigator.clipboard.writeText(editedExtractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearText = () => {
    setEditedExtractedText('');
  };

  const handleReextract = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadedFile(null);
    setUploadProgress(0);
    setProcessingState('idle');
    setExtractedText('');
    setEditedExtractedText('');
    setOriginalUploadUrl('');
    setActiveStep('form');
  };

  // OCR Approval -> AI Analysis (Step 5)
  const handleApproveOCR = async () => {
    if (!editedExtractedText.trim()) {
      setErrorMessage('Extracted text cannot be empty. Please edit or re-extract.');
      return;
    }
    
    // Set final question text
    setQuestion(editedExtractedText);
    runAIAnalysis(editedExtractedText);
  };

  // Text Mode Direct Submit -> AI Analysis
  const handleTextModeNext = () => {
    if (!question.trim()) return;
    runAIAnalysis(question);
  };

  const runAIAnalysis = async (textToAnalyze: string) => {
    setAnalyzing(true);
    setAiError(null);
    setErrorMessage('');
    setLastAnalyzedText(textToAnalyze);
    window.dispatchEvent(new CustomEvent('ai-status', { detail: 'busy' }));
    
    const subjectName = isCustomSubject
      ? customSubject
      : subjects.find((s) => s.code === subjectCode)?.name || 'General';

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/ai/analyze-doubt`,
        {
          doubtText: textToAnalyze,
          subject: subjectName
        },
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        }
      );

      // Check if backend returned structured error
      if (response.data && response.data.success === false && response.data.status === 'AI_BUSY') {
        window.dispatchEvent(new CustomEvent('ai-status', { detail: 'offline' }));
        setAiError('busy');
        setAnalyzing(false);
        return;
      }

      setAnalysisResult({
        topic: response.data.topic || 'General Concept',
        difficulty: response.data.difficulty || 'medium',
        keywords: response.data.keyTerms || [],
        explanation: response.data.conceptExplanation
      });

      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'online' }));
      setActiveStep('preview');
    } catch (err: any) {
      console.error('AI analysis failed:', err);
      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'offline' }));
      
      const errMsg = err.response?.data?.message || err.message || '';
      const isTimeout = errMsg.includes('timeout') || errMsg.includes('TIMEOUT') || err.code === 'ECONNABORTED';

      if (isTimeout) {
        setAiError('timeout');
      } else {
        setAiError('busy');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Final Database Save (Step 7)
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        question,
        inputType,
        originalUploadUrl,
        extractedText,
        subjectCode: isCustomSubject ? undefined : subjectCode,
        customSubject: isCustomSubject ? customSubject : undefined
      };

      const response = await axios.post(`${API_URL}/doubts`, payload, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      setPeers(response.data.suggestedPeers || []);
      setActiveStep('success');
      await refreshProfile(); // Refresh student XP
    } catch (err: any) {
      console.error('Final doubt creation failed:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save doubt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToEdit = () => {
    setActiveStep('form');
  };

  const handleDone = () => {
    navigate('/feed');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Title Header */}
      <div className="flex items-center space-x-3 mb-2">
        <div className="h-12 w-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400 shadow-sm">
          <HelpCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            Initiate a Doubt Quest
          </h2>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            Deploy your query through Text, Image, or PDF with AI-routing guidance.
          </p>
        </div>
      </div>

      {/* Main Flow Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
        
        {/* STEP progress indicator */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-50 dark:border-slate-800 pb-4">
          <div className="flex space-x-6 overflow-x-auto py-1">
            <div className={`flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider ${activeStep === 'form' ? 'text-brand-650 dark:text-brand-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${activeStep === 'form' ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30' : 'border-slate-200'}`}>1</span>
              <span>Input</span>
            </div>
            {inputType !== 'text' && (
              <div className={`flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider ${activeStep === 'review' ? 'text-brand-650 dark:text-brand-400' : 'text-slate-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${activeStep === 'review' ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30' : 'border-slate-200'}`}>2</span>
                <span>Review OCR</span>
              </div>
            )}
            <div className={`flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider ${activeStep === 'preview' ? 'text-brand-650 dark:text-brand-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${activeStep === 'preview' ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30' : 'border-slate-200'}`}>{inputType === 'text' ? '2' : '3'}</span>
              <span>Preview</span>
            </div>
          </div>

          {activeStep !== 'form' && activeStep !== 'success' && (
            <button
              onClick={handleBackToEdit}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Modify Details</span>
            </button>
          )}
        </div>

        {aiError ? (
          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-105 dark:border-rose-900/35 p-8 rounded-3xl text-center space-y-5 animate-scale-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 mx-auto shadow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">AI Service Offline</h4>
            <p className="text-sm font-semibold text-slate-550 dark:text-slate-350 leading-relaxed max-w-md mx-auto">
              {aiError === 'timeout'
                ? 'The AI service is taking longer than expected. Please try again.'
                : 'The AI service is temporarily busy due to high demand. Please wait a few seconds and try again.'}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-all"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => runAIAnalysis(lastAnalyzedText)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-md transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry AI Analysis</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeStep === 'form' && (
              <div className="space-y-8 animate-fade-in">
            {/* Subject selector (Step 1) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="text-xs font-bold uppercase text-slate-450 tracking-wider">
                  Subject Classification
                </label>
                {/* Elegant Toggle */}
                <div className="flex p-1 bg-slate-50 rounded-xl dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                      !isCustomSubject
                        ? 'bg-white text-slate-850 shadow-sm dark:bg-[#1E293B] dark:text-slate-105'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center ${!isCustomSubject ? 'bg-brand-500 border-transparent' : ''}`} />
                    <span>Select Subject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                      isCustomSubject
                        ? 'bg-white text-slate-850 shadow-sm dark:bg-[#1E293B] dark:text-slate-105'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center ${isCustomSubject ? 'bg-brand-500 border-transparent' : ''}`} />
                    <span>Enter Subject</span>
                  </button>
                </div>
              </div>

              {/* Show dropdown or input based on toggle */}
              {!isCustomSubject ? (
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-205 dark:focus:border-brand-500 transition-all shadow-sm"
                >
                  {subjects.length === 0 ? (
                    <option>Loading subjects...</option>
                  ) : (
                    subjects.map((sub) => (
                      <option key={sub._id} value={sub.code}>
                        {sub.name} ({sub.code})
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g., Theory of Computation, Compiler Design, Mathematics III"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-205 dark:focus:border-brand-500 transition-all shadow-sm"
                />
              )}
            </div>

            {/* Input Method Selection Segmented Tabs (Step 3) */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase text-slate-455 tracking-wider block">
                Input Method
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-2xl dark:bg-[#0F172A] max-w-md border border-slate-100 dark:border-slate-800/40">
                {(['text', 'image', 'pdf'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleInputTypeChange(mode)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                      inputType === mode
                        ? 'bg-brand-600 text-white shadow-premium'
                        : 'text-slate-450 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {mode === 'text' && <FileText className="h-4.5 w-4.5" />}
                    {mode === 'image' && <ImageIcon className="h-4.5 w-4.5" />}
                    {mode === 'pdf' && <FileIcon className="h-4.5 w-4.5" />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Text Area (Step 2) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-455 tracking-wider block">
                Question
              </label>

              {inputType === 'text' ? (
                <textarea
                  rows={8}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your complete doubt here or upload an image/PDF."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 px-5 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-205 dark:focus:border-brand-500 transition-all shadow-sm"
                />
              ) : (
                <div className="space-y-4">
                  {/* Upload Cards (Step 8) */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10'
                        : 'border-slate-200 hover:border-brand-400 bg-slate-50/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0F172A]/30 dark:hover:bg-[#0F172A]/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept={inputType === 'image' ? 'image/png, image/jpeg, image/jpg, image/webp' : 'application/pdf'}
                      className="hidden"
                    />

                    {processingState === 'idle' && (
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:bg-[#0F172A] dark:group-hover:bg-brand-950/20 transition-all">
                          <UploadCloud className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Drag and drop your {inputType === 'image' ? 'image' : 'PDF'} here
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            or click to browse your local filesystem
                          </p>
                        </div>
                        <div className="flex items-center justify-center space-x-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                          <span>Max size: {inputType === 'image' ? '10 MB' : '20 MB'}</span>
                          <span>•</span>
                          <span>Format: {inputType === 'image' ? 'PNG, JPG, JPEG, WEBP' : 'PDF'}</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar (Step 8) */}
                    {(processingState === 'uploading' || processingState === 'extracting') && (
                      <div className="w-full max-w-md space-y-4 py-4">
                        <div className="flex items-center justify-center space-x-3 text-slate-600 dark:text-slate-300">
                          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {processingState === 'uploading' ? 'Uploading media...' : 'AI Extracting content...'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-150 rounded-full overflow-hidden dark:bg-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs font-extrabold text-slate-400">{uploadProgress}% Complete</p>
                      </div>
                    )}

                    {processingState === 'error' && (
                      <div className="space-y-4 py-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center dark:bg-red-950/20">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-red-500">Processing Failed</p>
                          <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto leading-relaxed">
                            {errorMessage}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (uploadedFile) uploadAndExtract(uploadedFile);
                          }}
                          className="px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl text-xs font-bold dark:bg-red-950/30 dark:text-red-400 transition-all"
                        >
                          Retry Extraction
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error displays */}
            {errorMessage && processingState !== 'error' && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-600 dark:bg-red-950/15 dark:border-red-900/30">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Submit / Proceed bar */}
            <div className="flex justify-end pt-4 border-t border-slate-50 dark:border-slate-800">
              {inputType === 'text' ? (
                <button
                  type="button"
                  onClick={handleTextModeNext}
                  disabled={!question.trim() || analyzing}
                  className="rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-premium hover:bg-brand-700 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI Analyzing Doubt...</span>
                    </>
                  ) : (
                    <>
                      <span>Review & Preview</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                <div className="text-xs font-bold text-slate-400">
                  Please upload a file to proceed with AI extraction.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 4: AI REVIEW EXTRACTED TEXT (Step 4) */}
        {/* ============================================================== */}
        {activeStep === 'review' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 flex items-center space-x-3 text-emerald-700 dark:bg-emerald-950/10 dark:border-emerald-900/20">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide">AI Text Extraction Successful</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Please review, edit, or copy the extracted text before final submission approval.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-455 tracking-wider">
                  AI Extracted Question
                </label>

                {/* Toolbar options: Copy, Clear, Re-extract */}
                <div className="flex items-center space-x-3 text-slate-400">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center space-x-1 text-xs font-bold"
                    title="Copy to Clipboard"
                  >
                    {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearText}
                    className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center space-x-1 text-xs font-bold"
                    title="Clear Textarea"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReextract}
                    className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center space-x-1 text-xs font-bold"
                    title="Upload New File"
                  >
                    <RefreshCw className="h-4.5 w-4.5" />
                    <span>Re-upload</span>
                  </button>
                </div>
              </div>

              {/* Editable textarea */}
              <textarea
                rows={10}
                required
                value={editedExtractedText}
                onChange={(e) => setEditedExtractedText(e.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 px-5 text-sm leading-relaxed text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-205 dark:focus:border-brand-500 transition-all shadow-sm font-sans"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800 flex-wrap gap-4">
              <button
                type="button"
                onClick={handleReextract}
                className="px-5 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-550 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-[#0F172A] transition-all"
              >
                Cancel & Re-upload
              </button>

              <button
                type="button"
                onClick={handleApproveOCR}
                disabled={!editedExtractedText.trim() || analyzing}
                className="rounded-2xl bg-brand-655 bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3.5 text-sm font-bold text-white shadow-premium hover:bg-brand-755 transition-all flex items-center space-x-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI Analyzing doubt...</span>
                  </>
                ) : (
                  <>
                    <span>Approve & Analyze</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 6: PREVIEW PRE-SUBMISSION CARD */}
        {/* ============================================================== */}
        {activeStep === 'preview' && analysisResult && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-700 dark:text-slate-350 border-b border-slate-50 dark:border-slate-800 pb-2">
              <Brain className="h-5 w-5 text-brand-500" />
              <span>Orchestrator AI Classification & Doubt Preview</span>
            </div>

            {/* Structured Preview Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Metadata */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 dark:bg-[#0F172A] dark:border-slate-800/40 space-y-4 shadow-sm">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Subject</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
                      {isCustomSubject ? customSubject : (subjects.find(s => s.code === subjectCode)?.name || 'General')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Detected Topic</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
                      {analysisResult.topic}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Difficulty</span>
                      <span className={`text-xs font-extrabold capitalize inline-flex px-2.5 py-1 rounded-lg ${
                        analysisResult.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        analysisResult.difficulty === 'hard' ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400' :
                        'bg-amber-50 text-amber-650 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {analysisResult.difficulty}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Input Type</span>
                      <span className="text-xs font-extrabold capitalize text-slate-600 dark:text-slate-350 block mt-1">
                        {inputType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keywords Tag Card */}
                {analysisResult.keywords.length > 0 && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 dark:bg-[#0F172A] dark:border-slate-800/40 space-y-2.5 shadow-sm">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Generated Keywords</span>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.keywords.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-brand-50/50 text-brand-700 px-3 py-1 rounded-full text-[10px] font-extrabold dark:bg-brand-950/20 dark:text-brand-450 border border-brand-100/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Question Content */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 dark:bg-[#0F172A] dark:border-slate-800/40 h-full flex flex-col shadow-sm">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Question Text</span>
                  <div className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap overflow-y-auto max-h-56 flex-grow">
                    {question}
                  </div>
                </div>
              </div>
            </div>

            {/* Concept Explanation Card */}
            {analysisResult.explanation && (
              <div className="bg-brand-50/25 p-5 rounded-2xl border border-brand-100/30 leading-relaxed dark:bg-[#0F172A] dark:border-slate-850">
                <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider block mb-1 dark:text-brand-400">AI Concept breakdown</span>
                <p className="text-xs text-slate-550 dark:text-slate-400">{analysisResult.explanation}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800 flex-wrap gap-4">
              <button
                type="button"
                onClick={handleBackToEdit}
                className="px-5 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-550 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-[#0F172A] transition-all"
              >
                Edit Question
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="rounded-2xl bg-brand-655 bg-gradient-to-r from-brand-600 to-accent-500 px-8 py-3.5 text-sm font-bold text-white shadow-premium hover:opacity-95 transition-all flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving doubt details...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>Deploy Doubt Quest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {/* ============================================================== */}
        {/* SUCCESS STATE ANIMATION SCREEN */}
        {/* ============================================================== */}
        {activeStep === 'success' && (
          <div className="space-y-8 py-6 text-center animate-fade-in">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 flex items-center justify-center shadow-sm animate-bounce-soft">
                <CheckCircle className="h-10 w-10 animate-scale-up" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                Doubt Quest Dispatched!
              </h3>
              <p className="text-xs text-brand-600 font-extrabold uppercase tracking-wider dark:text-brand-400">
                +25 XP Awarded for meaningful participation
              </p>
            </div>

            <hr className="border-slate-50 dark:border-slate-800 max-w-md mx-auto" />

            {/* AI analysis classifications */}
            {analysisResult && (
              <div className="max-w-xl mx-auto bg-slate-50 p-6 rounded-3xl border border-slate-100/50 text-left dark:bg-[#0F172A] dark:border-slate-800/40 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Brain className="h-4.5 w-4.5 text-brand-500" />
                  <span>AI Routing Classification:</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Topic</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-205">{analysisResult.topic}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Difficulty</span>
                    <span className="text-xs font-bold capitalize text-slate-750 dark:text-slate-200">{analysisResult.difficulty}</span>
                  </div>
                </div>

                {analysisResult.explanation && (
                  <div className="text-[11px] leading-relaxed text-slate-500 bg-white/50 p-4 rounded-xl border border-slate-100/60 dark:bg-[#1E293B]/40 dark:border-slate-800 dark:text-slate-400">
                    <span className="font-extrabold text-slate-600 block mb-0.5 dark:text-slate-350 text-[10px] uppercase tracking-wider">Concept breakdown:</span>
                    {analysisResult.explanation}
                  </div>
                )}
              </div>
            )}

            {/* Peer recommendation list */}
            {peers.length > 0 && (
              <div className="max-w-xl mx-auto space-y-3 text-left">
                <div className="text-xs font-bold text-slate-550 dark:text-slate-400">
                  AI Recommended solvers routed:
                </div>
                <div className="flex flex-wrap gap-2">
                  {peers.map((peer) => (
                    <span
                      key={peer.id}
                      className="bg-accent-50 text-accent-700 border border-accent-100/50 px-3.5 py-1.5 rounded-full text-xs font-extrabold dark:bg-accent-950/20 dark:text-accent-400"
                    >
                      @{peer.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-md mx-auto pt-4">
              <button
                onClick={handleDone}
                className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-premium transition-all"
              >
                Go to Doubt Feed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Professional AI analyzing modal overlay */}
      {analyzing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-8 rounded-3xl max-w-sm w-full shadow-premium text-center space-y-4 animate-scale-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 mx-auto shadow-sm">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-slate-100">🤖 AI is analyzing your submission...</h4>
            <p className="text-xs text-slate-400 font-semibold">Please wait...</p>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-accent-400 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
