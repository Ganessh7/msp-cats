import { _decorator, Component, Node, EventTouch, Vec3, CCString, SpriteFrame, find, Sprite, AudioClip } from 'cc';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('CatController')
export class CatController extends Component {

    @property(CCString)
    public catType: string = "";

    @property(SpriteFrame)
    public coloredCat: SpriteFrame | null = null;

    /**
     * The sound to play when this cat is successfully merged.
     * Assign this in the Cocos Creator editor for each cat prefab.
     */
    @property({ type: AudioClip, tooltip: "The sound to play when this cat is successfully merged." })
    public mergeSound: AudioClip | null = null;

    private originalPosition: Vec3 = new Vec3();
    private isDragging: boolean = false;
    private gameManager: GameManager | null = null;

    onLoad() {
        this.originalPosition = this.node.getPosition().clone();
        this.registerEvents();

        const gameManagerNode = find("Canvas-001/GameManager"); 
        if (gameManagerNode) {
            this.gameManager = gameManagerNode.getComponent(GameManager);
        }
        if (!this.gameManager) {
            console.error("Critical Error: Could not find GameManager component!");
        }
    }

    onDestroy() {
        this.unregisterEvents();
    }

    private registerEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private unregisterEvents() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        if (!this.gameManager) return;
        
        this.gameManager.notifyGameStart();
        this.gameManager.notifyFirstInteraction();

        this.isDragging = true;
        this.node.setSiblingIndex(999);
    }

    onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;
        const delta = event.getUIDelta();
        const pos = this.node.getPosition();
        this.node.setPosition(pos.x + delta.x, pos.y + delta.y, pos.z);
    }

    onTouchEnd(event: EventTouch) {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        if (this.gameManager) {
            const mergeSuccess = this.gameManager.tryMerge(this.node);
            if (!mergeSuccess) {
                this.node.setPosition(this.originalPosition);
            }
        } else {
            this.node.setPosition(this.originalPosition);
        }
    }
}