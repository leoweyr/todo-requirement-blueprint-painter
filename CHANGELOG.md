# Changelog

All notable changes to this project will be documented in this file.

# [2.3.0](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v2.2.0...v2.3.0) (2026-04-06)
### Features

* **serializer:** preserve source order for statuses, reasons, and nodes across round trips ([24291f5](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/24291f5a4b0153b1f8a1afc514617cb6ce503983)) [@leoweyr](https://github.com/leoweyr)


### Performance

* **layout:** route cross-layer edges through vertical channel gaps ([c4f2c79](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c4f2c79a1822e531422590346974097286358dc8)) [@leoweyr](https://github.com/leoweyr)



# [2.2.0](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v2.1.0...v2.2.0) (2026-04-06)
### Bug Fixes

* **edge-interaction:** prevent URL navigation when selecting edge target node ([fd4a1c0](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/fd4a1c088e2ded058be937999f9199f95c0dd83d)) [@leoweyr](https://github.com/leoweyr)
* start repulsion delay only at non-transition timeline ticks ([ad68a15](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ad68a153abb918bb0a42cc7345762d99fdcb6281)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** refine area-label rendering by avoiding node overlap, removing cursor, and smoothing timeline translate transitions ([01c25ce](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/01c25ceeac49f468ad68f2a42358d8e9b150afee)) [@leoweyr](https://github.com/leoweyr)
* **elements:** ensure version transition tooltip hides after delay by filtering near-tick pseudo transitions ([33b67a0](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/33b67a0df55abd2e56e164045430c4f1430e0579)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** stabilize timeline transitions with anchored sticky grid and waterlike spread animation ([24a9511](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/24a951185e5c64bcd4b402a6c094ac10ddd907c3)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** keep cursor locked to mouse during abrupt drag movement ([11a923d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/11a923d5481a0df92117a264cc739180591a631c)) [@leoweyr](https://github.com/leoweyr)
* **elements:** stop URL hover ghosting by anchoring tooltip above node ([ba99b74](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ba99b74cd3203b5de47a01d98206ae317e5be624)) [@leoweyr](https://github.com/leoweyr)
* lock historical-slice editing and export slice-based save ([5c1d0a7](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/5c1d0a7fff8a4e678a67cacfafb7f8d5c296b23a)) [@leoweyr](https://github.com/leoweyr)


### Features

* **graph:** add SemVer roller animation for node version transitions ([10cd239](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/10cd23924dc9f682e0a2eb78eea5382ed84ab52f)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add metadata-driven territory background ([7ec6e95](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7ec6e95d90791d1043847a144f22264998d20613)) [@leoweyr](https://github.com/leoweyr)


### Performance

* **canvas:** enforce rectangular node influence zones for cleaner territory occupation ([4db3753](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/4db3753cd64e6c0afd54a37e5f7e994760dd3360)) [@leoweyr](https://github.com/leoweyr)


### Refactor

* **canvas:** reorganize canvas components into cohesive subdirectories ([a5b4ef9](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/a5b4ef963ccda89d6043096334c1773accf23523)) [@leoweyr](https://github.com/leoweyr)
* **graph:** reorganize modules into cohesive subdirectories ([1916aaa](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/1916aaadbfed6332671b0fec37ccfa5db2856c9f)) [@leoweyr](https://github.com/leoweyr)


### Styling

* replace loop index abbreviations ([3c831f1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3c831f1290ef5f3396268d14fefe8ae244bef4e9)) [@leoweyr](https://github.com/leoweyr)



# [2.1.0](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v2.0.1...v2.1.0) (2026-04-05)
### Bug Fixes

* **readonly:** hide node metadata panel ([1ed93fe](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/1ed93fe9ad0ba6a9f94f504e2d9c72c9bffeb1ec)) [@leoweyr](https://github.com/leoweyr)
* **elements:** restore node version tooltip on hover in all view modes ([7d05ac9](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7d05ac9dc48941b02e8da78a9579bbc41b300717)) [@leoweyr](https://github.com/leoweyr)
* show spinner overlay when loading blueprint from GitHub route ([f1a906b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f1a906b62475251ac9562f14cddb65c4958b1d43)) [@leoweyr](https://github.com/leoweyr)


### Features

* **elements:** add clickable URL navigation for nodes ([0106c1d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0106c1dd4d5d5779a44fccffee47a367d98bfcb5)) [@leoweyr](https://github.com/leoweyr)
* add blueprint-style background to file-open overlay ([e3ce31e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e3ce31ea84181b31d57e47f7c3274b0aef8b07bf)) [@leoweyr](https://github.com/leoweyr)


### Testing

* **elements:** guard node version hover tooltip regression in edit and read-only modes ([f0a2cde](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f0a2cde797821ee39eb706fdabefe7199cd3d91e)) [@leoweyr](https://github.com/leoweyr)


### DevOps

* add continuous integration workflow ([491a52d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/491a52d7604328abaea09873bb1d0d261d5a01a8)) [@leoweyr](https://github.com/leoweyr)



# [2.0.1](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v2.0.0...v2.0.1) (2026-04-05)
### Bug Fixes

* **node-history:** resolve blueprint path via manifest at each commit ([89afbfa](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/89afbfaee7d582c813f048fcd3c6e6f071f09b24)) [@leoweyr](https://github.com/leoweyr)



# [2.0.0](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v1.1.1...v2.0.0) (2026-04-04)
### License Change: MIT -> Apache-2.0

Starting from this release(v2.0.0), this project is licensed under the Apache License 2.0.

* Previous releases/tags remain under the MIT License.
* Redistributors should preserve LICENSE and NOTICE files as required.


### Bug Fixes

* **serializer:** preserve original TAML anchor names on export ([6675547](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/6675547913ae686d81780cba67d1f454b59411b6)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** remove spa fallback and refine png export rewrite rules ([1be31e8](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/1be31e8f0cb98adc031c7b4347f98593252d602f)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** include source files in serverless function bundle to resolve import errors ([838fe82](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/838fe8212f35d05fb8e0f3b4ccd5433ff9e1e24b)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** improve chromium executable path resolution and launch args for Vercel ([0947a8e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0947a8ea6757fff83494774decb7b81a6f0ad830)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** configure chromium graphics mode and launch options for reliable Vercel execution ([c7a0af5](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c7a0af52a32bc3e2c9dc53d1d01541fa916a650d)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** add diagnostic logging and path validation for chromium executable resolution in Vercel ([24fb20f](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/24fb20f961a16b28a20240550ea7862d11b7036d)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** bundle @sparticuz/chromium ([0e6a1c4](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0e6a1c41e6ca6b7b2468abeb9a02361dbd565c23)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** switch to @sparticuz/chromium-min with remote binary ([5889bf2](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/5889bf2465a1ec962b72569d3927ca6d50a79cdd)) [@leoweyr](https://github.com/leoweyr)
* preserve blueprint filename when loading and exporting ([f85d3fd](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f85d3fd4bee9094be57da3d254f9e7312df22c98)) [@leoweyr](https://github.com/leoweyr)
* **graph:** add edge-node repulsion to prevent edges crossing nodes ([26edb63](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/26edb63cc438c9efa381920decac92fdb7543ca0)) [@leoweyr](https://github.com/leoweyr)
* **graph:** add edge-node repulsion with timeline curvature animation ([21cfa5e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/21cfa5ec10a7421bd88abc242dba98533e2bd66f)) [@leoweyr](https://github.com/leoweyr)
* **graph:** animate layer gap dividers during timeline scrubbing ([06f2898](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/06f2898e2d91fe15b0724ac8bd1e72939429f5ca)) [@leoweyr](https://github.com/leoweyr)
* **graph:** add render-time repulsion for legend-node and node-node overlap ([e5eda69](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e5eda690f57f33f05a5bd27eeae51790fd3b4a7d)) [@leoweyr](https://github.com/leoweyr)
* **github:** apply readonly node interceptor to timeline history frames ([4e6abb1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/4e6abb10bd5b12c3454cfaadba8a3559d25881a2)) [@leoweyr](https://github.com/leoweyr)
* **graph:** skip render repulsion when blueprint has single node ([6c892de](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/6c892de0113b26f41102ee0e895503e4c08df665)) [@leoweyr](https://github.com/leoweyr)


### Features

* **github:** add blueprint entry point to file open modal ([3ec555d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3ec555d7c52c2b88641c960d530b5e7b30311a36)) [@leoweyr](https://github.com/leoweyr)
* **serializer:** format YAML export with proper spacing ([7717aea](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7717aea82c38f58ee0b0e0625a21ac244e7689e1)) [@leoweyr](https://github.com/leoweyr)
* **serializer:** preserve and restore YAML inline comments ([69fb9ea](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/69fb9ea1f3a390fffaeb3a68121d95b0c3ad0aba)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add evolution reason selection to edge creation menu ([97d708a](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/97d708a7e3bf182831698cddcc47ad51f2ada772)) [@leoweyr](https://github.com/leoweyr)
* add url-based blueprint loading and png generation ([d6a8981](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/d6a8981932762573d90f69ecd21988f69465b4f1)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** direct PNG access via url-based blueprint loading ([7839c39](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7839c39e14175b5ddc06558dae3bec6fd2c95a40)) [@leoweyr](https://github.com/leoweyr)
* **readonly:** add read-only view mode with node interceptor support ([de94e4e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/de94e4e695a482f837dbe0481a267735df4c095c)) [@leoweyr](https://github.com/leoweyr)
* **graph:** keep canvas layout centered across timeline slices ([919bf47](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/919bf478310ec0d39fbe1d676c4da4bd7f114269)) [@leoweyr](https://github.com/leoweyr)
* **node-history:** add GitHub commit-based node history playback ([a743d44](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/a743d44d878f61798343f7bb2fbd52b1e18d9fc4)) [@leoweyr](https://github.com/leoweyr)
* **interceptor:** support TypeScript scripts with backward-compatible JavaScript execution ([e27b482](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e27b4828f5a3d0f6fb5b59b55d5d72fe07ad1977)) [@leoweyr](https://github.com/leoweyr)
* add git and spec metadata tags to index html ([9b5a53b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/9b5a53ba5acdef686a36a7776c3ea7d4b48cf427)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add timeline keyboard navigation shortcuts ([306a385](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/306a38570380165fa401e0563271de8be677160b)) [@leoweyr](https://github.com/leoweyr)


### Performance

* **graph:** separate connected components in layout ([c639853](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c639853a1f322dddc0445bd3ee0d2162e0b0dfb4)) [@leoweyr](https://github.com/leoweyr)


### Refactor

* **domain:** consume @todo-requirement-blueprint/domain ([dab4fcd](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/dab4fcd26753a352d82c7cc97bb02993d72e9aca)) [@leoweyr](https://github.com/leoweyr)
* split serializer and extract registry ([d4d69a5](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/d4d69a53c034526e6c03585a8c97049cd79f3088)) [@leoweyr](https://github.com/leoweyr)
* consume @todo-requirement-blueprint/engine ([f32ade1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f32ade1822675358d13de389efa9a7ae474e7cef)) [@leoweyr](https://github.com/leoweyr)
* extract timeline graph projection and repulsion orchestration ([b9b4f04](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b9b4f04e37488a887cf39cac13f04a9968c32d46)) [@leoweyr](https://github.com/leoweyr)


### DevOps

* **ssr:** bundle serverless function with esbuild to fix Vercel function deployment ([6df82d8](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/6df82d8ccc8e8b92e8166f5d0eb001f76f886f45)) [@leoweyr](https://github.com/leoweyr)
* **deploy-vercel:** pre-build ssr bundle before Vercel build to resolve function path error ([18cfcd1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/18cfcd1314a3e27d8e3cfd7286419ab91fd7f5ec)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** use CommonJS format for bundle ([7bfd869](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7bfd869d0eae58bff0b3edd71e9d8af120ed173b)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** use `.cjs` extension for CommonJS bundle ([f68b3c0](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f68b3c0885514936a705b5718e6c7b42497beaa0)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** pin puppeteer-core version for Chromium compatibility ([7f7e7e7](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7f7e7e7ba10a78554e19a15733f915b15176b5e7)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** include chromium-min and puppeteer-core in function bundle ([9ee9f6b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/9ee9f6bedd07099a48f68f7e702590846c3d7c76)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** use CommonJS format with dedicated api/package.json ([8bc05e2](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/8bc05e23b48b71e1325c14c3085f349eda4bcc47)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** bundle puppeteer-core and chromium-min to lock versions ([b1ab566](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b1ab566c3f3edd341307ac58c68c66fab7d835eb)) [@leoweyr](https://github.com/leoweyr)
* **ssr:** detect Vercel environment via VERCEL env var ([b0427d0](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b0427d05c6bae8505c813e52ffdd9030490713ea)) [@leoweyr](https://github.com/leoweyr)
* **publish-release:** support bump TRB project node version ([0d20580](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0d2058038e2ddc257c1092942eef8c37bbb5e0f1)) [@leoweyr](https://github.com/leoweyr)


### Documentation

* add route-based access ([19d7438](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/19d743894c50f5536544270ed1b7af2025f4fe66)) [@leoweyr](https://github.com/leoweyr)


### Miscellaneous Tasks

* **ssr:** remove diagnostic logging from browser service ([3791644](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/37916448d593479a748fcb9751c912765eca0e46)) [@leoweyr](https://github.com/leoweyr)
* **license:** migrate project license from MIT to Apache-2.0 ([3912161](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3912161d9c57d8300e421996045f8a9e18fa713c)) [@leoweyr](https://github.com/leoweyr)



# [1.1.1](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v1.1.0...v1.1.1) (2026-03-21)
### Bug Fixes

* disable paste shortcut listener until blueprint is loaded ([e8728a3](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e8728a3f8da3ba91208dbbfad387b3e66ea1e0bd)) [@leoweyr](https://github.com/leoweyr)
* prevent blueprint paste when modals open ([2f6ff62](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2f6ff6271f64b6fb11d66ca4e28fbd7fac370948)) [@leoweyr](https://github.com/leoweyr)
* **serializer:** correct 'v' prefix for TRB schema version in exported file ([0d9c1b1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0d9c1b1378d3cc94e40ed92ccd689a44b5eafc42)) [@leoweyr](https://github.com/leoweyr)


### DevOps

* use leoweyr/github-release-workflow for release automation ([2e44aff](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2e44aff420e97d1a674c1f546fd5d1cc7590ce3a)) [@leoweyr](https://github.com/leoweyr)


### Revert

* **fix:serializer:** correct TRB protocol schema URL in exported blueprint ([3a9654a](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3a9654a1544b91215b47704135cb006de21b9596)) [@leoweyr](https://github.com/leoweyr)


### Miscellaneous Tasks

* add blank line separation between changelog sections ([bacb350](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/bacb35000d7fedd608d9eb4d085cc560c7f035b4)) [@leoweyr](https://github.com/leoweyr)




# [1.1.0](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v1.0.0...v1.1.0) (2026-03-10)

### Features

* update app icon to semantic TRB design and refine index.html ([ab4fc22](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ab4fc225552c3e357868b881d81fdbcfb1320e8f)) [@leoweyr](https://github.com/leoweyr)

### DevOps

* fix git-cliff change log generation by adding `--latest` flag ([b30ff8b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b30ff8b0cb9414d5b3a240643016844dfc4d6591)) [@leoweyr](https://github.com/leoweyr)

### Documentation

* add project banner ([0cc7073](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0cc7073c875613e8c816a315cc603892c701cffa)) [@leoweyr](https://github.com/leoweyr)


# [1.0.0] (2026-03-10)

### Bug Fixes

* **graph:** prevent edge labels from being obscured by nodes in cross-layer layouts ([ef122dc](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ef122dc9883fc52b74abfa64826661cdbd8666a7)) [@leoweyr](https://github.com/leoweyr)
* **elements:** add background container to edge version tooltip to improve readability ([04a85df](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/04a85dfc51f371d3efb3758c7722f790473915e8)) [@leoweyr](https://github.com/leoweyr)
* ensure exported YAML files include the TRB version classification header ([5cd8e14](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/5cd8e142f7000cf8b2ea705b7982149f50b48e57)) [@leoweyr](https://github.com/leoweyr)
* **graph:** implement line repulsion to resolve overlapping edges ([2cec89d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2cec89dbc240ef015b331b8191a3e20288cccb47)) [@leoweyr](https://github.com/leoweyr)
* **graph:** exclude CUT edges from layout dependency calculation ([255bb34](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/255bb34d5386d3d92ec7fa4655e7d65d55e839f5)) [@leoweyr](https://github.com/leoweyr)
* auto-center viewport after layout updates ([83bb754](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/83bb754e355fac574b7b02d08a46590e299f6060)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** auto-center view on window resize in standard mode ([4fad82e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/4fad82eb899ec002f3821761841e6fe8b8bf8ed6)) [@leoweyr](https://github.com/leoweyr)
* **domain:** allow optional 'v' prefix in semantic version validation ([8cd04ad](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/8cd04ad34afcffa6c85a0217025e967023998deb)) [@leoweyr](https://github.com/leoweyr)
* ensure modal input placeholders reflect TRB schema descriptions ([98a2b96](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/98a2b96dcdc21e49102b288802fa29adf528f49b)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** disable editing of system `CUT` status ([9371a46](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/9371a467b77ada0d38c652b84ee30df74cde5632)) [@leoweyr](https://github.com/leoweyr)

### Features

* implement TRB specification domain model ([b14d334](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b14d334e2da47634a7ad5bc972a1ceaed05f5205)) [@leoweyr](https://github.com/leoweyr)
* add validation logic to Node entity and introduce ValidationError exception ([7d2a2f2](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7d2a2f2012a6a59dd67f04a63e2692d3666bd79d)) [@leoweyr](https://github.com/leoweyr)
* add id format validation to Edge entity ([0be1104](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0be1104fd51fdb48c8d4d03c408a5f8ee3ef4b5e)) [@leoweyr](https://github.com/leoweyr)
* add domain registry for managing domain object lifecycle and identity ([28d4646](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/28d4646d63cb3b6ecc1423e890dbea2815cea799)) [@leoweyr](https://github.com/leoweyr)
* **registry:** implement support for NodeStatus and EdgeEvolutionReason ([41da6d1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/41da6d1d6e578560d81d804d5d0d6d1a68cf95b6)) [@leoweyr](https://github.com/leoweyr)
* **serializer:** implement TRB YAML serialization and deserialization with strict schema compliance ([7892a49](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7892a49a030331447a5d4a5ca24caa72fb8acfd0)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add infinite canvas ([b63b708](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b63b708af44fb405ec44363bb8b1a5eb0ad860d2)) [@leoweyr](https://github.com/leoweyr)
* **elements:** add component for visualizing domain nodes ([58ae42b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/58ae42ba18b531baa2eb38077c5ee4a2e3e075e8)) [@leoweyr](https://github.com/leoweyr)
* **elements:** add component for visualizing domain edges ([040943a](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/040943a30e63eeea52ae28f5b95db0733d89f167)) [@leoweyr](https://github.com/leoweyr)
* **elements:** encapsulate coordinate props within node rectangle component ([0aacc1d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0aacc1d516ec9370a4af9e6fbfc426eee0b7d743)) [@leoweyr](https://github.com/leoweyr)
* **domain:** enforce upper snake case validation for user defined enum names ([d5c2713](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/d5c2713154e922bccb34f45987a9410bce0cccca)) [@leoweyr](https://github.com/leoweyr)
* **graph:** add blueprint prerender comb for graph layout calculation ([7ac1e3f](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7ac1e3f18c57065cf9c219803a35b6761ac954c5)) [@leoweyr](https://github.com/leoweyr)
* **prompts:** add component for importing blueprints ([38f8f4f](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/38f8f4f87705fe078b4521c6003ef247dcdd89ff)) [@leoweyr](https://github.com/leoweyr)
* implement blueprint loading workflow and remove demo data ([4cff54d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/4cff54db0d8546a5c1382fb73c180844d01a5514)) [@leoweyr](https://github.com/leoweyr)
* **graph:** optimize layout with centered layers and fixed node dimensions ([f9b6761](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f9b6761ea98322486c8edb3cbd19c1f8191b7fa7)) [@leoweyr](https://github.com/leoweyr)
* **graph:** implement barycenter heuristic for optimized vertical node layout ([10efd0e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/10efd0e80a43145fbcc44b60194e7bd4a39a4a0b)) [@leoweyr](https://github.com/leoweyr)
* **graph:** enhance layout with dynamic layer spacing based on edge text length ([bbe42ce](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/bbe42cead699f4a226e4a7a137bb0f774573d432)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add vertical dividers between graph layers ([55b17ff](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/55b17ffd610acb0d852a48c15844ce6db5f5ff21)) [@leoweyr](https://github.com/leoweyr)
* **elements:** add version tooltips to nodes and edges ([42b6c33](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/42b6c337d8e3c8acb695d390e86236bae55deb16)) [@leoweyr](https://github.com/leoweyr)
* **elements:** support displaying node metadata ([8902ce9](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/8902ce999767bda966d4ce249ff63ef2b1660f9e)) [@leoweyr](https://github.com/leoweyr)
* **elements:** add hover highlight effect and z-index elevation to edge lines ([cd723c4](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/cd723c47f0362b66bd3834a7d12f984ce6387622)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add component for displaying list of actions on right-click ([e30f92b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e30f92b124d148b587db76b725fcbc30943bf6df)) [@leoweyr](https://github.com/leoweyr)
* implement right-click context menu with save blueprint functionality ([0878a94](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0878a94d27f3c0fee5691b895694e04f25065370)) [@leoweyr](https://github.com/leoweyr)
* add blueprint pasting from clipboard with merge support ([6d87245](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/6d8724598e581bb0d48dc79d47bade5cccd003c0)) [@leoweyr](https://github.com/leoweyr)
* add keyboard shortcut support for pasting blueprint content ([2d9d7cd](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2d9d7cd728f5de5b7b62a6882d6cae87508d7241)) [@leoweyr](https://github.com/leoweyr)
* **elements:** add visual styles for edge types and statuses ([1877805](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/187780582b2de811a77124d9387b2f8434ec2bb8)) [@leoweyr](https://github.com/leoweyr)
* support create new empty blueprint ([4b1e0af](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/4b1e0aff7e8b92d7290bf80d50b400b6eca62c31)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add node creation ([0c0cdfb](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0c0cdfbcc916aeeb20803f812b3106e51009368b)) [@leoweyr](https://github.com/leoweyr)
* add metadata support to user-defined enums for TRB v1.1.0 ([5182763](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/518276361e30e34450bb625a421092b7bda6e20a)) [@leoweyr](https://github.com/leoweyr)
* add ability to create new node statuses via context menu ([b7bd644](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b7bd6443bc26dde4968a3b87a3423c1b0749f18e)) [@leoweyr](https://github.com/leoweyr)
* **menus:** use TRB schema descriptions for input placeholders in creation modals ([dc08f78](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/dc08f78ce1fda5548da250ad1c3f2561a0a46bd9)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add color selection support for node status creation ([a433c9b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/a433c9b8989a03a0b27351908b910c1950982cd7)) [@leoweyr](https://github.com/leoweyr)
* **elements:** support custom status colors from node status metadata ([b0828ed](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/b0828ed4e2c1cf79f510c607df84286522586004)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add component to display node status indicators ([846e2a1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/846e2a1679c45d97cc5dcfc03a86c865530d3e9b)) [@leoweyr](https://github.com/leoweyr)
* implement interactive edge creation via node hover button and drag-to-connect workflow ([f80f4a3](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f80f4a3f9a55e5eb2514205d1127201e01e4473f)) [@leoweyr](https://github.com/leoweyr)
* implement interactive edge cutting and evolution ([f4dce40](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/f4dce4051c6d5a1d77b11f28a2636e2822088727)) [@leoweyr](https://github.com/leoweyr)
* **menu:** add delete node context menu ([ea2aa28](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ea2aa287f8c9a234880525f4bb49afde46995cb8)) [@leoweyr](https://github.com/leoweyr)
* **menu:** add delete context menu for node statuses ([261452c](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/261452cc95009618e3fed1b3c68306206949d7a8)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add edit option to node status context menu ([c448207](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c4482076319987ad9ee40ab407ddf514a64f821d)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add edit option to node context menu ([83480ad](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/83480ad8ff609cf6caa6b87270b2527dc68cee9d)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add interactive edge evolution timeline ([3b74683](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3b74683b711e6c743b3502b398f6b5b37a61589d)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add CRUD and legend support for edge evolution reasons ([cd10b78](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/cd10b786d82f1640d42f75cdce831e236bc13350)) [@leoweyr](https://github.com/leoweyr)
* dynamic edge evolution highlighting and legend enhancement ([8b7658b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/8b7658b5637cc4d64fde690236aed3ce85c46049)) [@leoweyr](https://github.com/leoweyr)
* **elements:** enhance edge line to support dynamic node binding ([d776828](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/d7768287a63384e69832627038259c31cdb639ec)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** add smooth node interpolation during timeline scrubbing ([e2a5770](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e2a577081eb2f15b07aab6967f1ed55230291cdf)) [@leoweyr](https://github.com/leoweyr)
* **menus:** add color picker for node status and edge evolution setting ([ce2a99b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ce2a99b8563f18580005bb78c242cdef4519ff41)) [@leoweyr](https://github.com/leoweyr)
* **editor-history:** add undo/redo system with state snapshotting ([2850b68](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2850b680af692021e9f7864a82f3bbb390b51101)) [@leoweyr](https://github.com/leoweyr)

### Refactor

* **domain:** remove edges from Node constructor to enforce explicit addition via method ([5f35416](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/5f3541659d034de439b29a4b2d5a700d3e21b47b)) [@leoweyr](https://github.com/leoweyr)
* **menus:** decouple and encapsulate context menu logic ([fbbfce2](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/fbbfce250527a30a6ba57a3f0f70bffb9c3b746b)) [@leoweyr](https://github.com/leoweyr)
* **menus:** encapsulate file loading and creation logic within file open modal ([c1f281e](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c1f281e6c7cd581a8c8237ed0f3630ab89db72da)) [@leoweyr](https://github.com/leoweyr)
* **menus:** extract blueprint saving logic ([c544916](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c544916ee9cda3c8ae146493c1304d6745c8e9b3)) [@leoweyr](https://github.com/leoweyr)
* **menus:** extract blueprint pasting logic ([154975f](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/154975f6e82f6f15b414f7fc70ecbfa186c93a0b)) [@leoweyr](https://github.com/leoweyr)
* **menus:** extract add node creation ([43f715d](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/43f715dc024210930016860a65371a9bc44b66c3)) [@leoweyr](https://github.com/leoweyr)
* **menus:** reorganize by functional feature ([3cb5c5a](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3cb5c5a38a9ec0920e866f1821ce1f6e3a59c1ba)) [@leoweyr](https://github.com/leoweyr)
* **canvas:** extract edge drawing logic ([8a26c27](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/8a26c27edc962568d394152a6a13165481c77cd0)) [@leoweyr](https://github.com/leoweyr)
* **edge-create:** centralize edge connection logic ([5c915e4](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/5c915e458244b3598086e454026fdf1ecf53d4ad)) [@leoweyr](https://github.com/leoweyr)
* **menus:** extract edge evolution logic ([786c2fe](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/786c2fe775187705b495280a8cc43670effd040c)) [@leoweyr](https://github.com/leoweyr)
* **menus:** extract menu and modal management to menu manager ([426ad16](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/426ad166dffc3471ad5601c4d1eaee6507bb8126)) [@leoweyr](https://github.com/leoweyr)
* **menus:** restructure components ([409de47](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/409de47dc7bb0f40c66f88e3c1e7ddbb672099af)) [@leoweyr](https://github.com/leoweyr)
* **edge-interaction:** consolidate edge evolution editing logic ([a68bc9b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/a68bc9ba4148928bae6ac732a0bd00196485fa85)) [@leoweyr](https://github.com/leoweyr)

### DevOps

* add Vercel deployment workflow ([ad747cf](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ad747cf729b3ba79617df2f18f481e2c55a4a958)) [@leoweyr](https://github.com/leoweyr)
* sync package-lock.json with package.json to resolve npm ci error ([9719740](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/9719740ee9920221a61623ca7a964442b3c14bf9)) [@leoweyr](https://github.com/leoweyr)
* use `npm install` instead of `npm ci` to resolve cross-platform rollup dependency issues ([70b5140](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/70b514054a9f1c294f24ab2404a1cfb74bb9392f)) [@leoweyr](https://github.com/leoweyr)
* bypass package-lock.json to ensure correct Linux binaries are installed ([c2550ba](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/c2550bad4d1f5af485d8c01ecfeacc43ef5911ec)) [@leoweyr](https://github.com/leoweyr)
* disable npm caching in setup-node to prevent lockfile validation errors ([7ea03b3](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/7ea03b31d63659704e228693755645f14e0aa827)) [@leoweyr](https://github.com/leoweyr)
* add workflow to prepare releases with automated changelog generation ([2ea3e5b](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2ea3e5b2e8583f6af38dead6182922c6469806f2)) [@leoweyr](https://github.com/leoweyr)
* add workflow to automate GitHub Release creation using PR content ([ebc2a02](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/ebc2a0275c288aec27696391c7bd9b6fefe8a317)) [@leoweyr](https://github.com/leoweyr)
* strip header, footer and version title from release PR body ([96802db](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/96802db0a45251dfdc5b45e6136e7b6c3a154874)) [@leoweyr](https://github.com/leoweyr)
* replace failing git-cliff-action with `npx git-cliff` to resolve docker build errors ([95cf876](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/95cf8766f8d8fa3be44cd6fdb15e1fa4cca3f8f8)) [@leoweyr](https://github.com/leoweyr)

### Documentation

* add MIT License ([74755bd](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/74755bd76d8b65c1eac882bfc916e22e3c945316)) [@leoweyr](https://github.com/leoweyr)

### Miscellaneous Tasks

* add git-cliff for change log ([d4b61f5](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/d4b61f56d5dea1a0ff37c86cd6d7a444d5a2f6c0)) [@leoweyr](https://github.com/leoweyr)

<!-- Generated by git-cliff. -->
