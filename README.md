# CV – Daniele Porcaro

Personal CV website built with [Astro](https://astro.build) and Tailwind CSS, published on GitHub Pages: <https://cv.retenasa.dev>

## Development

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321` |
| `npm run build`   | Build the site into `./dist/`               |
| `npm run preview` | Preview the production build                |
| `npm run pdf`     | Regenerate the CV PDF (uses Puppeteer)      |

Personal data lives in `src/data/cv.ts`. Pushing to `main` deploys via GitHub Actions.

## License

The code is released under the [MIT license](LICENSE). Personal content (texts, photos, CV PDF), third-party certificates and logos are **not** covered: all rights reserved. To reuse the template, replace them with your own. Details and privacy information: [/privacy](https://cv.retenasa.dev/privacy/).
