import {
    Box3,
    Object3D,
    Scene,
    Vector3,
    Box3Helper,
    Color,
    LineBasicMaterial,
    LineSegments,
    NoColors,
    Camera,
    WebGLRenderer,
    ArrowHelper,
} from 'three';
import { Time } from '../Time';
import { getOptionalValue } from '../../SharedUtils';
import { PointHelper } from '../helpers/PointHelper';
import { Box3HelperPool } from '../objectpools/Box3HelperPool';
import { ObjectPool } from '../objectpools/ObjectPool';
import { PointHelperPool } from '../objectpools/PointHelperPool';
import { LineHelper } from '../helpers/LineHelper';
import { LineHelperPool } from '../objectpools/LineHelperPool';
import { Input } from '../Input';
import { ArrowHelperPool } from '../objectpools/ArrowHelperPool';
import { drawExamples } from './DebugExamples';

const BOX3HELPER_POOL_ID = 'box3helper_pool';
const POINTHELPER_POOL_ID = 'pointhelper_pool';
const LINEHELPER_POOL_ID = 'linehelper_pool';
const ARROWHELPER_POOL_ID = 'arrowhelper_pool';

/**
 * A helper module for drawing THREE objects to that are useful for visual debugging.
 * By default, debug objects are only drawn for one frame and are automatically removed by the manager.
 */
export namespace DebugObjectManager {
    /**
     * Wether or not debug object manager is enabled.
     */
    export var enabled: boolean = true;

    /**
     * Wether or not debug objects are rendered with the depth buffer (objects can occlude debug objects),
     * or without it (the depth buffer is discarded and debug objects are rendered over top).
     */
    export var useDepth: boolean = false;

    var _time: Time;
    var _scene: Scene;
    var _debugObjects: DebugObject[];
    var _objectPools: Map<string, ObjectPool<unknown>>;
    var _initialized: boolean;

    /**
     * Initalize the Debug Object Manager.
     * @param time The Time module the debug object manager will use to create timestamps and decide when debug objects have passed their expiration time.
     * @param scene The scene that debug objects will by default be parented to.
     */
    export function init(): void {
        if (_initialized) return;

        _initialized = true;
        _time = new Time();
        _scene = new Scene();
        _debugObjects = [];
        _objectPools = new Map<string, ObjectPool<unknown>>();

        // Setup object pools.
        const startSize = 10;

        _objectPools.set(
            BOX3HELPER_POOL_ID,
            new Box3HelperPool(BOX3HELPER_POOL_ID).initializePool(startSize)
        );

        _objectPools.set(
            POINTHELPER_POOL_ID,
            new PointHelperPool(POINTHELPER_POOL_ID).initializePool(startSize)
        );

        _objectPools.set(
            LINEHELPER_POOL_ID,
            new LineHelperPool(LINEHELPER_POOL_ID).initializePool(startSize)
        );

        _objectPools.set(
            ARROWHELPER_POOL_ID,
            new ArrowHelperPool(ARROWHELPER_POOL_ID).initializePool(startSize)
        );
    }

    /**
     * Remove all currently active debug objects.
     */
    export function removeAll(): void {
        if (!_initialized) return;

        _debugObjects.forEach(o => {
            let pool = _objectPools.get(o.poolId);
            pool.restore(o.object3D);
        });
        _debugObjects = [];
    }

    export function update(): void {
        if (!_initialized) return;

        if (enabled) {
            _time.update();

            // Filter for elements that should still be alive.
            // Dispose of elements that should not be alive anymore.
            _debugObjects = _debugObjects.filter(o => {
                if (o.killTime <= _time.timeSinceStart) {
                    let pool = _objectPools.get(o.poolId);
                    pool.restore(o.object3D);
                    return false;
                } else {
                    return true;
                }
            });
        }

        if (Input.instance.getKeyDown('1')) {
            useDepth = !useDepth;
            console.log('[DebugObjectManager] debug use depth:', useDepth);
        }

        if (Input.instance.getKeyDown('2')) {
            enabled = !enabled;
            console.log('[DebugObjectManager] debug enabled:', enabled);
        }

        // NOTE: Uncomment this function to see some examples of the different debugdrawing functions.
        // drawExamples(_time);
    }

    /**
     * Render the debug object scene with the given camera.
     * @param camera The camera to render with.
     */
    export function render(renderer: WebGLRenderer, camera: Camera): void {
        if (!_initialized) return;
        if (!enabled) return;

        if (!useDepth) {
            // Clear the depth buffer so that debug objects appear on top.
            renderer.clearDepth();
        }

        renderer.render(_scene, camera);
    }

    /**
     * Draw a wireframe box that represents the given Box3 object.
     * @param box3 The box3 to represent.
     * @param color The color the debug object should. Default is green.
     * @param duration How long the debug object should render for. Default is one frame.
     */
    export function drawBox3(box3: Box3, color?: Color, duration?: number) {
        if (!_initialized) return;
        if (!enabled) return;
        if (!box3) return;
        color = getOptionalValue(color, new Color(0, 1, 0));
        duration = getOptionalValue(duration, 0);
        const box3Helper = <Box3Helper>(
            _objectPools.get(BOX3HELPER_POOL_ID).retrieve()
        );

        const lineMaterial = <LineBasicMaterial>(
            (<LineSegments>box3Helper).material
        );
        lineMaterial.vertexColors = NoColors;
        lineMaterial.color = color;

        _scene.add(box3Helper);

        // Position the box helper using the given box3.
        box3Helper.box = box3.clone();

        _debugObjects.push({
            object3D: box3Helper,
            poolId: BOX3HELPER_POOL_ID,
            killTime: _time.timeSinceStart + duration,
        });
    }

    /**
     * Draw a point that represents the given Vector3 position.
     * @param point The Vector3 to represent.
     * @param size How big the axes helper should be. Default is 1.
     * @param color The color the debug object should. Default is the color of axes that the lines represent (red, green, blue).
     * @param duration How long the debug object should render for. Default is one frame.
     */
    export function drawPoint(
        point: Vector3,
        size?: number,
        color?: Color,
        duration?: number
    ) {
        if (!_initialized) return;
        if (!enabled) return;
        if (!point) return;
        size = getOptionalValue(size, 1);
        color = getOptionalValue(color, null);
        duration = getOptionalValue(duration, 0);
        const pointHelper = <PointHelper>(
            _objectPools.get(POINTHELPER_POOL_ID).retrieve()
        );
        pointHelper.point = point;
        pointHelper.size = size;

        const lineMaterial = <LineBasicMaterial>pointHelper.material;
        lineMaterial.vertexColors = NoColors;
        lineMaterial.color = color;

        _scene.add(pointHelper);

        _debugObjects.push({
            object3D: pointHelper,
            poolId: POINTHELPER_POOL_ID,
            killTime: _time.timeSinceStart + duration,
        });
    }

    /**
     * Draw a line from the start point to the end point.
     * @param start The start point of the line.
     * @param end The end point of the line.
     * @param color The color the debug object should. Default is the color of axes that the lines represent (red, green, blue).
     * @param duration How long the debug object should render for. Default is one frame.
     */
    export function drawLine(
        start: Vector3,
        end: Vector3,
        color?: Color,
        duration?: number
    ) {
        if (!_initialized) return;
        if (!enabled) return;
        if (!start || !end) return;
        color = getOptionalValue(color, null);
        duration = getOptionalValue(duration, 0);
        const lineHelper = <LineHelper>(
            _objectPools.get(LINEHELPER_POOL_ID).retrieve()
        );
        lineHelper.start = start;
        lineHelper.end = end;

        const lineMaterial = <LineBasicMaterial>lineHelper.material;
        lineMaterial.vertexColors = NoColors;
        lineMaterial.color = color;

        _scene.add(lineHelper);

        _debugObjects.push({
            object3D: lineHelper,
            poolId: LINEHELPER_POOL_ID,
            killTime: _time.timeSinceStart + duration,
        });
    }

    /**
     * Draw an arrow from the origin point pointing in the given direction.
     * @param start The start point of the arrow.
     * @param dir The direction and length of the arrow.
     * @param color The color the debug object should. Default is the color of axes that the lines represent (red, green, blue).
     * @param duration How long the debug object should render for. Default is one frame.
     */
    export function drawArrow(
        start: Vector3,
        dir: Vector3,
        color?: Color,
        duration?: number
    ) {
        if (!_initialized) return;
        if (!enabled) return;
        if (!start || !dir) return;

        color = getOptionalValue(color, null);
        duration = getOptionalValue(duration, 0);
        const arrowHelper = <ArrowHelper>(
            _objectPools.get(ARROWHELPER_POOL_ID).retrieve()
        );
        arrowHelper.position.copy(start);
        arrowHelper.setDirection(dir.clone().normalize());

        let headLength: number = 0.3;
        let headWidth: number = 0.15;

        if (dir.length() <= headLength) {
            headLength = undefined;
            headWidth = undefined;
        }

        arrowHelper.setLength(dir.length(), headLength, headWidth);
        arrowHelper.setColor(color);

        _scene.add(arrowHelper);

        _debugObjects.push({
            object3D: arrowHelper,
            poolId: ARROWHELPER_POOL_ID,
            killTime: _time.timeSinceStart + duration,
        });
    }

    /**
     * Internal object to help keep track of debug objects.
     */
    interface DebugObject {
        object3D: Object3D;
        poolId: string;
        killTime: number;
    }
}