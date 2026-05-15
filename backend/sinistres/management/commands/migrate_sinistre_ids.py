"""
sinistres/management/commands/migrate_sinistre_ids.py
──────────────────────────────────────────────────────
Commande de migration pour reformater tous les identifiants de sinistres
existants du format aléatoire (SIN-...) vers le nouveau format WW-CATSUB-FILE.

Usage :
    python manage.py migrate_sinistre_ids            # Migration réelle
    python manage.py migrate_sinistre_ids --dry-run  # Simulation (aucune écriture)
"""

from django.core.management.base import BaseCommand
from django.db import transaction, connection


class Command(BaseCommand):
    help = "Migre les IDs de sinistres vers le format WW-CATSUB-FILE."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simule la migration sans ecrire en base de donnees.",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "MODE DRY-RUN — Aucune modification ne sera enregistree en base."
            ))
        else:
            self.stdout.write(self.style.WARNING(
                "MIGRATION REELLE — Les IDs seront modifies definitvement."
            ))

        from sinistres.models import (
            Sinistre, HistoriqueStatut, PieceJointe, Equipement, Notification
        )
        from sinistres.serializers import _get_wilaya_code as get_wilaya_code, _get_catsub_code as get_catsub_code


        sinistres = list(
            Sinistre.objects
            .select_related('site')
            .order_by('dateCreation')
        )

        total    = len(sinistres)
        migrated = 0
        skipped  = 0

        self.stdout.write(f"\n{total} sinistre(s) a traiter.\n")

        # Compteur par (ww, catsub, year) pour les numeros FILE
        counters = {}
        migration_plan = []

        for sinistre in sinistres:
            old_id        = sinistre.idSinistre
            type_sinistre = sinistre.typeSinistre
            wilaya_name   = sinistre.site.wilaya if sinistre.site else ''
            year          = sinistre.dateCreation.year

            ww     = get_wilaya_code(wilaya_name)
            catsub = get_catsub_code(type_sinistre)

            if catsub == '0000':
                self.stdout.write(self.style.WARNING(
                    f"  IGNORE: {old_id} — typeSinistre '{type_sinistre}' inconnu."
                ))
                skipped += 1
                continue

            key = (ww, catsub, year)
            counters[key] = counters.get(key, 0) + 1
            file_num = counters[key]
            new_id   = f"{ww}-{catsub}-{file_num:02d}"

            migration_plan.append((old_id, new_id))
            prefix = "[DRY] " if dry_run else "      "
            self.stdout.write(f"  {prefix}{old_id}  ->  {new_id}")
            migrated += 1

        self.stdout.write(f"\n  A migrer : {migrated}  |  Ignores : {skipped}\n")

        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                "Dry-run termine. Relancez sans --dry-run pour appliquer."
            ))
            return

        # ── Migration effective dans une transaction atomique ──────────
        self.stdout.write("Application des changements en cours...\n")

        try:
            with transaction.atomic():
                for old_id, new_id in migration_plan:
                    if old_id == new_id:
                        self.stdout.write(f"  SKIP {old_id}  (deja au bon format)")
                        continue

                    if Sinistre.objects.filter(idSinistre=new_id).exists():
                        raise ValueError(
                            f"Collision detectee : '{new_id}' existe deja en base."
                        )

                    with connection.cursor() as cursor:
                        cursor.execute(
                            "UPDATE historique_statut SET sinistre_id = %s WHERE sinistre_id = %s",
                            [new_id, old_id]
                        )
                        cursor.execute(
                            "UPDATE piece_jointe SET sinistre_id = %s WHERE sinistre_id = %s",
                            [new_id, old_id]
                        )
                        cursor.execute(
                            "UPDATE equipement SET sinistre_id = %s WHERE sinistre_id = %s",
                            [new_id, old_id]
                        )
                        cursor.execute(
                            "UPDATE notification SET sinistre_id = %s WHERE sinistre_id = %s",
                            [new_id, old_id]
                        )
                        cursor.execute(
                            'UPDATE sinistre SET "idSinistre" = %s WHERE "idSinistre" = %s',
                            [new_id, old_id]
                        )

                    self.stdout.write(f"  OK  {old_id}  ->  {new_id}")

        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"\nERREUR — rollback effectue.\n{exc}"))
            raise

        self.stdout.write(self.style.SUCCESS(
            f"\nMigration terminee : {migrated} dossier(s) mis a jour."
        ))
