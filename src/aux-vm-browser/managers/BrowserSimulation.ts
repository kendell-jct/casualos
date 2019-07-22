import { UserMode } from '@casual-simulation/aux-common';
import { RecentFilesManager } from './RecentFilesManager';
import SelectionManager from './SelectionManager';
import { FilePanelManager } from './FilePanelManager';
import { Simulation } from '@casual-simulation/aux-vm';
import {
    LoginManager,
    ProgressManager,
} from '@casual-simulation/aux-vm/managers';

/**
 * Defines an interface for objects that represent file simulations.
 */
export interface BrowserSimulation extends Simulation {
    /**
     * Gets the selection manager.
     */
    selection: SelectionManager;

    /**
     * Gets the recent files manager.
     */
    recent: RecentFilesManager;

    /**
     * Gets the files panel manager.
     */
    filePanel: FilePanelManager;

    /**
     * Gets the login manager.
     */
    login: LoginManager;

    /**
     * Gets the progress manager.
     */
    progress: ProgressManager;

    /**
     * Sets the file mode that the user should be in.
     * @param mode The mode that the user should use.
     */
    setUserMode(mode: UserMode): Promise<void>;
}