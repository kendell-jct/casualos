import { 
    Math as ThreeMath,
    Mesh, 
    Object3D, 
    DoubleSide,
    Color,
    TextureLoader,
    Texture,
    SceneUtils,
    Vector3,
    Box3,
    RawShaderMaterial,
    LinearFilter,
    ArrowHelper,
    Sphere,
    Ray,
    Vector2,
    Box2,
    Shape,
    MeshBasicMaterial,
    ShapeBufferGeometry,
    Box3Helper,
    AxesHelper} from "three";

import { Object, Workspace } from 'aux-common/Files';
import GameView from "../GameView/GameView";
import { File3D } from "./File3D";
import { FileMesh } from "./FileMesh";
import { WorkspaceMesh } from "./WorkspaceMesh";
import { merge } from "aux-common/utils";

export class WordBubble3D extends Object3D {

    private _shapeGeometry: ShapeBufferGeometry;
    private _shapeMeshMaterial: MeshBasicMaterial;
    private _shapeMesh: Mesh;

    // private _posHelper: AxesHelper;
    // private _arrowPointHelper: AxesHelper;
    private _options: WordBubbleOptions;

    constructor(opt?: WordBubbleOptions) {
        super();
        
        // this._posHelper = new AxesHelper(1);
        // this.add(this._posHelper);

        // Default options.
        this._options = {
            paddingWidth: 0.02,
            paddingHeight: 0.02,
            cornerRadius: 0,
            color: new Color(0.8, 0.8, 0.8)
        }
    }

    /**
     * Update the world bubble so that it encapsulates the provided Box2.
     * @param box The world space box to encapsulate inside the word bubble.
     * @param arrowPoint The world position that the arrow should point at.
     */
    public update(box: Box2, arrowPoint: Vector3): void {
        this.regenerateMesh(box, arrowPoint);
    }

    public regenerateMesh(box: Box2, arrowPoint: Vector3, opt?: WordBubbleOptions) {
        if (this._shapeMesh) {
            this.remove(this._shapeMesh);
            this._shapeMesh = null;
        }

        if (opt) {
            // Merge values of provied options into internal options.
            this._options = merge(this._options, opt);
        }

        if (this._options.cornerRadius > 0) {
            // Rounded corners.
            throw new Error("Rounded corners are not supported yet.");
        }

        let boxWithPadding = box.clone();
        boxWithPadding.expandByVector(new Vector2(this._options.paddingWidth, this._options.paddingHeight));

        // Get local space conversion of min, max, and arrowPoint.
        const minLocal = this.worldToLocal(new Vector3(boxWithPadding.min.x, boxWithPadding.min.y, 0));
        const maxLocal = this.worldToLocal(new Vector3(boxWithPadding.max.x, boxWithPadding.max.y, 0));
        const arrowPointLocal = this.worldToLocal(arrowPoint.clone());

        // Clamp arrow width to the size of the box if the box is smaller than the defualt arrow width.
        let arrowWidth = 0.2;
        const boxWidth = maxLocal.x - minLocal.x;
        if (boxWidth < arrowWidth) {
            arrowWidth = boxWidth / 2;
        }

        // DEBUG ARROW POINT:
        // if (!this._arrowPointHelper) {
        //     this._arrowPointHelper = new AxesHelper(1);
        //     this.add(this._arrowPointHelper);
        // }
        // this._arrowPointHelper.position.copy(arrowPointLocal);

        // Generate base word bubble mesh.
        let shape = new Shape();

        // Sharp corners.
        shape.moveTo(arrowPointLocal.x, arrowPointLocal.y);
        shape.lineTo(-arrowWidth / 2, minLocal.y);
        shape.lineTo(minLocal.x, minLocal.y);
        shape.lineTo(minLocal.x, maxLocal.y);
        shape.lineTo(maxLocal.x, maxLocal.y);
        shape.lineTo(maxLocal.x, minLocal.y);
        shape.lineTo(arrowWidth / 2, minLocal.y);

        // shape.moveTo(0, 0);
        // shape.lineTo(-this._options.arrowWidth, min.y);
        // shape.lineTo(min.x, min.y);
        // shape.lineTo(min.x, max.y);
        // shape.lineTo(max.x, max.y);
        // shape.lineTo(max.x, min.y);
        // shape.lineTo(this._options.arrowWidth, min.y);

        // Material for word bubble.
        this._shapeMeshMaterial = new MeshBasicMaterial({
            side: DoubleSide,
            color: this._options.color
        });

        this._shapeGeometry = new ShapeBufferGeometry(shape, 12);
        this._shapeMesh = new Mesh(this._shapeGeometry, this._shapeMeshMaterial);
        this.add(this._shapeMesh);
    }

    public frameUpdate() {
        if (this._shapeMesh) {
        }
    }
}

interface WordBubbleOptions {
    /**
     * How much extra padding should there be inside the bubble's height?
     */
    paddingHeight?: number;

    /**
     * How much extra padding should there be inside the bubble's width?
     */
    paddingWidth?: number;

    /**
     * The radius of the corners.
     */
    cornerRadius?: number;

    /**
     * Color of the bubble.
     */
    color?: Color;
}