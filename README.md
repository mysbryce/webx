# WebX 5M

![WebX 5M logo](docs/public/webx-logo.svg)

WebX 5M is a lightweight vanilla ES module UI framework and FiveM NUI boilerplate. It gives you component files, reactive state, template bindings, scoped CSS, stores, lifecycle hooks, and CFX/NUI helpers without a build step for the runtime UI.

## Features

- Component-based UI with `app.js`, `template.html`, and optional `style.css`
- Text interpolation with `{{ expression }}`
- Event and action bindings with `@click`, `@keyup.enter`, and modifiers
- JavaScript bindings with `:title`, `:show`, `:class`, `:style`, `:ref`, and more
- Two-way form state with `sync`
- Reactive `data`, `props`, and stores powered by `Proxy`
- `watch` support for data, props, and store values
- Props validation with Zod and an in-page error overlay
- Control flow with `<for>`, `<if>`, `<elseif>`, and `<else>`
- Scoped CSS with class name rewriting
- `onMounted` and `onUnmounted` lifecycle hooks
- `onCfx` and `cfx.call` helpers for FiveM NUI messages and callbacks

## Create a Project

```bash
bunx webx-5m create my-app
```

This clones the WebX template, removes the template `.git` folder, and installs dependencies when a `package.json` is found.

To create the files without installing dependencies:

```bash
bunx webx-5m create my-app --no-install
```

## Generate `webx.json`

After adding or removing components in `web/components`, run:

```bash
bunx webx-5m generate
```

The command scans component folders that contain both `app.js` and `template.html`, then updates `web/webx.json`.

Choose the main component manually:

```bash
bunx webx-5m generate --main home
```

## Project Structure

```txt
web/
  index.html
  webx.json
  components/
    home/
      app.js
      template.html
      style.css
  directives/
    index.js
  stores/
    appStore.js
  wbx/
    app.js
    core/
```

## Component Example

`web/components/counter/app.js`

```js
import z from 'zod'

export default {
  template: 'Counter',
  props: {
    title: z.string()
  },
  data: {
    count: 0
  },
  method: {
    increment() {
      this.data.count++
    }
  },
  watch: {
    count(value, previousValue) {
      console.log('count changed:', previousValue, value)
    }
  }
}
```

`web/components/counter/template.html`

```html
<template>
  <div class="counter">
    <h1>{{ title }}</h1>
    <p>{{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

## FiveM NUI

Receive dynamic NUI messages with `onCfx`:

```js
import z from 'zod'

export default {
  onCfx: {
    'app:updateTitle': {
      schema: z.string(),
      handler(title) {
        this.data.name = title
      }
    }
  }
}
```

Call a NUI callback with `cfx.call`:

```js
const response = await this.cfx.call('counter:getValue', {
  count: this.data.count
}, {
  ok: true,
  value: this.data.count
})
```

The third argument is mock data for browser development.

## Documentation

The documentation app lives in `docs` and is built with Next.js and Fumadocs.

```bash
cd docs
npm run dev
```

Open `http://localhost:3000/docs`.

## License

GPL-3.0-only
