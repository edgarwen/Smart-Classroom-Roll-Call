
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeClassroomFrames } from './services/geminiService';
import { AppState, Student, AnalysisResult, AttendanceReport } from './types';
import { Camera, Users, CheckCircle2, AlertCircle, RefreshCw, List, History, ChevronLeft, FileText, Trash2, UserCheck, UserMinus, RotateCcw, Video, ZoomIn } from 'lucide-react';

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Zhang Wei', isPresent: false },
  { id: '2', name: 'Li Na', isPresent: false },
  { id: '3', name: 'Wang Feng', isPresent: false },
  { id: '4', name: 'Chen Jie', isPresent: false },
  { id: '5', name: 'Liu Yang', isPresent: false },
  { id: '6', name: 'Zhao Min', isPresent: false },
  { id: '7', name: 'Sun Lei', isPresent: false },
  { id: '8', name: 'Zhou Hui', isPresent: false },
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [courseName, setCourseName] = useState('Mathematics 101');
  const [className, setClassName] = useState('Group A');
  const [history, setHistory] = useState<AttendanceReport[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Zoom States
  const [zoom, setZoom] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<any>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('attendance_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (report: AttendanceReport) => {
    const newHistory = [report, ...history];
    setHistory(newHistory);
    localStorage.setItem('attendance_history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('attendance_history', JSON.stringify(newHistory));
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = { 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const track = stream.getVideoTracks()[0];
      videoTrackRef.current = track;

      // Check for zoom capabilities
      const capabilities = track.getCapabilities() as any;
      if (capabilities.zoom) {
        setZoomCapabilities(capabilities);
        setZoom(capabilities.zoom.min || 1);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Unable to access camera. Please ensure you are using HTTPS and have granted permissions.");
    }
  };

  useEffect(() => {
    if (appState === AppState.IDLE) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [appState]);

  // Pinch-to-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null && videoTrackRef.current && zoomCapabilities?.zoom) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastTouchDistance.current;
      
      // Map pixel delta to zoom range
      const zoomStep = (zoomCapabilities.zoom.max - zoomCapabilities.zoom.min) / 300; // 300px for full zoom range
      const nextZoom = Math.max(
        zoomCapabilities.zoom.min, 
        Math.min(zoomCapabilities.zoom.max, zoom + delta * zoomStep)
      );
      
      if (nextZoom !== zoom) {
        setZoom(nextZoom);
        try {
          videoTrackRef.current.applyConstraints({ advanced: [{ zoom: nextZoom }] as any });
        } catch (err) {
          console.warn("Could not apply zoom constraint", err);
        }
      }
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
  };

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        return dataUrl.split(',')[1];
      }
    }
    return null;
  }, []);

  const handleStartRecording = () => {
    setAppState(AppState.RECORDING);
    setRecordingTime(10);
    const frames: string[] = [];
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          finishRecording(frames);
          return 0;
        }
        
        if (prev % 1 === 0 || prev % 2 === 0) {
          const frame = captureFrame();
          if (frame) frames.push(frame);
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const applyAiCountToStudents = (count: number) => {
    const newStudents = MOCK_STUDENTS.map((s, index) => ({
      ...s,
      isPresent: index < count
    }));
    setStudents(newStudents);
  };

  const finishRecording = async (frames: string[]) => {
    setAppState(AppState.ANALYZING);
    try {
      const result = await analyzeClassroomFrames(frames.length > 0 ? frames : [captureFrame()!]);
      setAnalysisResult(result);
      applyAiCountToStudents(result.personCount);
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("AI analysis failed. Please check your internet connection.");
      setAppState(AppState.IDLE);
    }
  };

  const handleResetToAi = () => {
    if (analysisResult) {
      applyAiCountToStudents(analysisResult.personCount);
    }
  };

  const handleGenerateReport = () => {
    const presentStudents = students.filter(s => s.isPresent);
    const absentStudents = students.filter(s => !s.isPresent);
    
    const report: AttendanceReport = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      dateString: new Date().toLocaleString(),
      courseName,
      className,
      expectedCount: students.length,
      actualCount: presentStudents.length,
      absentCount: absentStudents.length,
      absentNames: absentStudents.map(s => s.name)
    };
    
    saveToHistory(report);
    setAppState(AppState.HISTORY);
  };

  const resetSession = () => {
    setAppState(AppState.IDLE);
    setAnalysisResult(null);
    setStudents(MOCK_STUDENTS.map(s => ({ ...s, isPresent: false })));
    setZoom(zoomCapabilities?.zoom?.min || 1);
  };

  const toggleStudent = (id: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, isPresent: !s.isPresent } : s));
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const isModified = analysisResult ? presentCount !== analysisResult.personCount : false;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 shadow-sm flex justify-between items-center safe-top">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <Users className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-black text-gray-800 tracking-tight">CLASS<span className="text-indigo-600">AI</span></h1>
        </div>
        <div className="flex gap-2">
          {appState === AppState.HISTORY ? (
            <button onClick={resetSession} className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-xl text-gray-600 font-bold text-xs transition-colors active:bg-gray-200">
              <ChevronLeft className="w-4 h-4" /> HOME
            </button>
          ) : (
            <button onClick={() => setAppState(AppState.HISTORY)} className="flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-xl text-indigo-600 font-bold text-xs transition-colors active:bg-indigo-100">
              <History className="w-4 h-4" /> HISTORY
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-4 space-y-4">
        
        {appState === AppState.HISTORY ? (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-gray-800 ml-1">Reports History</h2>
            {history.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-gray-100 text-center space-y-3">
                <FileText className="w-12 h-12 text-gray-200 mx-auto" />
                <p className="text-gray-400 font-bold text-sm">No saved reports.</p>
              </div>
            ) : (
              history.map(report => (
                <div key={report.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-gray-900 leading-tight">{report.courseName}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{report.className} • {report.dateString}</p>
                    </div>
                    <button onClick={() => deleteHistoryItem(report.id)} className="text-gray-300 hover:text-red-500 p-2 bg-gray-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] text-green-500 font-black">PRESENT</p>
                      <p className="text-lg font-black text-green-600">{report.actualCount}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] text-red-500 font-black">ABSENT</p>
                      <p className="text-lg font-black text-red-600">{report.absentCount}</p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] text-indigo-500 font-black">RATE</p>
                      <p className="text-lg font-black text-indigo-600">{Math.round((report.actualCount / report.expectedCount) * 100)}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <>
            {appState === AppState.IDLE && (
              <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">COURSE</label>
                    <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-700 text-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">CLASS</label>
                    <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-700 text-sm transition-all" />
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
              <div 
                className="relative aspect-[3/4] bg-gray-900 flex items-center justify-center overflow-hidden touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {cameraError ? (
                  <div className="p-8 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                    <p className="text-white text-sm font-medium">{cameraError}</p>
                    <button onClick={startCamera} className="bg-white text-gray-900 px-6 py-2 rounded-full font-bold text-xs active:scale-95 transition-transform">RETRY ACCESS</button>
                  </div>
                ) : appState === AppState.ANALYZING ? (
                  <div className="flex flex-col items-center gap-4 text-white p-8">
                    <div className="w-16 h-16 border-4 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></div>
                    <p className="text-lg font-black tracking-tight">AI ANALYZING...</p>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all duration-1000 ${appState === AppState.RESULT ? 'opacity-20 blur-lg scale-110' : 'opacity-100'}`} />
                )}

                {/* Zoom Level Indicator */}
                {zoomCapabilities?.zoom && appState === AppState.IDLE && (
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-[10px] font-black flex items-center gap-1.5 animate-in fade-in duration-300">
                    <ZoomIn className="w-3 h-3" />
                    {zoom.toFixed(1)}x
                  </div>
                )}

                {appState === AppState.RECORDING && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20">
                    <div className="bg-red-600 text-white px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl ring-4 ring-white/10">
                      <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                      <span className="text-2xl font-black font-mono">00:{recordingTime.toString().padStart(2, '0')}</span>
                    </div>
                    <p className="mt-6 text-white text-center px-8 font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed opacity-80">
                      Slowly pan across the room<br/>Pinch to zoom while panning
                    </p>
                  </div>
                )}

                {appState === AppState.RESULT && analysisResult && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white z-20 animate-in zoom-in-95 duration-500">
                    <div className="bg-indigo-950/80 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl">
                      <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                        <UserCheck className="w-8 h-8 text-green-400" />
                      </div>
                      <h2 className="text-6xl font-black mb-1">{analysisResult.personCount}</h2>
                      <p className="text-indigo-300 uppercase text-[10px] font-black tracking-widest mb-4">Detected Students</p>
                      <p className="text-indigo-100 text-xs italic font-medium opacity-80 leading-relaxed px-2">"{analysisResult.description}"</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white">
                {appState === AppState.IDLE && (
                  <button onClick={handleStartRecording} className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                    <Video className="w-6 h-6" /> START ROLL-CALL
                  </button>
                )}
                
                {appState === AppState.RESULT && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-2xl font-black text-gray-900 leading-tight">
                          {presentCount} <span className="text-gray-400 text-sm">PRESENT</span>
                        </p>
                        {isModified && (
                          <div className="flex items-center gap-2">
                             <span className="bg-amber-100 text-amber-700 text-[8px] px-2 py-0.5 rounded-md font-black">OVERRIDDEN</span>
                             <button onClick={handleResetToAi} className="text-indigo-600 text-[9px] font-black uppercase underline decoration-2 underline-offset-2">Reset to AI</button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={resetSession} className="p-4 bg-gray-100 rounded-2xl text-gray-500 active:bg-gray-200 transition-colors"><RefreshCw className="w-5 h-5"/></button>
                        <button onClick={handleGenerateReport} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-transform">SAVE REPORT</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {appState === AppState.RESULT && (
              <section className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden mb-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tap to manually adjust attendance</p>
                </div>
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {students.map(student => (
                    <div key={student.id} onClick={() => toggleStudent(student.id)} className={`flex items-center justify-between px-6 py-4 active:bg-gray-100 transition-colors ${student.isPresent ? 'bg-green-50/30' : 'bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${student.isPresent ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {student.name.charAt(0)}
                        </div>
                        <span className={`font-black text-sm ${student.isPresent ? 'text-green-900' : 'text-gray-400'}`}>{student.name}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${student.isPresent ? 'bg-green-600 border-green-600' : 'border-gray-200'}`}>
                        {student.isPresent && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;
