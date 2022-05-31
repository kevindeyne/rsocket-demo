const {
    RSocketConnector,
    JsonSerializer,
    IdentitySerializer
} = require('rsocket-core');
const { WebsocketClientTransport } = require("rsocket-websocket-client"); //.default
let client = undefined;
let rsocket = undefined;

function addErrorMessage(prefix, error) {
    var ul = document.getElementById("messages");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(prefix + error));
    ul.appendChild(li);
}

function addMessage(message) {
    var ul = document.getElementById("messages");

    var li = document.createElement("li");
    li.appendChild(document.createTextNode(JSON.stringify(message)));
    ul.appendChild(li);
}

async function main() {
    if (rsocket !== undefined) {
        rsocket.close();
        document.getElementById("messages").innerHTML = "";
    }

    // Create an instance of a client
    client = new RSocketConnector({
        serializers: {
            data: JsonSerializer,
            metadata: IdentitySerializer
        },
        setup: {
            // ms btw sending keepalive to server
            keepAlive: 60000,
            // ms timeout if no keepalive response
            lifetime: 180000,
            // format of `data`
            dataMimeType: 'application/json',
            // format of `metadata`
            metadataMimeType: 'message/x.rsocket.routing.v0',
        },
        transport: new WebsocketClientTransport({
            url: 'ws://localhost:7000/tweetsocket'
        }),
    });

    rsocket = await client.connect();
    await new Promise((resolve, reject) =>
    {
        let payloadData = { author: document.getElementById("author-filter").value };
        // socket provides the rsocket interactions fire/forget, request/response,
        // request/stream, etc as well as methods to close the socket.
        const requester = rsocket.requestStream(
            {
                data: Buffer.from(JSON.stringify(payloadData)),
                metadata: Buffer.from(String.fromCharCode('tweets.by.author'.length) + 'tweets.by.author'),
            },
            1,
            {
                onError: error => {
                    console.log(error);
                    addErrorMessage("Connection has been closed due to ", error);
                },
                onNext: payload => {
                    console.log(payload.data.toString());
                    addMessage(JSON.parse(payload.data.toString()));
                    requester.request(1);
                },
                onSubscribe: subscription => {
                    subscription.request(2147483647);
                }
            });
    });
}

document.addEventListener('DOMContentLoaded', main);
document.getElementById('author-filter').addEventListener('change', main);