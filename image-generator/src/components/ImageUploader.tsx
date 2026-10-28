
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, TrashIcon, GripIcon, StarIcon } from './icons';

interface ImageUploaderProps {
  images: string[];
  onImageUpload: (imageDataUrls: string[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImageUpload }) => {
  const [isDraggingOverUploader, setIsDraggingOverUploader] = useState(false);
  const [draggingItemIndex, setDraggingItemIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files).filter(file => file.type.startsWith('image/'));

    if (fileList.length === 0) return;

    const newUploads: Promise<string>[] = [];

    fileList.forEach(file => {
      newUploads.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      }));
    });

    Promise.all(newUploads).then(newPreviews => {
      onImageUpload([...images, ...newPreviews]);
    });

  }, [onImageUpload, images]);

  const handleRemoveImage = (indexToRemove: number) => {
    const newImagePreviews = images.filter((_, index) => index !== indexToRemove);
    onImageUpload(newImagePreviews);
  };
  
  const handleSetAsBase = (indexToPromote: number) => {
    if (indexToPromote === 0) return;
    const newImages = [...images];
    const [item] = newImages.splice(indexToPromote, 1);
    newImages.unshift(item);
    onImageUpload(newImages);
  };
  
  const handleDragOverUploader = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverUploader(true);
  }, []);
  
  const handleDragLeaveUploader = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverUploader(false);
  }, []);

  const handleDropUploader = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverUploader(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleFiles]);

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggingItemIndex(index);
    dragItem.current = index;
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
    
    if (dragItem.current !== null && dragItem.current !== index) {
        const newImages = [...images];
        const draggedItemContent = newImages[dragItem.current];
        newImages.splice(dragItem.current, 1);
        newImages.splice(index, 0, draggedItemContent);
        
        onImageUpload(newImages);
        dragItem.current = index; // Update reference
    }
  };

  const onDragEnd = () => {
    setDraggingItemIndex(null);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Scrollable Image Grid */}
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div className={`grid grid-cols-2 gap-3 transition-all ${images.length === 0 ? 'h-full' : ''}`}>
          
          {/* Upload Button / Drop Zone */}
          <label
            onDragOver={handleDragOverUploader}
            onDragLeave={handleDragLeaveUploader}
            onDrop={handleDropUploader}
            className={`
              relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
              ${isDraggingOverUploader 
                ? 'border-indigo-500 bg-indigo-500/10' 
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'
              }
              ${images.length === 0 ? 'col-span-2 h-64' : ''}
            `}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className={`p-4 rounded-full bg-black/20 mb-3 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${isDraggingOverUploader ? 'scale-110 text-indigo-400' : 'text-slate-400'}`}>
               <UploadIcon className="w-8 h-8" />
            </div>
            <span className="text-xs text-slate-400 font-medium group-hover:text-slate-200 transition-colors">画像を追加</span>
            {images.length === 0 && (
                <span className="text-[10px] text-slate-500 mt-2 text-center px-4">
                    ドラッグ＆ドロップまたは<br/>クリックしてアップロード
                </span>
            )}
          </label>

          {/* Image List */}
          {images.map((img, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnter={(e) => onDragEnter(e, index)}
              onDragEnd={onDragEnd}
              className={`
                group relative aspect-square rounded-2xl overflow-hidden bg-black border transition-all duration-300
                ${index === 0 ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-white/10 hover:border-white/30'}
                ${draggingItemIndex === index ? 'opacity-50 scale-95' : 'opacity-100'}
              `}
            >
              <img src={img} alt={`Upload ${index}`} className="w-full h-full object-cover" />
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                
                <div className="flex justify-between items-start">
                   {/* Drag Handle */}
                   <div className="p-1.5 rounded-lg bg-black/50 text-slate-300 cursor-grab active:cursor-grabbing backdrop-blur-md">
                      <GripIcon className="w-4 h-4" />
                   </div>
                   
                   {/* Remove Button */}
                   <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(index);
                    }}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white transition-colors backdrop-blur-md"
                    title="削除"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Set as Base Button (Only for index > 0) */}
                {index > 0 && (
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsBase(index);
                        }}
                        className="w-full py-2 bg-black/60 hover:bg-indigo-600 text-slate-200 hover:text-white text-[10px] font-bold uppercase tracking-wide rounded-lg backdrop-blur-md transition-all flex items-center justify-center gap-1.5 border border-white/10"
                    >
                        <StarIcon className="w-3 h-3" />
                        ベースにする
                    </button>
                )}
                
                {/* Base Indicator */}
                {index === 0 && (
                    <div className="w-full py-1.5 bg-indigo-500/80 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg backdrop-blur-md flex items-center justify-center gap-1 text-center shadow-lg">
                        <StarIcon className="w-3 h-3" />
                        Base Image
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
