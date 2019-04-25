import { IOperation } from './IOperation';
import { BaseInteractionManager } from './BaseInteractionManager';
import { Vector2, Vector3 } from 'three';
import { FileCalculationContext } from '@casual-simulation/aux-common';

import { AuxFile3D } from '../../shared/scene/AuxFile3D';
import { IGameView } from '../../shared/IGameView';
import { appManager } from '../../shared/AppManager';
import { differenceBy, maxBy } from 'lodash';

/**
 * Class that is able to tween the main camera to a given location.
 */
export class TweenCameraToOperation implements IOperation {
    private _gameView: IGameView;
    private _interaction: BaseInteractionManager;
    private _target: Vector3;
    private _finished: boolean;

    /**
     * Create a new drag rules.
     * @param gameView The game view.
     * @param interaction The interaction manager.
     * @param target The target location to tween to.
     */
    constructor(
        gameView: IGameView,
        interaction: BaseInteractionManager,
        target: Vector3
    ) {
        this._gameView = gameView;
        this._interaction = interaction;
        this._finished = false;

        const cam = this._gameView.getMainCamera();
        const currentPivotPoint = this._interaction.cameraControls.target;
        const rayPointToTargetPosition = target.clone().sub(currentPivotPoint);
        const rayPointToCamera = cam.position.clone().sub(currentPivotPoint);
        const finalPosition = currentPivotPoint
            .clone()
            .add(rayPointToTargetPosition)
            .add(rayPointToCamera);
        this._target = finalPosition;
    }

    update(calc: FileCalculationContext): void {
        if (this._finished) return;

        const cam = this._gameView.getMainCamera();
        const camPos = cam.position.clone();
        const dist = camPos.distanceToSquared(this._target);
        if (dist > 0.001) {
            const dir = this._target
                .clone()
                .sub(camPos)
                .multiplyScalar(0.1);
            this._interaction.cameraControls.cameraOffset.copy(dir);
        } else {
            // This tween operation is finished.
            this._finished = true;
        }
    }

    isFinished(): boolean {
        return this._finished;
    }

    dispose(): void {}
}