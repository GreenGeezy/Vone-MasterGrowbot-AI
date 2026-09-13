import React, { useRef, useState } from "react";
import { X, Check, Camera, Image, Trash2 } from "lucide-react";
import {
  Camera as CapacitorCamera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";

const NoteCreator: React.FC<any> = ({ onSave, onClose }) => {
  const [text, setText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const canSave = text.trim().length > 0 || Boolean(attachedImage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saveLock = useRef(false);

  const handlePickImage = async (source: CameraSource) => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Base64,
        source,
      });
      if (photo.base64String)
        setAttachedImage(`data:image/jpeg;base64,${photo.base64String}`);
    } catch (e) {
      console.warn("Image selection was canceled or failed.");
    }
  };

  const handleSave = async () => {
    if (!canSave || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      if (
        (await onSave({
          type: "note",
          notes: text.trim(),
          image: attachedImage,
        })) === false
      )
        throw new Error("Not saved");
      onClose();
    } catch {
      setError(
        "Could not save your note. Your draft is still here. Please try again."
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-label="New note" className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[85dvh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <button
            disabled={saving}
            aria-label="Close note"
            onClick={onClose}
            className="min-h-11 min-w-11"
          >
            <X className="text-gray-400" />
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            aria-label="Save note"
            className={`p-2 rounded-full ${
              canSave ? "bg-primary text-white" : "bg-gray-100 text-gray-300"
            }`}
          >
            {saving ? (
              "Saving…"
            ) : (
              <span className="flex gap-2 items-center px-2">
                <Check /> Save note
              </span>
            )}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700 mb-3">
            {error}
          </p>
        )}
        <textarea
          aria-label="Note"
          disabled={saving}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What changed today? Add an observation or a photo."
          className="w-full h-32 outline-none text-lg"
        />
        {attachedImage && (
          <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-100">
            <img
              src={attachedImage}
              className="h-48 w-full object-cover"
              alt="Selected note attachment"
            />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-red-500 shadow-lg"
              aria-label="Remove selected image"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handlePickImage(CameraSource.Camera)}
            className="flex items-center justify-center gap-2 bg-gray-100 px-4 py-3 rounded-2xl font-bold text-sm"
          >
            <Camera size={16} /> Take Photo
          </button>
          <button
            onClick={() => handlePickImage(CameraSource.Photos)}
            className="flex items-center justify-center gap-2 bg-gray-100 px-4 py-3 rounded-2xl font-bold text-sm"
          >
            <Image size={16} /> Choose From Library
          </button>
        </div>
      </div>
    </div>
  );
};
export default NoteCreator;
