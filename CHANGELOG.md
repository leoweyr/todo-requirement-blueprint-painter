# Changelog

All notable changes to this project will be documented in this file.

# [1.1.1](https://github.com/leoweyr/todo-requirement-blueprint-painter/compare/v1.1.0...v1.1.1) (2026-03-21)
### Bug Fixes

* disable paste shortcut listener until blueprint is loaded ([e8728a3](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/e8728a3f8da3ba91208dbbfad387b3e66ea1e0bd)) [@leoweyr](https://github.com/leoweyr)
* **serializer:** correct TRB protocol schema URL in exported blueprint ([3a9654a](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/3a9654a1544b91215b47704135cb006de21b9596)) [@leoweyr](https://github.com/leoweyr)
* prevent blueprint paste when modals open ([2f6ff62](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2f6ff6271f64b6fb11d66ca4e28fbd7fac370948)) [@leoweyr](https://github.com/leoweyr)
* **serializer:** correct 'v' prefix for TRB schema version in exported file ([0d9c1b1](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/0d9c1b1378d3cc94e40ed92ccd689a44b5eafc42)) [@leoweyr](https://github.com/leoweyr)


### DevOps

* use leoweyr/github-release-workflow for release automation ([2e44aff](https://github.com/leoweyr/todo-requirement-blueprint-painter/commit/2e44aff420e97d1a674c1f546fd5d1cc7590ce3a)) [@leoweyr](https://github.com/leoweyr)


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
