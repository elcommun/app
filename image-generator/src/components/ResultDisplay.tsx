import React, { useState } from 'react';
import {
  ImageIcon,
  UseAsInputIcon,
  DownloadIcon,
  SparklesIcon,
  HistoryIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from './icons';

interface ResultDisplayProps {
  isLoading: boolean;
  imageUrls: string[] | null;
  onUseAsInput: (imageUrl: string) => void;
  activeSessionInfo?: {
    id: string;
    title: string;
    createdAt: number;
    prompt?: string;
  } | null;
  onOpenHistory?: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  isLoading,
  imageUrls,
  onUseAsInput,
  activeSessionInfo,
  onOpenHistory,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadSuccessIdx, setDownloadSuccessIdx] = useState<number | null>(null);

  const handleDownload = (imageUrl: string, index?: number) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        const link = document.createElement('a');
        link.download = `el-commun-gen-${Date.now()}${index !== undefined ? `-${index + 1}` : ''}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();

        if (index !== undefined) {
          setDownloadSuccessIdx(index);
          setTimeout(() => setDownloadSuccessIdx(null), 2000);
        }
      }
    };
  };

  const handleDownloadAll = () => {
    if (!imageUrls || imageUrls.length === 0) return;
    imageUrls.forEach((url, i) => {
      setTimeout(() => {
        handleDownload(url, i);
      }, i * 300);
    });
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-md">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-l-2 border-cyan-400 animate-spin [animation-direction:reverse] opacity-70"></div>
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
        </div>
        <p className="mt-8 text-sm font-medium text-slate-200 tracking-widest uppercase">
          画像を生成中...
        </p>
        <p className="text-xs text-slate-400 mt-2">
          完了後にブラウザのlocalStorageへ自動保存されます
        </p>
      </div>
    );
  }

  const hasImages = imageUrls && imageUrls.length > 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Session Context Bar if viewing an active session or generated results */}
      {hasImages && (
        <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/5 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white truncate block">
                {activeSessionInfo?.title || '生成結果プレビュー'}
              </span>
              {activeSessionInfo?.createdAt && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(activeSessionInfo.createdAt).toLocaleString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {imageUrls.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-all border border-white/5 flex items-center gap-1"
                title="すべての画像を保存"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>一括保存</span>
              </button>
            )}

            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                title="過去のセッション履歴を開く"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                <span>履歴</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Image Grid / Viewer */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {hasImages ? (
          <div className="grid grid-cols-1 gap-6">
            {imageUrls.map((url, index) => (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl transition-all hover:border-white/20"
              >
                {/* Image Aspect Box */}
                <div
                  className="aspect-square w-full relative cursor-pointer overflow-hidden flex items-center justify-center bg-black/40"
                  onClick={() => setLightboxIndex(index)}
                  title="クリックして拡大表示"
                >
                  <img
                    src={url}
                    alt={`生成画像 ${index + 1}`}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />

                  {/* Variation Badge */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 z-10 flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3 text-cyan-400" />
                    <span>Variation {index + 1}</span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 pointer-events-none">
                    <span className="text-xs text-white/80 font-medium mb-1">
                      クリックして高解像度プレビュー
                    </span>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="p-3 bg-black/60 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => onUseAsInput(url)}
                    className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all text-xs font-medium"
                    title="この画像を入力画像素材として追加"
                  >
                    <UseAsInputIcon className="w-4 h-4" />
                    <span>素材にする</span>
                  </button>

                  <button
                    onClick={() => handleDownload(url, index)}
                    className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all text-xs ${
                      downloadSuccessIdx === index
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-black hover:bg-slate-200 shadow-md shadow-white/5'
                    }`}
                    title="この画像を保存"
                  >
                    {downloadSuccessIdx === index ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>保存完了</span>
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="w-4 h-4" />
                        <span>保存</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-20 h-20 mb-4 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
              <ImageIcon className="w-9 h-9 opacity-40 text-slate-400" />
            </div>
            <p className="font-medium text-sm text-slate-400 tracking-wider uppercase">
              生成結果がここに表示されます
            </p>
            <p className="text-xs text-slate-600 mt-1 max-w-[280px]">
              左側の素材やプロンプトを入力して「画像を生成」を押すか、右上の「履歴」から過去のセッションを選択してください。
            </p>
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="mt-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <HistoryIcon className="w-4 h-4 text-indigo-400" />
                <span>過去のセッション履歴を開く</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && imageUrls && imageUrls[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="閉じる"
          >
            <XIcon className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + imageUrls.length) % imageUrls.length
                  );
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="前へ"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % imageUrls.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="次へ"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Main Modal Image */}
          <div
            className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrls[lightboxIndex]}
              alt={`プレビュー ${lightboxIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {/* Modal Bottom toolbar */}
            <div className="mt-4 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 font-mono">
                {lightboxIndex + 1} / {imageUrls.length}
              </span>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => onUseAsInput(imageUrls[lightboxIndex])}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <UseAsInputIcon className="w-4 h-4" />
                <span>素材にする</span>
              </button>
              <button
                onClick={() => handleDownload(imageUrls[lightboxIndex], lightboxIndex)}
                className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>保存</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};