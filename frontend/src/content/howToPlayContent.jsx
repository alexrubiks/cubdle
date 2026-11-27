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

  // Maj de décembre : 6 jeux
  general_v2: {
    title: "Comment jouer à Cubdle",
    body: (
      <>
        Cubdle te propose chaque jour <strong>6 défis</strong> autour du monde du speedcubing français : devine le <strong>cubeur</strong>, la <strong>compétition</strong>, le <strong>classement</strong>, le <strong>podium</strong>, le <strong>NR</strong> et la <strong>localisation</strong> du jour. Les défis changent chaque jour à <strong>minuit (heure de Paris)</strong>.
        <br /><br />
        Connecte-toi avec ton compte WCA pour <strong>sauvegarder ta progression</strong> et <strong>apparaître dans les classements</strong>. Chaque jeu te rapporte de <strong>10 à 100 points</strong> selon ta place du jour ; ils s'additionnent sur la <strong>semaine</strong> et le <strong>mois</strong>.
        <br /><br />
        👑 Le gagnant de la semaine porte la <strong>couronne</strong> toute la semaine suivante.
        <br />
        🔥 Termine les 6 jeux chaque jour pour faire grimper ta <strong>streak</strong>.
        <br /><br />
        Tu as manqué un jour ? Tu peux <strong>rattraper les défis manqués</strong> à partir de 10 jours après leur date, depuis « Anciens défis » (hors classement).
      </>
    ),
  },

  nr: {
    title: "Devine le NR",
    body: (
      <>
        Chaque jour, un <strong>record de France</strong> (actuel ou ancien) : on te donne l'<strong>épreuve</strong>, le <strong>temps</strong> (ou le score) et la <strong>date</strong> à laquelle il a été établi.
        <br /><br />
        À toi de trouver <strong>qui</strong> l'a réalisé, en tapant un nom dans la barre de recherche. Toutes les personnes ayant détenu au moins un record de France sont proposées.
        <br /><br />
        Toutes les <strong>5 erreurs</strong>, une nouvelle <strong>lettre du nom</strong> est dévoilée.
        <br /><br />
        Si un record a été établi exactement en même temps par plusieurs personnes, chacune d'elles est une bonne réponse.
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
        Ces classements sont ceux <strong>à la moyenne</strong>, sauf pour les épreuves <strong>à l'aveugle</strong> (3BLD, 4BLD, 5BLD et Multi-Blind), classées <strong>au single</strong>.
        <br /><br />
        Les cubeurs n'ayant pas renseigné leur genre sur la WCA apparaîtront avec un <strong>'X'</strong> dans la case correspondante.
        <br /><br />
        Toutes les <strong>5 erreurs</strong>, une nouvelle <strong>lettre du nom</strong> est dévoilée (via le bouton 💡).
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
        Toutes les <strong>5 erreurs</strong>, une nouvelle <strong>lettre du nom</strong> est dévoilée (via le bouton 💡).
      </>
    ),
  },

  ranking: {
    title: "Devine le classement",
    body: (
      <>
        But du jeu : trouver le <strong>classement national</strong> d'un cubeur tiré au sort, dans l'épreuve affichée : à la <strong>moyenne</strong>, ou au <strong>single</strong> pour les épreuves à l'aveugle.
        <br /><br />
        Tu n'as qu'<strong>un seul essai</strong> : propose un rang entre 1 et 100.
        <br /><br />
        Ton score est l'<strong>écart</strong> entre ton rang et le vrai rang : 0, c'est parfait, et plus c'est bas, mieux c'est.
        <br /><br />
        Si plusieurs personnes sont classées ex æquo, viser n'importe quel rang entre elles compte comme le bon rang.
      </>
    ),
  },

  // Ancienne règle (jusqu'au 30 novembre 2026)
  ranking_legacy: {
    title: "Devine le classement",
    body: (
      <>
        But du jeu : trouver le <strong>classement</strong> d'un cubeur tiré au sort.
        <br /><br />
        Propose une valeur entre 1 et 100, et révèle au fur et à mesure les noms et temps des personnes du classement pour t'aider à deviner la <strong>position exacte</strong> du cubeur recherché.
        <br /><br />
        Si plusieurs personnes sont classées ex æquo, elles seront toutes affichées d'un coup et comptées comme une <strong>seule tentative</strong>.
      </>
    ),
  },

  podium: {
    title: "Devine le podium",
    body: (
      <>
        But du jeu : trouver les cubeurs sur le <strong>podium</strong> d'une épreuve d'un <strong>Championnat de France</strong> tiré au hasard (en cas d'<strong>ex æquo</strong>, il peut y avoir plus de 3 personnes à trouver).
        <br /><br />
        Propose un à un les cubeurs que tu penses voir sur ce podium. Les finalistes hors podium s'affichent avec leur place.
        <br /><br />
        Les temps affichés sont ceux du <strong>classement de la finale</strong> : la moyenne, ou le single pour les épreuves à l'aveugle et les finales sans moyenne.
        <br /><br />
        Toutes les <strong>5 erreurs</strong>, une nouvelle <strong>lettre du nom</strong> de chaque personne est dévoilée. Ton score est ton nombre d'erreurs.
      </>
    ),
  },

  location: {
    title: "Devine la localisation",
    body: (
      <>
        Clique sur la carte pour deviner <strong>où s'est déroulée</strong> la compétition affichée. Attention, <strong>une seule tentative</strong> est possible.
        <br /><br />
        Ton score (sur <strong>5000</strong>) dépend de ta distance au lieu réel : 5000 si tu tombes pile dessus, environ <strong>2500 à 70 km</strong>, et de moins en moins au-delà.
        <br /><br />
        Une fois ta tentative validée, tu peux afficher celles des <strong>autres joueurs</strong> sur la carte.
      </>
    ),
  },
};
