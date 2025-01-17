import { RedisClient } from 'redis';
import { promisify } from 'util';
import {
    ApiaryConnectionStore,
    DeviceConnection,
    DeviceNamespaceConnection,
} from '@casual-simulation/casual-apiary';

/**
 * Defines a class that specifies a Redis implementation of an ApiaryAtomStore.
 */
export class RedisConnectionStore implements ApiaryConnectionStore {
    private _globalNamespace: string;
    private _redis: RedisClient;

    private hset: (args: [string, ...string[]]) => Promise<string[]>;
    private hdel: (args: [string, ...string[]]) => Promise<void>;
    private hlen: (key: string) => Promise<number>;
    private hvals: (key: string) => Promise<string[]>;
    private hkeys: (key: string) => Promise<string[]>;
    private hget: (key: string, field: string) => Promise<string>;
    private get: (key: string) => Promise<string>;
    private set: (key: string, value: any) => Promise<void>;
    private del: (key: string) => Promise<void>;
    private expire: (key: string, seconds: number) => Promise<void>;

    constructor(globalNamespace: string, client: RedisClient) {
        this._globalNamespace = globalNamespace;
        this._redis = client;

        this.del = promisify(this._redis.del).bind(this._redis);
        this.hset = promisify(this._redis.hset).bind(this._redis);
        this.hdel = promisify(this._redis.hdel).bind(this._redis);
        this.hvals = promisify(this._redis.hvals).bind(this._redis);
        this.hkeys = promisify(this._redis.hkeys).bind(this._redis);
        this.hlen = promisify(this._redis.hlen).bind(this._redis);
        this.hget = promisify(this._redis.hget).bind(this._redis);
        this.expire = promisify(this._redis.expire).bind(this._redis);
        this.get = promisify(this._redis.get).bind(this._redis);
        this.set = promisify(this._redis.set).bind(this._redis);
    }

    // /{global}/connections
    //    - connnection1
    //    - connnection2
    // /{global}/namespace_connections/{namespace}
    //    - connection1
    // /{global}/connections/{connection}
    //    - namespace1

    async saveConnection(connection: DeviceConnection): Promise<void> {
        await this.hset([
            connectionsKey(this._globalNamespace),
            connection.connectionId,
            JSON.stringify(connection),
        ]);
    }

    async saveNamespaceConnection(
        connection: DeviceNamespaceConnection
    ): Promise<void> {
        const connectionJson = JSON.stringify(connection);
        await this.hset([
            namespaceConnectionsKey(
                this._globalNamespace,
                connection.namespace
            ),
            connection.connectionId,
            connectionJson,
        ]);
        await this.hset([
            connectionIdKey(this._globalNamespace, connection.connectionId),
            connection.namespace,
            connectionJson,
        ]);
    }

    async deleteNamespaceConnection(
        connectionId: string,
        namespace: string
    ): Promise<void> {
        await this.hdel([
            namespaceConnectionsKey(this._globalNamespace, namespace),
            connectionId,
        ]);
        await this.hdel([
            connectionIdKey(this._globalNamespace, connectionId),
            namespace,
        ]);
    }

    async clearConnection(connectionId: string): Promise<void> {
        const namespaces = await this.hkeys(
            connectionIdKey(this._globalNamespace, connectionId)
        );
        await Promise.all(
            namespaces.map((n) =>
                this.hdel([
                    namespaceConnectionsKey(this._globalNamespace, n),
                    connectionId,
                ])
            )
        );
        await this.hdel([connectionsKey(this._globalNamespace), connectionId]);
        await this.del(connectionIdKey(this._globalNamespace, connectionId));
    }

    async expireConnection(connectionId: string): Promise<void> {
        // Delete the connection from the namespaces and from the global list of connections,
        // but set a 10 second expiration on all the namespaces that the connection is connected to.
        // This preserves
        const namespaces = await this.hkeys(
            connectionIdKey(this._globalNamespace, connectionId)
        );
        await Promise.all(
            namespaces.map((n) =>
                this.hdel([
                    namespaceConnectionsKey(this._globalNamespace, n),
                    connectionId,
                ])
            )
        );
        await this.hdel([connectionsKey(this._globalNamespace), connectionId]);
        await this.expire(
            connectionIdKey(this._globalNamespace, connectionId),
            10
        );
    }

    async getConnectionsByNamespace(
        namespace: string
    ): Promise<DeviceNamespaceConnection[]> {
        const values = await this.hvals(
            namespaceConnectionsKey(this._globalNamespace, namespace)
        );

        return values.map((v) => JSON.parse(v));
    }

    async countConnectionsByNamespace(namespace: string): Promise<number> {
        const count = await this.hlen(
            namespaceConnectionsKey(this._globalNamespace, namespace)
        );
        return count;
    }

    async getConnection(connectionId: string): Promise<DeviceConnection> {
        const connectionJson = await this.hget(
            connectionsKey(this._globalNamespace),
            connectionId
        );
        if (connectionJson) {
            return JSON.parse(connectionJson);
        }
        return null;
    }

    async getNamespaceConnection(
        connectionId: string,
        namespace: string
    ): Promise<DeviceNamespaceConnection> {
        const connectionJson = await this.hget(
            namespaceConnectionsKey(this._globalNamespace, namespace),
            connectionId
        );

        if (connectionJson) {
            return JSON.parse(connectionJson);
        }
        return null;
    }

    async getConnections(
        connectionId: string
    ): Promise<DeviceNamespaceConnection[]> {
        const values = await this.hvals(
            connectionIdKey(this._globalNamespace, connectionId)
        );

        return values.map((v) => JSON.parse(v));
    }

    async countConnections(): Promise<number> {
        const count = await this.hlen(connectionsKey(this._globalNamespace));
        return count;
    }

    async getConnectionRateLimitExceededTime(
        connectionId: string
    ): Promise<number> {
        const key = connectionRateLimitKey(this._globalNamespace, connectionId);
        const value = await this.get(key);
        if (!value) {
            return null;
        }
        const parsed = parseInt(value);
        if (isNaN(parsed)) {
            return null;
        }
        return parsed;
    }

    async setConnectionRateLimitExceededTime(
        connectionId: string,
        timeMs: number
    ): Promise<void> {
        const key = connectionRateLimitKey(this._globalNamespace, connectionId);
        if (timeMs === null || timeMs === undefined) {
            await this.del(key);
        } else {
            await this.set(key, timeMs.toString()), await this.expire(key, 100);
        }
    }
}

function connectionsKey(globalNamespace: string) {
    return `/${globalNamespace}/connections`;
}

function namespaceConnectionsKey(globalNamespace: string, namespace: string) {
    return `/${globalNamespace}/namespace_connections/${namespace}`;
}

function connectionIdKey(globalNamespace: string, connectionId: string) {
    return `/${globalNamespace}/connections/${connectionId}`;
}

function connectionRateLimitKey(globalNamespace: string, connectionId: string) {
    return `/${globalNamespace}/rate_limited/${connectionId}`;
}
