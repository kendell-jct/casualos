import { TunnelClient } from '../TunnelClient';
import { Observable, Observer } from 'rxjs';
import { TunnelMessage } from '../TunnelResponse';
import {
    TunnelRequest,
    ForwardTunnelRequest,
    ReverseTunnelRequest,
} from '../ClientTunnelRequest';
import WebSocket from 'ws';
import { createServer, connect } from 'net';
import { wrap } from './WebSocket';

export class WebSocketClient implements TunnelClient {
    private _host: string;

    constructor(host: string) {
        this._host = host;
    }

    open(request: TunnelRequest): Observable<TunnelMessage> {
        if (request.direction === 'forward') {
            return forwardRequest(request, this._host);
        } else {
            return reverseRequest(request, this._host);
        }
    }
}

function reverseRequest(
    request: ReverseTunnelRequest,
    host: string
): Observable<TunnelMessage> {
    return Observable.create((observer: Observer<TunnelMessage>) => {
        console.log('Create');
        let url = new URL('/reverse', host);
        url.search = `port=${encodeURIComponent(
            request.remotePort.toString()
        )}`;

        const ws = new WebSocket(url.href, {
            headers: {
                Authorization: 'Bearer ' + request.token,
            },
        });

        ws.on('message', data => {
            if (typeof data === 'string') {
                if (data.startsWith('NewConnection:')) {
                    const id = data.substring('NewConnection:'.length);
                    console.log('New Connection!', id);

                    let url = new URL('/connect', host);
                    url.search = `id=${encodeURIComponent(id)}`;

                    const tcp = connect(
                        {
                            host: request.localHost,
                            port: request.localPort,
                        },
                        () => {
                            const client = new WebSocket(url.href, {
                                headers: {
                                    Authorization: 'Bearer ' + request.token,
                                },
                            });

                            client.on('open', () => {
                                const stream = wrap(client);
                                tcp.pipe(stream).pipe(tcp);
                                observer.next({
                                    type: 'connected',
                                });
                            });

                            client.on('error', err => {
                                observer.error(err);
                                tcp.destroy();
                                client.close();
                            });
                        }
                    );

                    tcp.on('error', err => {
                        observer.error(err);
                        tcp.destroy();
                    });
                }
            }
        });
    });
}

function forwardRequest(
    request: ForwardTunnelRequest,
    host: string
): Observable<TunnelMessage> {
    return Observable.create((observer: Observer<TunnelMessage>) => {
        console.log('Create');
        let url = new URL('/forward', host);
        url.search = `host=${encodeURIComponent(
            request.remoteHost
        )}&port=${encodeURIComponent(request.remotePort.toString())}`;

        const server = createServer(c => {
            console.log('[WSC] Recieved connection!');
            const ws = new WebSocket(url.href, {
                headers: {
                    Authorization: 'Bearer ' + request.token,
                },
            });

            ws.on('open', () => {
                const wsStream = wrap(ws);
                wsStream.on('error', err => {
                    c.destroy();
                    observer.error(err);
                });
                wsStream.pipe(c).pipe(wsStream);
                observer.next({
                    type: 'connected',
                });
            });

            ws.on('close', () => {
                c.destroy();
                observer.complete();
            });

            ws.on('error', err => {
                c.destroy();
                observer.error(err);
            });

            c.on('error', err => {
                ws.close();
                observer.error(err);
            });
        });

        server.listen(request.localPort);
        console.log(
            '[WSC] Waiting for connections to ' + request.localPort + '...'
        );

        server.on('error', err => {
            observer.error(err);
        });
    });
}