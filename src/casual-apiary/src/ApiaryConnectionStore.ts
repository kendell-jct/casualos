/**
 * Defines an interface that defines a connection store for information about available connections.
 */
export interface ApiaryConnectionStore {
    /**
     * Saves the given connection to the store.
     * @param connection The connection to save.
     */
    saveConnection(connection: DeviceConnection): Promise<void>;

    /**
     * Saves the given namespace connection to the store.
     * @param connection The connection to save.
     */
    saveNamespaceConnection(
        connection: DeviceNamespaceConnection
    ): Promise<void>;

    /**
     * Deletes the given connection from the store.
     * @param connectionId The ID of the connection.
     * @param namespace The namespace that the connection should be deleted from.
     */
    deleteNamespaceConnection(
        connectionId: string,
        namespace: string
    ): Promise<void>;

    /**
     * Deletes all the connections with the given connection ID.
     * @param connectionId The ID of the connection.
     */
    clearConnection(connectionId: string): Promise<void>;

    /**
     * Marks all the connections associated with the given connection ID as expired so that they can be deleted in the future.
     * Works similarly to clearConnection(), but instead of deleting the connection, it marks them as expired.
     *
     * After calling this, the given connection ID will not be present in getConnectionsByNamespace() or countConnections(),
     * but the connection will still be present in getConnection() (until the connection expires).
     *
     * @param connectionId The ID of the connection.
     */
    expireConnection(connectionId: string): Promise<void>;

    /**
     * Gets all the connections for the given namespace.
     * @param namespace The namespace.
     */
    getConnectionsByNamespace(
        namespace: string
    ): Promise<DeviceNamespaceConnection[]>;

    /**
     * Counts the number of active connections for the given namespace.
     */
    countConnectionsByNamespace(namespace: string): Promise<number>;

    /**
     * Gets the given connection with the connection ID.
     * @param connectionId The ID of the connection to get.
     */
    getConnection(connectionId: string): Promise<DeviceConnection>;

    /**
     * Gets the connection for the given connection ID and namespace.
     * @param connectionId The ID of the connection to get.
     * @param namespace The namespace of the connection to get.
     */
    getNamespaceConnection(
        connectionId: string,
        namespace: string
    ): Promise<DeviceNamespaceConnection>;

    /**
     * Gets the list of connections that are present for the given connection ID.
     * @param connectionId The ID of the connection.
     */
    getConnections(connectionId: string): Promise<DeviceNamespaceConnection[]>;

    /**
     * Counts the number of active connections.
     */
    countConnections(): Promise<number>;

    /**
     * Gets the last time that the connection rate limit was exceeded for the given connection ID.
     * @param connectionId The ID of the connection.
     */
    getConnectionRateLimitExceededTime(
        connectionId: string
    ): Promise<number | null>;

    /**
     * Sets the last time that the connection rate limit was exceeded for the given connection ID.
     * @param connectionId The ID of the connection.
     * @param timeMs The unix time in miliseconds.
     */
    setConnectionRateLimitExceededTime(
        connectionId: string,
        timeMs: number | null
    ): Promise<void>;
}

/**
 * Defines an interface that represents the connection of a device to the apiary.
 */
export interface DeviceConnection {
    /**
     * The server-created ID of the connection.
     */
    connectionId: string;

    /**
     * The session ID of the device connection.
     */
    sessionId: string;

    /**
     * The username that the device is using.
     */
    username: string;

    /**
     * The token that the device is using.
     */
    token: string;
}

/**
 * Defines an interface that represents the connection of a device to a namespace.
 */
export interface DeviceNamespaceConnection extends DeviceConnection {
    /**
     * The namespace that the device is connected to.
     */
    namespace: string;

    /**
     * Whether the data stored by the connection is supposed to be temporary.
     */
    temporary: boolean;
}
