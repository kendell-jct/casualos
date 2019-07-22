import { LoginErrorReason } from './LoginError';
import { User } from './User';
import { DeviceInfo } from './DeviceInfo';

export type StatusUpdate =
    | StatusMessage
    | ConnectionMessage
    | SyncMessage
    | AuthenticationMessage
    | AuthorizationMessage
    | InitMessage
    | ProgressMessage;

export interface ConnectionMessage {
    type: 'connection';

    connected: boolean;
}

export interface AuthenticationMessage {
    type: 'authentication';

    authenticated: boolean;

    /**
     * The user that was authenticated.
     */
    user?: User;

    /**
     * The info about the device.
     */
    info?: DeviceInfo;

    /**
     * The reason why the user is not authenticated.
     */
    reason?: LoginErrorReason;
}

export interface AuthorizationMessage {
    type: 'authorization';

    authorized: boolean;
    reason?: LoginErrorReason;
}

export interface SyncMessage {
    type: 'sync';

    synced: boolean;
}

/**
 * Defines a status update which indicates that the channel has been fully setup.
 */
export interface InitMessage {
    type: 'init';
}

/**
 * Defines a generic status message.
 */
export interface StatusMessage {
    type: 'message';

    /**
     * Where the message came from.
     */
    source: string;

    /**
     * The message.
     */
    message: string;
}

/**
 * Defines a progress message which indicates the loading status of a component.
 */
export interface ProgressMessage {
    type: 'progress';

    /**
     * The message.
     */
    message: string;

    /**
     * The loading percentage. (0 - 1)
     */
    progress: number;

    /**
     * Whether the component is done loading.
     */
    done?: boolean;

    /**
     * Whether the message should be communicated as an error.
     */
    error?: boolean;
}