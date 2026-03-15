import json

from django.core.management.base import BaseCommand, CommandError

from live.release_preflight import STATUS_FAIL, STATUS_WARN, build_release_preflight_report


class Command(BaseCommand):
    help = "Release oldidan live/attendance konfiguratsiyasini tekshiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Natijani JSON ko'rinishida chiqaradi.",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Warning bo'lsa ham non-zero exit code qaytaradi.",
        )

    def handle(self, *args, **options):
        report = build_release_preflight_report()
        if options["as_json"]:
            self.stdout.write(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            for check in report["checks"]:
                style = self.style.SUCCESS
                prefix = "PASS"
                if check["status"] == STATUS_WARN:
                    style = self.style.WARNING
                    prefix = "WARN"
                elif check["status"] == STATUS_FAIL:
                    style = self.style.ERROR
                    prefix = "FAIL"
                self.stdout.write(style(f"[{prefix}] {check['label']}: {check['message']}"))
                if check.get("details"):
                    self.stdout.write(f"        {json.dumps(check['details'], ensure_ascii=False, sort_keys=True)}")

            summary = report["counts"]
            self.stdout.write(
                f"Summary: pass={summary['pass']} warn={summary['warn']} fail={summary['fail']}"
            )
            self.stdout.write(f"Overall: {report['overall_status'].upper()}")

        if report["counts"][STATUS_FAIL] or (options["strict"] and report["counts"][STATUS_WARN]):
            raise CommandError("Release preflight tekshiruvida muammo topildi.")
