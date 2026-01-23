import React, { useState } from 'react';
import { X, Check, Camera } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';

const NoteCreator: React.FC<any> = ({ onSave, onClose }) => {
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({ quality: 80, resultType: CameraResultType.Base64 });
      if (photo.base64String) setAttachedImage(`data:image/jpeg;base64,${photo.base64String}`);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onClose}><X className="text-gray-400" /></button>
          <button onClick={() => { onSave({ type: 'note', notes: text, image: attachedImage }); onClose(); }} className="bg-primary text-white p-2 rounded-full"><Check /></button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Log observation..." className="w-full h-32 outline-none text-lg" />
        {attachedImage && <img src={attachedImage} className="w-20 h-20 rounded-xl object-cover mb-4" />}
        <button onClick={handleTakePhoto} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full font-bold text-sm"><Camera size={16} /> Photo</button>
      </div>
    </div>
  );
};
export default NoteCreator;
