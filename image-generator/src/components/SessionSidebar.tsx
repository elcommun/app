import React, { useState, useMemo } from 'react';
import { ImageSession } from '../services/sessionStorageService';
import {
  HistoryIcon,
  SearchIcon,
  TrashIcon,
  StarIcon,
  XIcon,
  PlusIcon,
  SparklesIcon,
  ImageIcon,
  PenIcon,
  ChevronRightIcon,
  CheckIcon,
} from './icons';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ImageSession[];
  activeSessionId: string | null;
  onSelectSession: (session: ImageSession, restoreInputs: boolean) => void;
  onDeleteSession: (sessionId: string) => void;
  onToggleFavorite: (sessionId: string) => void;
  onClearAll: () => void;
  onNewSession: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onToggleFavorite,
  onClearAll,
  onNewSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [restoreInputsPreference, setRestoreInputsPreference] = useState(true);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterFavorites && !s.isFavorite) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchPrompt = s.prompt.toLowerCase().includes(q);
      const matchTitle = s.title.toLowerCase().includes(q);
      return matchPrompt || matchTitle;
    });
  }, [sessions, filterFavorites, searchQuery]);

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <>
      {/* Mobile / Screen Overlay backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] md:w-[480px] bg-[#0c0c0e]/95 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="セッション履歴サイドバー"
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">生成履歴セッション</h2>
                <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {sessions.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">ブラウザのlocalStorageに自動保存</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewSession}
              title="新しい生成を開始"
              className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border border-white/5"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">新規</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              aria-label="閉じる"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3 shrink-0">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="プロンプトやタイトルを検索..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
              <button
                onClick={() => setFilterFavorites(false)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  !filterFavorites
                    ? 'bg-white/10 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                すべて ({sessions.length})
              </button>
              <button
                onClick={() => setFilterFavorites(true)}
                className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  filterFavorites
                    ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <StarIcon className="w-3.5 h-3.5 fill-current" />
                お気に入り ({sessions.filter((s) => s.isFavorite).length})
              </button>
            </div>

            {/* Restore inputs option */}
            <label
              className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none hover:text-slate-200"
              title="セッション選択時に入力画像やスケッチ、プロンプトも同時に復元します"
            >
              <input
                type="checkbox"
                checked={restoreInputsPreference}
                onChange={(e) => setRestoreInputsPreference(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>入力素材も復元</span>
            </label>
          </div>
        </div>

        {/* Sessions Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredSessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-slate-600">
                <HistoryIcon className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-slate-400">
                {searchQuery || filterFavorites
                  ? '該当するセッションがありません'
                  : '保存されたセッション履歴はありません'}
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-[260px]">
                {searchQuery || filterFavorites
                  ? '検索条件やフィルターを変更してみてください。'
                  : '画像を生成すると自動的にこのブラウザのlocalStorageにセッションが記録されます。'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeSessionId === session.id;
              const hasOriginals = (session.originalImages?.length || 0) > 0;
              const hasSketch = !!session.sketchData;
              const previewCount = session.generatedImages?.length || 0;

              return (
                <div
                  key={session.id}
                  className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isActive
                      ? 'bg-indigo-950/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div className="p-3.5 pb-2 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatTimestamp(session.createdAt)}
                        </span>
                        {isActive && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 rounded-full font-medium">
                            表示中
                          </span>
                        )}
                      </div>
                      <h3
                        className="text-sm font-medium text-slate-200 truncate mt-0.5"
                        title={session.prompt || session.title}
                      >
                        {session.title || session.prompt || '無題の生成セッション'}
                      </h3>
                      {session.prompt && session.prompt !== session.title && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-light">
                          {session.prompt}
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(session.id);
                        }}
                        title={session.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          session.isFavorite
                            ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <StarIcon
                          className={`w-4 h-4 ${session.isFavorite ? 'fill-current' : ''}`}
                        />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deleteConfirmId === session.id) {
                            onDeleteSession(session.id);
                            setDeleteConfirmId(null);
                          } else {
                            setDeleteConfirmId(session.id);
                          }
                        }}
                        title={deleteConfirmId === session.id ? '本当に削除しますか？' : 'セッションを削除'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          deleteConfirmId === session.id
                            ? 'text-red-300 bg-red-500/20 border border-red-500/40'
                            : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                        }`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Confirmation text if delete was clicked */}
                  {deleteConfirmId === session.id && (
                    <div className="px-3.5 py-1.5 bg-red-500/10 border-t border-b border-red-500/20 flex items-center justify-between text-xs text-red-300">
                      <span>この履歴を削除しますか？</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-0.5 bg-red-500 text-white rounded font-medium hover:bg-red-600"
                        >
                          削除
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-0.5 text-slate-400 hover:text-white"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Image Thumbnails Strip */}
                  <div className="px-3.5 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    {session.generatedImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl bg-black/40 border border-white/10 shrink-0 overflow-hidden shadow-inner group-hover:border-white/20 transition-all"
                      >
                        <img
                          src={imgUrl}
                          alt={`生成画像 ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-[9px] font-mono px-1 rounded text-slate-300">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Badges & Load Button Footer */}
                  <div className="px-3.5 py-2.5 bg-black/20 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1 font-mono">
                        <SparklesIcon className="w-3 h-3 text-indigo-400" />
                        {previewCount}枚生成
                      </span>
                      {hasOriginals && (
                        <span
                          className="flex items-center gap-0.5 text-slate-400"
                          title={`素材画像: ${session.originalImages.length}枚`}
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>{session.originalImages.length}</span>
                        </span>
                      )}
                      {hasSketch && (
                        <span
                          className="flex items-center gap-0.5 text-purple-400"
                          title="スケッチ付き"
                        >
                          <PenIcon className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectSession(session, restoreInputsPreference)}
                      className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-medium transition-all flex items-center gap-1 text-xs shadow-sm"
                    >
                      <span>復元・再閲覧</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 bg-[#09090b] shrink-0 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>localStorage 保存済: {sessions.length}件</span>
          </div>

          {sessions.length > 0 && (
            <div>
              {confirmClearAll ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-[11px]">全消去?</span>
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClearAll(false);
                    }}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium"
                  >
                    はい
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded text-[11px]"
                  >
                    いいえ
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 text-[11px]"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>全履歴を削除</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
