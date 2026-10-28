
import React, { useState, useEffect } from 'react';
import { PlusIcon, XIcon } from './icons';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

const LOCAL_STORAGE_KEY = 'promptTemplates';
const DEFAULT_TEMPLATES = [
  "最初の画像が「ベース画像」。2枚目以降が「差し替え画像」になります。レイアウトはベース画像に忠実にしてください",
  "机の上にある手帳を、提供された画像に置き換えて。影や光の当たり方は自然にしてください",
  "この画像のイメージに合うおしゃれな部屋に配置してください",
  "入力画像を使ってEC向けのサムネを作って下さい。背景も画像のイメージに合うオシャレなお部屋のテーブルに置いた感じにして下さい",
  "画像入力を元にECサイトのトップに載せる、2：1の横長のバナーを色々なパターンで考えて。20〜30代の女性向けのオシャレな感じで、レイアウトも変えて良いです",
];

export const PromptInput: React.FC<PromptInputProps> = ({ value, onChange }) => {
  const [templates, setTemplates] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    try {
      const storedTemplates = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } catch (error) {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error("Failed to save templates", error);
    }
  }, [templates]);

  const handleAddTemplate = () => {
    const newTemplate = value.trim();
    if (newTemplate && !templates.includes(newTemplate)) {
      setTemplates(prev => [...prev, newTemplate]);
    }
  };

  const handleDeleteTemplate = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    setTemplates(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  const handleUseTemplate = (template: string) => {
    onChange(template);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={`relative group rounded-2xl transition-all duration-300 ${isFocused ? 'ring-1 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'hover:bg-white/5'}`}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="生成したい画像の内容を記述してください..."
          rows={4}
          className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-[15px] text-slate-200 placeholder-slate-600 focus:outline-none focus:bg-black/40 transition-all resize-none leading-relaxed"
        />
        <div className="absolute bottom-3 right-3">
           <button
              onClick={handleAddTemplate}
              disabled={!value.trim() || templates.includes(value.trim())}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500 text-slate-400 hover:text-white disabled:opacity-0 transition-all duration-300"
              title="テンプレートとして保存"
            >
              <PlusIcon className="w-4 h-4" />
           </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">保存されたプロンプト</h3>
        {templates.length > 0 ? (
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
            {templates.map((template, index) => (
              <div 
                key={index} 
                onClick={() => handleUseTemplate(template)}
                className="flex items-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full pl-3 pr-1 py-1.5 cursor-pointer group transition-all duration-200 max-w-full"
              >
                <span className="text-[11px] text-slate-300 truncate select-none group-hover:text-white transition-colors flex-1">
                    {template}
                </span>
                <button 
                  onClick={(e) => handleDeleteTemplate(e, index)}
                  className="ml-1 p-1 rounded-full text-slate-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic pl-1">テンプレートはありません</p>
        )}
      </div>
    </div>
  );
};
