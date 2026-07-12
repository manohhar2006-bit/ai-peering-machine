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
  X,
  Trash2,
  ArrowRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

type InputType = 'text' | 'image' | 'pdf';
type ActiveStep = 'form' | 'success';

export const AskDoubt: React.FC = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [activeStep, setActiveStep] = useState<ActiveStep>('form');

  // Form Fields
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [inputType, setInputType] = useState<InputType>('text');
  const [question, setQuestion] = useState('');

  // File Upload State
  const [localFiles, setLocalFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Success Step Data
  const [analysisResult, setAnalysisResult] = useState<{
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    keywords: string[];
    explanation?: string;
  } | null>(null);
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

  const handleInputTypeChange = (type: InputType) => {
    setInputType(type);
    setErrorMessage('');
    // Clear uploaded files when switching types
    localFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setLocalFiles([]);
    setUploadedUrls([]);
  };

  // Drag and drop handlers
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
      processSelectedFiles(Array.from(files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFiles(Array.from(files));
    }
  };

  const processSelectedFiles = async (files: File[]) => {
    setErrorMessage('');
    
    if (inputType === 'pdf') {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        setErrorMessage('Unsupported file type. Please upload a PDF document.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage('Large file detected. PDF size must not exceed 20 MB.');
        return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      setLocalFiles([{ file, previewUrl }]);
      uploadFiles([file]);
    } else if (inputType === 'image') {
      // Filter out non-images
      const validImages = files.filter(f => f.type.startsWith('image/'));
      if (validImages.length === 0) {
        setErrorMessage('Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.');
        return;
      }
      // Check sizes
      const oversized = validImages.some(f => f.size > 10 * 1024 * 1024);
      if (oversized) {
        setErrorMessage('One of the images exceeds the 10 MB limit.');
        return;
      }

      const newLocalFiles = validImages.map(f => ({
        file: f,
        previewUrl: URL.createObjectURL(f)
      }));

      // Merge if multiple images are allowed
      setLocalFiles(prev => {
        const updated = [...prev, ...newLocalFiles];
        uploadFiles(updated.map(item => item.file));
        return updated;
      });
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setErrorMessage('');
    const token = localStorage.getItem('token');
    const urls: string[] = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/ai/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: token ? `Bearer ${token}` : ''
          }
        });
        urls.push(response.data.originalUploadUrl);
      }
      setUploadedUrls(urls);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to upload files to backend.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = localFiles[index];
    URL.revokeObjectURL(fileToRemove.previewUrl);
    
    const updatedLocal = localFiles.filter((_, i) => i !== index);
    setLocalFiles(updatedLocal);

    const updatedUrls = uploadedUrls.filter((_, i) => i !== index);
    setUploadedUrls(updatedUrls);

    // Re-upload remaining files if any, to be safe
    if (updatedLocal.length > 0) {
      uploadFiles(updatedLocal.map(item => item.file));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Question Title is required.');
      return;
    }
    if (inputType === 'text' && !question.trim()) {
      setErrorMessage('Question details are required.');
      return;
    }
    if (inputType !== 'text' && uploadedUrls.length === 0) {
      setErrorMessage('Please upload at least one image or PDF.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      // If image upload is multiple, send as a JSON string array to originalUploadUrl
      const finalUploadUrl = inputType === 'text' 
        ? '' 
        : (inputType === 'image' ? JSON.stringify(uploadedUrls) : uploadedUrls[0]);

      const payload = {
        title,
        difficulty,
        question: inputType === 'text' ? question : title,
        inputType,
        originalUploadUrl: finalUploadUrl,
        subjectCode: isCustomSubject ? undefined : subjectCode,
        customSubject: isCustomSubject ? customSubject : undefined
      };

      const response = await axios.post(`${API_URL}/doubts`, payload, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      const { doubt, analysis, suggestedPeers } = response.data;
      setAnalysisResult({
        topic: analysis?.topic || doubt?.topic || 'General Topic',
        difficulty: analysis?.difficulty || doubt?.difficulty || difficulty,
        keywords: doubt?.keywords || [],
        explanation: analysis?.explanation || ''
      });

      setPeers(suggestedPeers || []);
      setActiveStep('success');
      await refreshProfile();
    } catch (err: any) {
      console.error('Doubt submission failed:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit doubt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    navigate('/feed');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Title Header */}
      <div className="flex items-center space-x-3.5 mb-4 select-none">
        <div className="h-11 w-11 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400 shadow-sm">
          <HelpCircle className="h-5.5 w-5.5" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            Ask a Doubt
          </h2>
          <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Submit your educational query through Text, Image, or PDF.
          </p>
        </div>
      </div>

      {/* Main Flow Card */}
      <div className="premium-card p-8">
        {activeStep === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Subject Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Subject
                </label>
                <div className="flex p-1 bg-slate-50 rounded-xl dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                      !isCustomSubject
                        ? 'bg-white text-slate-850 shadow-sm dark:bg-[#1E293B] dark:text-slate-105'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    <span>Select Subject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                      isCustomSubject
                        ? 'bg-white text-slate-850 shadow-sm dark:bg-[#1E293B] dark:text-slate-105'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    <span>Enter Subject</span>
                  </button>
                </div>
              </div>

              {!isCustomSubject ? (
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full premium-input text-sm font-semibold cursor-pointer"
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
                  placeholder="e.g., Database Systems, Mathematics III"
                  className="w-full premium-input text-sm font-semibold"
                />
              )}
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Difficulty
              </label>
              <div className="flex p-1 bg-slate-50 rounded-xl dark:bg-[#0F172A] border border-slate-105 dark:border-slate-800/40 max-w-sm">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                      difficulty === diff
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Title */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Question Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your doubt a concise title..."
                className="w-full premium-input text-sm font-semibold"
              />
            </div>

            {/* Submission Type Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Submission Type
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-2xl dark:bg-[#0F172A] max-w-md border border-slate-100 dark:border-slate-800/40">
                {(['text', 'image', 'pdf'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleInputTypeChange(mode)}
                    className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 ${
                      inputType === mode
                        ? 'bg-brand-600 text-white shadow-premium'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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

            {/* Content Upload Area / Rich Textarea */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Upload Area
              </label>

              {inputType === 'text' ? (
                <textarea
                  rows={8}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your complete doubt question details here..."
                  className="w-full premium-input font-semibold leading-relaxed p-5 text-sm"
                />
              ) : (
                <div className="space-y-4">
                  {/* Dropzone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10'
                        : 'border-slate-200 hover:border-brand-450 bg-slate-55/45 hover:bg-slate-55 dark:border-slate-800 dark:bg-[#0F172A]/30 dark:hover:bg-[#0F172A]/60 shadow-sm'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple={inputType === 'image'}
                      accept={inputType === 'image' ? 'image/png, image/jpeg, image/jpg, image/webp' : 'application/pdf'}
                      className="hidden"
                    />

                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:bg-[#0F172A] dark:group-hover:bg-brand-950/20 transition-all">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                        ) : (
                          <UploadCloud className="h-8 w-8" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-205">
                          {uploading ? 'Uploading attachment...' : `Drag and drop your ${inputType === 'image' ? 'images' : 'PDF'} here`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          or click to browse your files
                        </p>
                      </div>
                      <div className="flex items-center justify-center space-x-4 text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">
                        <span>Max size: {inputType === 'image' ? '10 MB' : '20 MB'}</span>
                        <span>•</span>
                        <span>Format: {inputType === 'image' ? 'PNG, JPG, JPEG, WEBP' : 'PDF'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Attachment Previews */}
                  {localFiles.length > 0 && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-[#0F172A]/20 space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">File Preview</span>
                      
                      {inputType === 'image' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {localFiles.map((fileItem, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] aspect-square flex items-center justify-center">
                              <img
                                src={fileItem.previewUrl}
                                alt={`preview-${idx}`}
                                className="max-h-full max-w-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-md"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        localFiles.map((fileItem, idx) => (
                          <div key={idx} className="flex flex-col space-y-3 bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-bold">
                                <FileIcon className="h-4.5 w-4.5 text-red-500" />
                                <span>{fileItem.file.name} ({(fileItem.file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="h-80 w-full rounded-lg overflow-hidden border border-slate-105 dark:border-slate-800">
                              <iframe
                                src={fileItem.previewUrl}
                                title="PDF Preview"
                                className="w-full h-full border-none"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-600 dark:bg-red-950/15 dark:border-red-900/30">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Submit Question Bar */}
            <div className="flex justify-end pt-4 border-t border-slate-50 dark:border-slate-800">
              <button
                type="submit"
                disabled={
                  submitting || 
                  uploading || 
                  !title.trim() || 
                  (inputType === 'text' && !question.trim()) || 
                  (inputType !== 'text' && localFiles.length === 0)
                }
                className="rounded-2xl bg-brand-655 bg-gradient-to-r from-brand-600 to-accent-500 px-8 py-3.5 text-sm font-bold text-white shadow-premium hover:opacity-95 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deploying Doubt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>Submit Question</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* SUCCESS STATE ANIMATION SCREEN */
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
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-550 dark:text-slate-400">
                  <Brain className="h-4.5 w-4.5 text-brand-500" />
                  <span>AI Routing Classification:</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-105 dark:bg-[#1E293B] dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Topic</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-205">{analysisResult.topic}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-105 dark:bg-[#1E293B] dark:border-slate-800">
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
                className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-premium transition-all cursor-pointer"
              >
                Go to Doubt Feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskDoubt;
