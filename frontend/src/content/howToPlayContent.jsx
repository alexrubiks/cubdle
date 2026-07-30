export const HOW_TO_PLAY_CONTENT = {
  general: {
    title: "Comment jouer à Cubdle",
    body: (
      <>
        Cubdle te propose chaque jour <strong>5 défis</strong> autour du monde du speedcubing français.
        <br /><br />
        Devine le <strong>cubeur</strong>, la <strong>compétition</strong>, le <strong>classement</strong>, le <strong>podium</strong> ou la <strong>localisation</strong> du jour à partir d'indices qui se révèlent au fil de tes tentatives.
        <br /><br />
        Tu peux également te connecter avec ton compte WCA pour <strong>sauvegarder ta progression</strong> et <strong>apparaître dans les classements du jour.</strong>
      </>
    ),
  },

  cubeur: {
    title: "Devine le cubeur",
    body: (
      <>
        Un <strong>cubeur</strong> à trouver chaque jour, choisi parmi les cubeurs classés <strong>80e ou mieux</strong> dans au moins une épreuve de la WCA.
        <br /><br />
        Tape un nom dans la barre de recherche : chaque tentative te donne des indices (genre, année de départ, classements par épreuve...) pour te rapprocher de la bonne réponse.
        <br /><br />
        Pour les <strong>valeurs numériques</strong> (nombre de compétitions, médailles), une <strong>flèche vers le haut</strong> signifie que la valeur recherchée est <strong>supérieure</strong> à la tentative, et inversement pour une flèche vers le bas.
        <br /><br />
        Attention cependant pour les <strong>classements nationaux</strong> par épreuve : comme il s'agit d'un rang, une <strong>flèche vers le haut</strong> indique cette fois un <strong>meilleur classement</strong> que la tentative, donc un nombre plus petit.
        <br /><br />
        Les cubeurs n'ayant pas renseigné leur genre sur la WCA apparaîtront avec un <strong>'X'</strong> dans la case correspondante.
        <br /><br />
        Un indice toutes les <strong>5 tentatives</strong>.
      </>
    ),
  },

  compet: {
    title: "Devine la compétition",
    body: (
      <>
        Une <strong>compétition WCA</strong> à trouver chaque jour, choisie parmi toutes les compétitions ayant eu lieu en France.
        <br /><br />
        Tape un nom dans la barre de recherche : chaque tentative te donne des indices (période, épreuves, organisateurs...) pour te rapprocher de la bonne réponse.
        <br /><br />
        Pour le <strong>nombre de compétiteurs</strong>, une <strong>flèche vers le haut</strong> signifie que la valeur recherchée est <strong>supérieure</strong> à la tentative, et inversement pour une flèche vers le bas.
        <br /><br />
        Pour les épreuves, trois états sont possibles :
        <br />
        - <strong className="text-green-600">Vert</strong> : l'épreuve est <strong>présente</strong> à la fois dans la compétition tentée et dans celle à deviner
        <br />
        - <strong className="text-red-600">Rouge</strong> : l'épreuve est présente dans la compétition tentée, mais <strong>pas dans celle à deviner</strong>
        <br />
        - <strong className="text-gray-400">Gris</strong> : l'épreuve est <strong>absente de la compétition tentée</strong>, aucune information n'est donc affichée à son sujet
        <br /><br />
        Pour les organisateurs et délégués, également une logique de couleurs :
        <br />
        - <strong className="text-green-600">Vert</strong> : les deux équipes sont exactement <strong>identiques</strong>
        <br />
        - <strong className="text-orange-500">Orange</strong> : <strong>certaines personnes sont communes</strong> aux deux équipes
        <br />
        - <strong className="text-red-600">Rouge</strong> : <strong>aucune personne en commun</strong> entre les deux équipes
        <br /><br />
        Il est possible de cliquer sur une de ces cases pour voir la <strong>liste des personnes</strong>.
        <br /><br />
        Un indice toutes les <strong>5 tentatives</strong>.
      </>
    ),
  },

  ranking: {
    title: "Devine le classement",
    body: (
      <>
        But du jeu : trouver le <strong>classement</strong> d'un cubeur tiré au sort.
        <br /><br />
        Propose une valeur entre 1 et 100, et révèle au fur et à mesure les noms et temps des personnes du classement pour t'aider à deviner la <strong>position exacte</strong> du cubeur recherché.
        <br /><br />
        Si plusieurs personnes sont classées ex-æquo, elles seront toutes affichées d'un coup et comptées comme une <strong>seule tentative</strong>.
      </>
    ),
  },

  podium: {
    title: "Devine le podium",
    body: (
      <>
        But du jeu : trouver les <strong>3 cubeurs</strong> sur un <strong>podium de Championnat de France</strong> choisi au hasard.
        <br /><br />
        Propose un à un les cubeurs que tu penses voir sur ce podium.
        <br /><br />
        Un indice toutes les <strong>5 tentatives erronées</strong>.
      </>
    ),
  },

  location: {
    title: "Devine la localisation",
    body: (
      <>
        Clique sur la carte pour tenter de deviner <strong>où s'est déroulée</strong> la compétition affichée.
        <br /><br />
        Plus ta tentative est proche du lieu réel, plus le score (sur 5000) sera élevé.
        <br /><br />
        Attention, <strong>une seule tentative</strong> est possible.
      </>
    ),
  },
};
