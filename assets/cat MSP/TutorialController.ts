import { _decorator, Component, Node, tween, v3, Vec3, Tween, SpriteFrame, Sprite, UITransform } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('TutorialController')
export class TutorialController extends Component {

    @property({ type: Node, tooltip: "The hand sprite node that will be animated." })
    public handNode: Node | null = null;

    @property({ type: SpriteFrame, tooltip: "The sprite for the idle/pointing hand." })
    public idleHandSprite: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: "The sprite for the hand when it is 'clicked down'." })
    public clickHandSprite: SpriteFrame | null = null;

    @property({ type: Node, tooltip: "The node where the drag should start (e.g., a draggable cat)." })
    public startNode: Node | null = null;

    @property({ type: Node, tooltip: "The node where the drag should end (e.g., the target cat)." })
    public endNode: Node | null = null;

    private handTween: Tween<Node> | null = null;

    public playTutorial(): void {
        if (!this.handNode || !this.startNode || !this.endNode || !this.idleHandSprite || !this.clickHandSprite) {
            console.error("Tutorial properties are not fully set in the inspector!");
            return;
        }

        this.handNode.active = true;
        this.runAnimationLoop();
    }

    public stopTutorial(): void {
        if (this.handTween) {
            this.handTween.stop();
        }
        if (this.handNode) {
            this.handNode.active = false;
        }
    }

    private runAnimationLoop(): void {
        const handSprite = this.handNode?.getComponent(Sprite);
        if (!handSprite) {
            console.error("TutorialHand node is missing a Sprite component!");
            return;
        }

        const startPosition = this.getUIPosition(this.startNode!);
        const endPosition = this.getUIPosition(this.endNode!);
        if (!startPosition || !endPosition) return;

        handSprite.spriteFrame = this.idleHandSprite;
        this.handNode!.setPosition(startPosition);

        this.handTween = tween(this.handNode!)
            .delay(0.5)
            .call(() => {
                handSprite.spriteFrame = this.clickHandSprite;
            })
            .delay(0.15) 
            .to(1.5, { position: endPosition }, { easing: 'sineInOut' })
            .call(() => {
                handSprite.spriteFrame = this.idleHandSprite;
            })
            .delay(0.5)
            .call(() => this.runAnimationLoop())
            .start();
    }

    private getUIPosition(targetNode: Node): Vec3 | null {
        const uiTransform = this.node.parent?.getComponent(UITransform);
        const targetUITransform = targetNode.getComponent(UITransform);
        if (!uiTransform || !targetUITransform) return null;

        const worldPos = targetUITransform.convertToWorldSpaceAR(v3(0, 0, 0));
        return uiTransform.convertToNodeSpaceAR(worldPos);
    }
}