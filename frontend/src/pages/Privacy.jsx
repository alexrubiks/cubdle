import { Link } from 'react-router-dom';
import CubdleLogo from '../components/ui/CubdleLogo';

export default function Privacy() {
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

        <div className="
          bg-white
          border-4
          border-black
          rounded-2xl
          p-6
          font-body
          text-sm
          leading-relaxed
        ">

          <h1 className="
            font-title
            font-extrabold
            text-3xl
            mb-6
          ">
            Politique de confidentialité
          </h1>

          <div className="flex flex-col gap-6">

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                1. Présentation
              </h2>

              <p>
                Cubdle est un jeu quotidien indépendant autour du speedcubing.
                Le site utilise des données publiques issues de la World Cube
                Association (WCA) afin de proposer ses différents défis.
              </p>
            </section>

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                2. Données collectées
              </h2>

              <p>
                Cubdle ne demande pas la création d'un compte pour jouer.
                Les résultats des parties peuvent être enregistrés afin de
                permettre le suivi des scores et des statistiques.
              </p>

              <p className="mt-2">
                Si vous choisissez de vous connecter avec votre compte WCA,
                certaines informations publiques associées à votre compte
                peuvent être utilisées, notamment votre identifiant WCA et
                votre nom d'utilisateur.
              </p>
            </section>

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                3. Données WCA
              </h2>

              <p>
                Les informations relatives aux compétitions et aux résultats
                proviennent des données publiques de la World Cube Association.
              </p>

              <p className="mt-2">
                La WCA n'approuve ni ne sponsorise Cubdle.
              </p>
            </section>

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                4. Cookies et statistiques
              </h2>

              <p>
                Cubdle peut utiliser des outils de mesure d'audience afin de
                comprendre l'utilisation du site et améliorer l'expérience
                utilisateur.
              </p>

              <p className="mt-2">
                Ces outils peuvent nécessiter l'utilisation de cookies.
              </p>
            </section>

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                5. Conservation des données
              </h2>

              <p>
                Les données nécessaires au fonctionnement du service sont
                conservées uniquement pendant la durée nécessaire à leur usage.
              </p>
            </section>

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                6. Vos droits
              </h2>

              <p>
                Conformément à la réglementation applicable, vous pouvez
                demander l'accès, la modification ou la suppression de vos
                données personnelles.
              </p>
            </section>

            <section>
              <h2 className="font-title font-bold text-lg mb-2">
                7. Contact
              </h2>

              <p>
                Pour toute question concernant la confidentialité :
              </p>

              <a
                href="mailto:wcalexrubiks@gmail.com"
                className=" underline hover:text-cubdle-background"
              >
                wcalexrubiks@gmail.com
              </a>
            </section>

          </div>

          <Link
            to="/"
            className="
              inline-block
              mt-8
              font-bold
              font-title
              underline
            "
          >
            ← Retour à l'accueil
          </Link>

          <div className="
            mt-8
            pt-4
            border-t-2
            border-black/10
            text-xs
            text-black/40
            text-center
          ">
            Dernière mise à jour : juillet 2026
          </div>

        </div>
      </div>
    </div>
  );
}