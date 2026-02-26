# i18n Localization Guide

## Canonical locale files
- `uz.json`
- `en.json`
- `ru.json`

Only these 3 files are active translation sources.

## Key naming
- Use dot notation by feature/domain.
- Prefer stable semantic keys, not literal sentence keys.
- Keep keys compatible with existing `t("...")` usage where possible.

Examples:
- `nav.dashboard`
- `live.errors.notFound`
- `demo.showcase.actions.success`

## Adding new text
1. Add a new key in `uz.json`.
2. Add the exact same key in `en.json` and `ru.json`.
3. Keep placeholders identical across all languages.

Placeholder example:
- `retryingSubmit: "Retrying submit (attempt {{attempt}})..."`.

## Validation
- Run locale/code audit:

```bash
npm run i18n:audit
```

- Run production build smoke check:

```bash
npm run build
```
