from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from core.models import ChampionshipResult, Competition, Cubeur, DailyChallenge, Event
from core.tests.test_dates import at_paris


class PodiumTiesTests(TestCase):
    """Podiums avec ex æquo : 1-2-2, 1-1-3, 1-2-3-3."""

    def make_challenge(self, day, positions):
        event = Event.objects.get_or_create(slug="333fm", defaults={"name": "FMC"})[0]
        comp = Competition.objects.create(
            wca_id=f"CDF{day.day}", name=f"CDF {day.day}", month="1", year="2015", day_count=2,
            latitude=48.8, longitude=2.3, date_from=date(2015, 1, 1), is_championship=True,
        )
        people = []
        for i, pos in enumerate(positions):
            c = Cubeur.objects.create(wca_id=f"2010T{day.day:02d}{i:03d}"[:10], first_name=f"P{i}", last_name=f"N{i}", wca_year=2010)
            ChampionshipResult.objects.create(competition=comp, cubeur=c, event=event, position=pos, best=25 + i, average=2800)
            people.append(c)
        DailyChallenge.objects.create(
            date=day, cubeur=people[0], competition=comp, ranking_cubeur=people[0], ranking_event=event,
            podium_competition=comp, podium_event=event, location_competition=comp,
        )
        return people

    def guess(self, client, cubeur, day):
        with at_paris(day.year, day.month, day.day):
            return client.post("/api/guess/podium/", {"cubeur_id": cubeur.id}, format="json").data

    def test_two_tied_second_places(self):
        day = date(2026, 12, 1)
        p = self.make_challenge(day, [1, 2, 2, 4])
        with at_paris(2026, 12, 1):
            self.assertEqual(APIClient().get("/api/daily/").data["podium_positions"], [1, 2, 2])
        client = APIClient()
        r2a, r2b = self.guess(client, p[1], day), self.guess(client, p[2], day)
        # chacun sa ligne, plus de conflit
        self.assertEqual((r2a["correct"], r2a["slot"]), (True, 1))
        self.assertEqual((r2b["correct"], r2b["slot"]), (True, 2))
        r4 = self.guess(client, p[3], day)
        self.assertEqual((r4["correct"], r4["in_final"], r4["position"]), (False, True, 4))
        self.assertEqual(len(r4["hints"]), 3)

    def test_tied_first_and_four_way_podium(self):
        day = date(2026, 12, 2)
        self.make_challenge(day, [1, 1, 3, 4])
        with at_paris(2026, 12, 2):
            self.assertEqual(APIClient().get("/api/daily/").data["podium_positions"], [1, 1, 3])
        day = date(2026, 12, 3)
        p = self.make_challenge(day, [1, 2, 3, 3, 5])
        with at_paris(2026, 12, 3):
            self.assertEqual(APIClient().get("/api/daily/").data["podium_positions"], [1, 2, 3, 3])
        r = self.guess(APIClient(), p[3], day)
        self.assertEqual((r["correct"], r["slot"]), (True, 3))
        self.assertEqual(len(r["hints"]), 4)

    def test_classic_podium_unchanged(self):
        day = date(2026, 12, 4)
        p = self.make_challenge(day, [1, 2, 3, 4])
        r = self.guess(APIClient(), p[2], day)
        self.assertEqual((r["correct"], r["slot"], r["position"]), (True, 2, 3))


class PodiumFormatTests(TestCase):
    """Valeur affichée selon le format de la finale (Best of / Mean / Average)."""

    def setUp(self):
        self.event = Event.objects.get_or_create(slug="333fm", defaults={"name": "FMC"})[0]
        self.bld = Event.objects.get_or_create(slug="333bf", defaults={"name": "3BLD"})[0]

    def challenge(self, day, event, results):
        comp = Competition.objects.create(
            wca_id=f"CDFF{day.day}", name="CDF", month="1", year="2015", day_count=2,
            latitude=48.8, longitude=2.3, date_from=date(2015, 1, 1), is_championship=True,
        )
        people = []
        for i, (pos, best, avg) in enumerate(results):
            c = Cubeur.objects.create(wca_id=f"2011F{day.day:02d}{i:03d}"[:10], first_name=f"F{i}", last_name=f"L{i}", wca_year=2011)
            ChampionshipResult.objects.create(competition=comp, cubeur=c, event=event, position=pos, best=best, average=avg)
            people.append(c)
        DailyChallenge.objects.create(
            date=day, cubeur=people[0], competition=comp, ranking_cubeur=people[0], ranking_event=event,
            podium_competition=comp, podium_event=event, location_competition=comp,
        )
        return people

    def guess(self, cubeur, day):
        with at_paris(day.year, day.month, day.day):
            r = APIClient().post("/api/guess/podium/", {"cubeur_id": cubeur.id}, format="json").data
            ranked_by = APIClient().get("/api/daily/").data["podium_ranked_by"]
        return (r["score"], r["score_type"]), ranked_by

    def test_best_of_final_shows_single(self):
        day = date(2026, 12, 5)
        p = self.challenge(day, self.event, [(1, 22, 0), (2, 24, 0), (3, 25, 0)])  # Best of 2 : pas de moyenne
        self.assertEqual(self.guess(p[1], day), ((24, "single"), "single"))

    def test_mean_final_shows_average(self):
        day = date(2026, 12, 6)
        p = self.challenge(day, self.event, [(1, 20, 2233), (2, 22, 2267), (3, 21, 2400)])
        self.assertEqual(self.guess(p[2], day), ((2400, "average"), "average"))

    def test_dnf_average_ranked_on_single(self):
        day = date(2026, 12, 7)
        # 3e : moyenne DNF, classé après les moyennes valides, sur son single
        p = self.challenge(day, self.event, [(1, 20, 2233), (2, 22, 2267), (3, 19, -1)])
        self.assertEqual(self.guess(p[2], day), ((19, "single"), "average"))

    def test_blind_always_single(self):
        day = date(2026, 12, 8)
        p = self.challenge(day, self.bld, [(1, 2100, 2500), (2, 2300, 2700), (3, 2400, -1)])
        self.assertEqual(self.guess(p[0], day), ((2100, "single"), "single"))
