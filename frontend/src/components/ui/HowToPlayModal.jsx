import Modal from './Modal';
import { HOW_TO_PLAY_CONTENT } from '../../content/howToPlayContent';

export default function HowToPlayModal({ gameKey, onClose }) {
  const content = HOW_TO_PLAY_CONTENT[gameKey];

  if (!content) return null;

  return (
    <Modal title={content.title} onClose={onClose}>
      <div className="font-body text-sm text-black/80 leading-relaxed">
        {content.body}
      </div>
    </Modal>
  );
}