# Víctor García

Static portfolio for [apps.vgarciaf.com](https://apps.vgarciaf.com).

## Build

`index.html` is generated from `templates/index.html` and the JSON files in `data/`, then committed to the repository. Regenerate it after any content change:

```sh
python scripts/build.py
```

Serve the result locally:

```sh
python -m http.server 4173 --bind 127.0.0.1
```
