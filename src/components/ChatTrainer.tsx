import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Trash2,
  MessageSquare,
  Zap,
  Brain,
  Lightbulb,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Target,
  Info,
  Send,
  Type as TypeIcon,
  Terminal,
  UserCircle,
  Users,
  Handshake,
  DollarSign,
  HeartHandshake,
  Gauge,
  Sparkles as SparklesIcon,
  MessageCircle,
  Instagram,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { identifyKnowledgeGaps, getTrainingStatus, generateChatResponse, safeJsonParse, type TrainingStatus } from '../lib/gemini';
import { toast } from 'sonner';
import { useCRM } from '../contexts/CRMContext';
import { AIPersona } from '../types/crm';

type Scenario = 'ice-breaking' | 'pricing' | 'after-sales';
type Persona = 'professional' | 'friendly';

export default function ChatTrainer() {
  const { persona, setPersona, artists } = useCRM();
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [knowledgeGaps, setKnowledgeGaps] = useState<string[]>([]);
  const [isRefreshingGaps, setIsRefreshingGaps] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [importMode, setImportMode] = useState<'browser' | 'python'>('browser');

  // New State
  const [activeScenario, setActiveScenario] = useState<Scenario>('ice-breaking');
  
  // Calculate maturity based on training status and customer count
  const maturity = React.useMemo(() => {
    const base = trainingStatus?.readinessScore || 0;
    const customerBonus = Math.min(20, artists.filter(a => a.stage === 'customers').length);
    return Math.min(100, base + customerBonus);
  }, [trainingStatus, artists]);

  const [scenarioData, setScenarioData] = useState<Record<Scenario, string>>({
    'ice-breaking': '',
    'pricing': '',
    'after-sales': ''
  });

  // Test AI State
  const [testMessages, setTestMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Hello! I am your AI assistant. I am ready to answer your questions based on the training results.' }
  ]);
  const [testQuery, setTestQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/json': ['.json'],
      'text/csv': ['.csv']
    },
    multiple: true
  } as any);

  const refreshGaps = async () => {
    setIsRefreshingGaps(true);
    try {
      const summary = (files.length > 0 || pastedText)
        ? `The AI has seen ${files.length} files and ${pastedText.length} characters of pasted text.`
        : "The AI has no training data yet.";
      
      const [gaps, status] = await Promise.all([
        identifyKnowledgeGaps(summary),
        getTrainingStatus(summary)
      ]);
      
      setKnowledgeGaps(gaps);
      setTrainingStatus(status);
    } catch (error) {
      console.error("Failed to refresh gaps:", error);
    } finally {
      setIsRefreshingGaps(false);
    }
  };

  useEffect(() => {
    refreshGaps();
  }, []);

  const handleTrain = async () => {
    if (files.length === 0 && !pastedText) return;
    
    setIsTraining(true);
    setIsComplete(false);
    setTrainingProgress(0);

    // Read file contents if any
    let allContent = pastedText;
    for (const file of files) {
      try {
        const text = await file.text();
        if (file.name.endsWith('.json')) {
          // Basic attempt to extract text from Instagram JSON
          try {
            if (!text || text.trim() === 'undefined') {
              throw new Error("Invalid JSON content");
            }
            const data = safeJsonParse(text, null);
            if (data && data.messages) {
              const extracted = data.messages
                .map((m: any) => `${m.sender_name}: ${m.content || ''}`)
                .join('\n');
              allContent += `\n---\n${extracted}`;
            }
          } catch (e) {
            allContent += `\n---\n${text}`;
          }
        } else {
          allContent += `\n---\n${text}`;
        }
      } catch (err) {
        console.error("Failed to read file:", file.name);
      }
    }

    // Simulate training progress
    for (let i = 0; i <= 100; i += 10) {
      setTrainingProgress(i);
      await new Promise(r => setTimeout(r, 400));
    }

    // In a real app, we'd send allContent to the backend/AI here
    // For now, we'll refresh the gaps based on the total content
    setIsTraining(false);
    setIsComplete(true);
    
    // Pass the actual content summary to refreshGaps
    const summary = `The AI has processed ${allContent.length} characters of data across ${files.length} files and manual paste.`;
    const [gaps, status] = await Promise.all([
      identifyKnowledgeGaps(summary),
      getTrainingStatus(summary)
    ]);
    
    setKnowledgeGaps(gaps);
    setTrainingStatus(status);
    toast.success("Training complete! AI knowledge updated.");
  };

  const handleTest = async () => {
    if (!testQuery) return;
    
    const newUserMessage = { role: 'user' as const, content: testQuery };
    setTestMessages(prev => [...prev, newUserMessage]);
    setTestQuery('');
    setIsTesting(true);

    try {
      const history = pastedText || "Sample history: Customer asked about shipping. Clerk replied $8.99.";
      // Use the new persona-based script generation for testing if needed, 
      // but generateChatResponse is more for general chat.
      // Let's stick to generateChatResponse but maybe pass persona context if we update it later.
      const response = await generateChatResponse(history, testQuery);
      setTestMessages(prev => [...prev, { role: 'ai' as const, content: response }]);
    } catch (error) {
      console.error("Test failed:", error);
      setTestMessages(prev => [...prev, { role: 'ai' as const, content: "Sorry, I cannot answer this question at the moment. Please check the training data." }]);
    } finally {
      setIsTesting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Top Header: AI Maturity & Persona */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Maturity Card */}
        <div className="lg:col-span-2 bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-zinc-800"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={552.92}
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * maturity) / 100 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="text-rose-600"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{maturity}%</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI Maturity</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="w-10 h-10 bg-rose-600/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                  <Gauge className="w-5 h-5 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">AI Training Status Assessment</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                The current AI has basic business logic understanding. It is recommended to continue adding real conversation records for the "Pricing" scenario to improve conversion rates.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full border border-green-500/20 uppercase tracking-wider">Logic Closed-loop</span>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-full border border-blue-500/20 uppercase tracking-wider">Consistent Style</span>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-full border border-amber-500/20 uppercase tracking-wider">To be optimized: Pricing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Persona Switch Card */}
        <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <UserCircle className="w-6 h-6 text-amber-500" />
              </div>
              <h4 className="text-lg font-black tracking-tight">AI Persona Switch</h4>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setPersona('professional')}
                className={cn(
                  "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                  persona === 'professional' 
                    ? "bg-rose-600 border-rose-500 shadow-lg shadow-rose-600/20" 
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  persona === 'professional' ? "bg-white/20" : "bg-zinc-800 group-hover:bg-zinc-700"
                )}>
                  <ShieldCheck className={cn("w-5 h-5", persona === 'professional' ? "text-white" : "text-zinc-500")} />
                </div>
                <div className="text-left">
                  <p className={cn("text-sm font-black", persona === 'professional' ? "text-white" : "text-zinc-300")}>Professional Consultant</p>
                  <p className={cn("text-[10px] font-medium", persona === 'professional' ? "text-rose-100" : "text-zinc-500")}>Rigorous, professional, trustworthy</p>
                </div>
              </button>

              <button 
                onClick={() => setPersona('friendly')}
                className={cn(
                  "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                  persona === 'friendly' 
                    ? "bg-rose-600 border-rose-500 shadow-lg shadow-rose-600/20" 
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  persona === 'friendly' ? "bg-white/20" : "bg-zinc-800 group-hover:bg-zinc-700"
                )}>
                  <Handshake className={cn("w-5 h-5", persona === 'friendly' ? "text-white" : "text-zinc-500")} />
                </div>
                <div className="text-left">
                  <p className={cn("text-sm font-black", persona === 'friendly' ? "text-white" : "text-zinc-300")}>Friendly Partner</p>
                  <p className={cn("text-[10px] font-medium", persona === 'friendly' ? "text-rose-100" : "text-zinc-500")}>Kind, humorous, like a friend</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Data Acquisition & Context Training */}
        <div className="space-y-8">
          {/* Upload & Scrape Section */}
          <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Upload / Scrape Data</h3>
                  <p className="text-zinc-500 text-sm">Support exporting chat history from Instagram and importing for training.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                {...getRootProps()} 
                className={cn(
                  "relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center",
                  isDragActive 
                    ? "border-blue-500 bg-blue-500/5" 
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/20"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-zinc-800">
                  <Instagram className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="text-sm font-black mb-1">Drag & Drop Instagram exported JSON</h4>
                <p className="text-zinc-500 text-[10px] max-w-[150px]">
                  Supports .json, .txt formats
                </p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full p-6 bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/30 rounded-3xl transition-all flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Terminal className="w-5 h-5 text-blue-500" />
                  </div>
                  <h4 className="text-sm font-black">Use Python Scraper Script</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">Automatically traverse Inbox to extract conversations</p>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showGuide && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 p-6 bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-xs font-black text-zinc-300 uppercase tracking-widest">Python Scraper Guide</h5>
                    <button onClick={() => setShowGuide(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-black rounded-xl border border-zinc-800">
                      <code className="text-[10px] text-blue-400 font-mono">
                        pip install selenium<br />
                        python ins_scraper.py
                      </code>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      After running the script, log in to Instagram in the pop-up browser. The script will automatically scrape all chat history and generate training files.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Context Training Module */}
          <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20">
                <Brain className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Context Training</h3>
                <p className="text-zinc-500 text-sm">Deep learning for specific sales stages.</p>
              </div>
            </div>

            <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50 mb-8">
              {(['ice-breaking', 'pricing', 'after-sales'] as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveScenario(s)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                    activeScenario === s 
                      ? "bg-zinc-800 text-white shadow-lg" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {s === 'ice-breaking' && <SparklesIcon className="w-3.5 h-3.5" />}
                  {s === 'pricing' && <DollarSign className="w-3.5 h-3.5" />}
                  {s === 'after-sales' && <HeartHandshake className="w-3.5 h-3.5" />}
                  {s === 'ice-breaking' ? 'Ice-breaking' : s === 'pricing' ? 'Pricing' : 'After-sales'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <textarea 
                  value={scenarioData[activeScenario]}
                  onChange={(e) => setScenarioData(prev => ({ ...prev, [activeScenario]: e.target.value }))}
                  placeholder={`Enter or paste ideal scripts for the "${activeScenario === 'ice-breaking' ? 'Ice-breaking' : activeScenario === 'pricing' ? 'Pricing' : 'After-sales'}" scenario here...`}
                  className="w-full h-48 p-6 bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded-[2rem] outline-none transition-all text-sm resize-none font-medium placeholder:text-zinc-700"
                />
                <div className="absolute bottom-6 right-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Learning...</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleTrain}
                disabled={isTraining || !scenarioData[activeScenario]}
                className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 text-white font-black rounded-2xl transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-3"
              >
                {isTraining ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Strengthen Scenario Learning
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Preview Window */}
        <div className="space-y-8">
          <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem] flex flex-col h-full min-h-[700px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                  <MessageCircle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">AI Preview Test (Live Preview)</h3>
                  <p className="text-zinc-500 text-sm">Test AI response performance in different scenarios.</p>
                </div>
              </div>
              <button 
                onClick={() => setTestMessages([{ role: 'ai', content: 'Hello! I am your AI assistant. I am ready to answer your questions based on the training results.' }])}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-500 hover:text-white transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-[2rem] p-6 flex flex-col gap-4 overflow-y-auto mb-6 max-h-[500px] scrollbar-hide">
              {testMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "ml-auto bg-rose-600 text-white rounded-tr-none" 
                      : "mr-auto bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-tl-none"
                  )}
                >
                  {msg.content}
                </motion.div>
              ))}
              {isTesting && (
                <div className="mr-auto bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-zinc-700 flex items-center gap-2">
                  <div className="flex gap-1">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                    placeholder="e.g., Do your needles spray ink?"
                    className="w-full pl-6 pr-12 py-5 bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-2xl outline-none transition-all text-sm font-bold"
                  />
                  <button 
                    onClick={handleTest}
                    disabled={isTesting || !testQuery}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 text-white rounded-xl flex items-center justify-center transition-all"
                  >
                    {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setTestQuery('Do your needles spray ink?')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] font-black text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  Test: Ink Spray Issue
                </button>
                <button 
                  onClick={() => setTestQuery('How much for a tattoo?')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] font-black text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  Test: Pricing
                </button>
                <button 
                  onClick={() => setTestQuery('How to care for a new tattoo?')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] font-black text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  Test: After-care
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
