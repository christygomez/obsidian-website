import { Application, Router } from './serverDeps.ts';
import { React, ReactDomServer } from './deps.ts';
import App from './client/app.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';

const PORT = 3000;

// Create a new server
const app = new Application();

// Track response time in headers of responses
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get('X-Response-Time');
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set('X-Response-Time', `${ms}ms`);
});

// Router for base path
const router = new Router();

router.get('/', handlePage);

// Bundle the client-side code
const { files, diagnostics } = await Deno.emit('./client/client.tsx', {
  bundle: 'esm',
});

// Router for bundle
const serverrouter = new Router();
serverrouter.get('/static/client.js', (context) => {
  context.response.headers.set('Content-Type', 'text/html');
  context.response.body = files['deno:///bundle.js'];
});

// Implement the routes on the server
app.use(staticFileMiddleware);
app.use(router.routes());
app.use(serverrouter.routes());
app.use(router.allowedMethods());

app.addEventListener('listen', () => {
  console.log(`Listening at http://localhost:${PORT}`);
});

if (import.meta.main) {
  await app.listen({ port: PORT });
}

export { app };

function handlePage(ctx: any) {
  try {
    const body = (ReactDomServer as any).renderToString(<App />);
    ctx.response.body = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">

    <link rel="icon" type="image/png" href="/static/obsidianLogo3.png"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    <link href="/static/prism.css" rel="stylesheet" />
    <link rel="stylesheet" href="/static/style.css">
    <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
    />
    <title>Obsidian</title>
  </head>
  <body >
    <div id="root">${body}</div>

    <script  src="/static/client.js" defer></script>
  </body>
  </html>`;
  } catch (error) {
    console.error(error);
  }
}
