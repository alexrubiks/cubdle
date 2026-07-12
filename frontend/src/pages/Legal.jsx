import { Link } from 'react-router-dom';
import CubdleLogo from '../components/ui/CubdleLogo';

export default function Legal() {
  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-8">

      <div className="w-2/3 min-w-[320px] max-w-3xl">

        {/* LOGO */}
        <Link
          to="/"
          className="flex justify-center mb-8 hover:scale-105 transition-transform"
        >
          <CubdleLogo size="lg" />
        </Link>

        <div className="bg-white border-4 border-black rounded-2xl p-6 font-body text-sm leading-relaxed">

          <h1 className="font-title font-extrabold text-3xl mb-6">
            Mentions légales
          </h1>

          <div className="flex flex-col gap-6">

            {/* EDITEUR */}
            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                Éditeur du site
              </h2>

              <p>
                Le site Cubdle est édité par :
              </p>

              <p className="mt-2">
                <strong>Alexis Tremellat</strong>
                <br />
                Contact :
                {' '}
                <a
                  href="mailto:wcalexrubiks@gmail.com"
                  className="underline font-bold"
                >
                  wcalexrubiks@gmail.com
                </a>
              </p>
            </section>

            {/* OBJET */}
            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                Objet du site
              </h2>

              <p>
                Cubdle est un jeu quotidien indépendant autour du speedcubing.
                Le site propose différents défis basés notamment sur des
                données publiques issues de la World Cube Association (WCA).
              </p>
            </section>

            {/* DONNEES WCA */}
            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                Données utilisées
              </h2>

              <p>
                Les informations relatives aux compétitions et aux résultats
                proviennent de données publiques de la WCA.
              </p>

              <p className="mt-2">
                La WCA n'approuve ni ne sponsorise ce projet.
              </p>
            </section>

            {/* HEBERGEMENT */}
            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                Hébergement
              </h2>

              <p>
                Le site Cubdle est hébergé par :
              </p>

              <p className="mt-2">
                <strong>Vercel Inc.</strong>
                <br />
                340 S Lemon Ave #4133
                <br />
                Walnut, CA 91789, États-Unis
              </p>

              <p className="mt-2">
                L'API et les services associés sont hébergés par :
              </p>

              <p className="mt-2">
                <strong>Railway Corp.</strong>
                <br />
                548 Market St, PMB 68999
                <br />
                San Francisco, CA 94104, États-Unis
              </p>

              <p className="mt-2">
                Le nom de domaine est géré par :
              </p>

              <p className="mt-2">
                <strong>OVH</strong>
                <br />
                2 rue Kellermann
                <br />
                59100 Roubaix, France
              </p>
            </section>

            {/* PROPRIETE */}
            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                Propriété intellectuelle
              </h2>

              <p>
                L'ensemble des éléments graphiques, du code et du contenu
                original présents sur Cubdle sont protégés par les règles
                relatives à la propriété intellectuelle.
              </p>

              <p className="mt-2">
                Les données provenant de la WCA restent la propriété de leurs
                ayants droit respectifs.
              </p>
            </section>

            {/* RESPONSABILITE */}
            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                Responsabilité
              </h2>

              <p>
                Cubdle est fourni à titre de projet indépendant.
                Malgré les efforts réalisés pour assurer l'exactitude des
                informations affichées, des erreurs peuvent subsister.
              </p>
            </section>

          </div>

          <div className="mt-8 pt-4 border-t-2 border-black/10 text-xs text-black/40 text-center">
            Dernière mise à jour : juillet 2026
          </div>

          <Link
            to="/"
            className="inline-block mt-6 font-title font-bold underline"
          >
            ← Retour à l'accueil
          </Link>

        </div>
      </div>
    </div>
  );
}