import express from 'express';

const app = express();
app.use(express.json());

app.get('/status', (request, response) => response.json({clients: clients.length}));

const PORT = 3000;

const clients = {};


app.listen(PORT, () => {
  console.log(`Facts Events service listening at http://localhost:${PORT}`)
})

/**
 *
 * @param {import ('express').Request} request
 * @returns
 */
async function whoami(request) {
  // FIXME: get the cookies, have a request to the API
  // and get back the user id
  console.log(request.url)
  const s = request.url.indexOf('?');
  const sp = new URLSearchParams(request.url.substr(s));
  const id = sp.get('id')
  return parseInt(id);
}

/**
 *
 * @param {import ('express').Request} request
 * @param {import ('express').Response} response
 * @param {*} next
 */
async function eventsHandler(request, response, next) {
  const id = await whoami(request)
  if (!Number.isFinite(id)) {
    response.status('403').end();
    return;
  }

  // we ask the client to do the keep-alive
  // that may be too optimistic
  // in that case we should send a comment as data from time to time
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(200, headers);

  const data = `data: Subscribed as ${id}\n\n`;
  response.write(data);

  const currClients = clients[id] || [];
  clients[id] = currClients;
  currClients.push({request, response})

  request.on('close', () => {
    console.log(`${id} Connection closed`);
    // removing only this request object from the known ones for this user
    clients[id] = clients[id].filter(client => client.request !== request);
  });
}

app.get('/events', eventsHandler);



function sendEventsToAll(newFact) {
  const myclients = clients[newFact.id]
  myclients.forEach(client => client.response.write(`data: ${JSON.stringify(newFact)}\n\n`))
}

async function addFact(request, response, next) {
  const newFact = request.body;
  console.log(newFact)
  response.json(newFact)
  return sendEventsToAll(newFact);
}

app.post('/fact', addFact);
