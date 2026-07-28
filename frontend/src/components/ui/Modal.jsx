import { X } from 'lucide-react';

export default function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-5 py-10"
      onMouseDown={onClose}
    >

      <div
        className="relative w-full max-w-md mx-auto bg-[#FDFBD4] border-4 border-black rounded-2xl p-6"
        onMouseDown={e => e.stopPropagation()}
      >

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full border-2 border-black bg-[#FDFBD4] flex items-center justify-center hover:bg-black/5"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <h2 className="font-title font-extrabold text-2xl mb-5">
          {title}
        </h2>

        <div className="font-body text-sm text-black/80 leading-relaxed">
          {children}
        </div>

      </div>

    </div>
  );
}