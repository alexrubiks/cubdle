import Modal from './Modal';
import { Link } from 'react-router-dom';

export default function AboutModal({ onClose, lastDatabaseUpdate }) {
  return (
    <Modal title="À propos" onClose={onClose} >

      <div className="flex flex-col gap-5">

        {/* PRESENTATION */}
        <div>
          <p>
            Chaque jour, découvre un nouveau défi à deviner autour du speedcubing :
            cubeurs, compétitions, classements et bien plus encore.
          </p>
        </div>

        {/* WCA */}
        <div>
          <p>
            La WCA n'approuve ni ne sponsorise ce projet.
          </p>

          <p className="mt-2">
            Les données utilisées proviennent des résultats publics de la WCA.
          </p>
        </div>

        {/* DONNEES */}
        <div>
          <h3 className="font-title font-bold text-black mb-1">
            Données
          </h3>

          <p>
            La base de données est mise à jour quotidiennement à 23h30.
            <br />
            Le nouveau défi apparaît chaque jour à minuit.
          </p>

          {lastDatabaseUpdate && (
            <p className="mt-2 text-xs text-black/40">
              Dernière mise à jour :
              <br />
              {lastDatabaseUpdate}
            </p>
          )}
        </div>

        {/* RETOURS */}
        <div>
        <h3 className="font-title font-bold text-black mb-1">
          Retours / Questions
        </h3>

        <p>
          Une suggestion ? Une erreur dans une donnée ?
          <br />
          N'hésite pas à me contacter !
        </p>

        <a href="mailto:wcalexrubiks@gmail.com" className=" inline-block underline hover:text-cubdle-background transition-colors ">
          wcalexrubiks@gmail.com
        </a>
        </div>

        {/* CONFIDENTIALITE */}
        <div>
          <h3 className="font-title font-bold text-black mb-1">
            Confidentialité
          </h3>

          <p>
            Cubdle respecte votre vie privée.
            <br />
            Retrouvez plus d'informations dans la{' '}
            <Link
              to="/privacy"
              className="
                underline
                cursor-pointer
                hover:text-cubdle-background
                transition-colors
              "
            >
              Politique de confidentialité
            </Link>.
          </p>
        </div>

        {/* SOUTIEN */}
        <div>
          <h3 className="font-title font-bold text-black mb-1">
            Soutenir Cubdle
          </h3>

          <p>
            Si tu apprécies le projet et souhaites le soutenir, tu peux
            {' '}
            <a
              href="https://ko-fi.com/alexrubiks"
              target="_blank"
              rel="noopener noreferrer"
              className="
                hover:underline
                hover:text-cubdle-background
                transition-colors
              "
            >
              m'offrir un café
            </a>
            {' '}
            ☕
          </p>
        </div>

        {/* SIGNATURE */}
        <div className="text-center pt-2">
          <p className="text-xs text-black/40 mt-1">
            Alexis Tremellat
          </p>
        </div>

      </div>

    </Modal>
  );
}