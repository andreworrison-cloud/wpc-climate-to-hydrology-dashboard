# Phase 2B.3 RONI semantic-color hotfix

Surgical correction only.

The live climate JSON identifies ENSO/RONI with `id: "roni"`.
The Phase 2B.3 semantic-color helper mistakenly checked for `roni_enso`,
so the top-left live RONI value retained the default cyan styling even
though the observed RONI history line correctly used the warm-positive palette.

Replace only:
- `assets/js/app.js`

No climate workflow rerun is needed. A normal GitHub Pages redeploy is sufficient.
