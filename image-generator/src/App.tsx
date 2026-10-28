import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { generateImage, getApiKey, setApiKey } from './services/geminiService';
import { HistoryIcon, PlusIcon, SparklesIcon, CheckIcon } from './components/icons';
import { PromptInput } from './components/PromptInput';
import { SketchCanvas } from './components/SketchCanvas';
import { SessionSidebar } from './components/SessionSidebar';
import {
  ImageSession,
  getStoredSessions,
  saveGeneratedSession,
  deleteSessionById,
  toggleFavoriteSession,
  clearAllStoredSessions,
} from './services/sessionStorageService';

// Interface augmentation to fix global type conflict
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [sketchData, setSketchData] = useState<string | null>(null);
  const [restoredSketch, setRestoredSketch] = useState<string | null>(null);

  // Storage / Session state
  const [sessions, setSessions] = useState<ImageSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => !!getApiKey());

  // Load saved sessions from localStorage on initial render
  useEffect(() => {
    const loaded = getStoredSessions();
    setSessions(loaded);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleImageUpload = (imageDataUrls: string[]) => {
    setOriginalImages(imageDataUrls);
    setError(null);
  };

  const handleSketchChange = (imageDataUrl: string | null) => {
    setSketchData(imageDataUrl);
  };

  const handleGenerate = async () => {
    if (originalImages.length === 0 && !prompt && !sketchData) {
      setError('画像、プロンプト、またはスケッチのいずれかを入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateImage(originalImages, prompt, sketchData);
      if (images && images.length > 0) {
        setGeneratedImages(images);

        // Save session to localStorage
        try {
          const newSession = await saveGeneratedSession({
            prompt,
            generatedImages: images,
            originalImages,
            sketchData,
          });

          setSessions(getStoredSessions());
          setActiveSessionId(newSession.id);
          showToast('画像セッションをlocalStorageに保存しました');
        } catch (saveErr) {
          console.warn('Failed to save session to localStorage:', saveErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditApiKey = () => {
    const input = window.prompt(
      'Gemini APIキーを入力してください（Google AI Studio の「Get API key」で取得）。\nこの端末のブラウザにだけ保存されます。空欄でOKすると削除します。',
      getApiKey()
    );
    if (input === null) return;
    const key = input.trim();
    setApiKey(key);
    setHasApiKey(!!key);
    showToast(key ? 'APIキーを保存しました' : 'APIキーを削除しました');
  };

  const handleUseAsInput = (imageUrl: string) => {
    setOriginalImages((prev) => [...prev, imageUrl]);
    showToast('素材画像に追加しました');
  };

  // Restore past session
  const handleSelectSession = (session: ImageSession, restoreInputs: boolean) => {
    setGeneratedImages(session.generatedImages);
    setActiveSessionId(session.id);
    setError(null);

    if (restoreInputs) {
      setPrompt(session.prompt || '');
      setOriginalImages(session.originalImages || []);
      setSketchData(session.sketchData || null);
      setRestoredSketch(session.sketchData || null);
    }

    showToast(`セッション「${session.title}」を読み込みました`);
  };

  // Create clean new session
  const handleNewSession = () => {
    setOriginalImages([]);
    setPrompt('');
    setSketchData(null);
    setRestoredSketch(null);
    setGeneratedImages([]);
    setActiveSessionId(null);
    setError(null);
    showToast('新規セッションを開始しました');
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteSessionById(sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
    showToast('セッションを削除しました');
  };

  const handleToggleFavorite = (sessionId: string) => {
    const updated = toggleFavoriteSession(sessionId);
    setSessions(updated);
  };

  const handleClearAllSessions = () => {
    clearAllStoredSessions();
    setSessions([]);
    setActiveSessionId(null);
    showToast('すべての履歴セッションを消去しました');
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1880px] mx-auto w-full flex flex-col gap-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#16161a]/95 backdrop-blur-xl border border-indigo-500/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn text-sm">
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CheckIcon className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <header className="flex items-center justify-between px-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 flex items-center justify-center shadow-xl">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 blur-[2px]"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              EL COMMUN <span className="font-light text-slate-400">AI Studio</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <p className="text-[11px] text-slate-400 font-mono tracking-wide uppercase">
                Image Session Engine Active
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          {/* New Session Button */}
          <button
            onClick={handleNewSession}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition-all"
            title="入力をリセットして新規セッションを開始"
          >
            <PlusIcon className="w-4 h-4" />
            <span>新規セッション</span>
          </button>

          {/* History Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-all shadow-sm"
            title="過去に保存された画像セッションを閲覧"
          >
            <HistoryIcon className="w-4 h-4" />
            <span>セッション履歴</span>
            {sessions.length > 0 && (
              <span className="ml-0.5 bg-indigo-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                {sessions.length}
              </span>
            )}
          </button>

          <button
            onClick={handleEditApiKey}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all ${
              hasApiKey
                ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/5'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title="Gemini APIキーの設定"
          >
            <span>🔑</span>
            <span>{hasApiKey ? 'APIキー設定済' : 'APIキー未設定'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Col 1: Sources (Input) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex-grow bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 shadow-2xl flex flex-col transition-all hover:border-white/10 group overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                画像素材
              </h2>
              <span className="text-xs text-slate-600 bg-white/5 px-2 py-1 rounded-lg font-mono">01</span>
            </div>
            <div className="flex-grow relative overflow-hidden">
              <ImageUploader images={originalImages} onImageUpload={handleImageUpload} />
            </div>
          </div>
        </section>

        {/* Col 2: Controls (Prompt & Sketch) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 shadow-2xl h-full flex flex-col relative overflow-hidden transition-all hover:border-white/10">
            <div className="flex items-center justify-between mb-6 z-10 relative shrink-0">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                指示・プロンプト
              </h2>
              <span className="text-xs text-slate-600 bg-white/5 px-2 py-1 rounded-lg font-mono">02</span>
            </div>

            <div className="flex-col flex gap-6 z-10 relative flex-grow overflow-y-auto custom-scrollbar pr-1">
              <PromptInput value={prompt} onChange={setPrompt} />

              {/* Sketch Container */}
              <div className="flex flex-col w-full pb-2">
                <SketchCanvas
                  onChange={handleSketchChange}
                  baseImageUrl={originalImages.length > 0 ? originalImages[0] : null}
                  initialImageData={restoredSketch}
                />
              </div>
            </div>

            {/* Action Area */}
            <div className="mt-6 pt-6 border-t border-white/5 z-10 relative shrink-0">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`group relative w-full h-14 rounded-2xl font-medium text-[15px] tracking-wide transition-all duration-500 overflow-hidden ${
                  isLoading
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                <span className="relative flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>処理中 & localStorageへ保存...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      <span>画像を生成 & セッション保存</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Col 3: Output (Results) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 shadow-2xl h-full min-h-[600px] flex flex-col transition-all hover:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  生成ギャラリー
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {activeSession && (
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-mono truncate max-w-[140px]">
                    {activeSession.title}
                  </span>
                )}
                <span className="text-xs text-slate-600 bg-white/5 px-2 py-1 rounded-lg font-mono">03</span>
              </div>
            </div>

            <div className="flex-grow relative rounded-2xl overflow-hidden bg-black/20 border border-white/5">
              {error && (
                <div className="absolute top-4 left-4 right-4 z-20 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-200 p-4 rounded-xl text-sm flex items-start gap-3 animate-fadeIn">
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              <ResultDisplay
                isLoading={isLoading}
                imageUrls={generatedImages.length > 0 ? generatedImages : null}
                onUseAsInput={handleUseAsInput}
                activeSessionInfo={activeSession}
                onOpenHistory={() => setIsSidebarOpen(true)}
              />
            </div>
          </div>
        </section>
      </main>

      {/* History Slide-over Sidebar */}
      <SessionSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onToggleFavorite={handleToggleFavorite}
        onClearAll={handleClearAllSessions}
        onNewSession={handleNewSession}
      />
    </div>
  );
};

export default App;
