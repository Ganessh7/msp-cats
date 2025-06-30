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
    @property({ type: Node, tooltip: "The node where the initial tutorial drag should start." })
    public startNode: Node | null = null;
    @property({ type: Node, tooltip: "The node where the initial tutorial drag should end." })
    public endNode: Node | null = null;

    private handTween: Tween<Node> | null = null;

    public playTutorial(startNode: Node, endNode: Node): void {
        if (!this.handNode || !this.idleHandSprite || !this.clickHandSprite) {
            console.error("Tutorial hand properties are not set!");
            return;
        }
        if (!startNode || !endNode) {
            console.error("Attempted to play tutorial with invalid start/end nodes.");
            return;
        }

        this.handNode.active = true;
        this.runAnimationLoop(startNode, endNode);
    }

    public stopTutorial(): void {
        if (this.handTween) {
            this.handTween.stop();
            this.handTween = null;
        }
        if (this.handNode) {
            this.handNode.active = false;
        }
    }

    private runAnimationLoop(startNode: Node, endNode: Node): void {
        const handSprite = this.handNode?.getComponent(Sprite);
        if (!handSprite) return;

        const startPosition = this.getUIPosition(startNode);
        const endPosition = this.getUIPosition(endNode);
        if (!startPosition || !endPosition) {
            console.warn("Could not calculate tutorial hand positions.");
            this.stopTutorial();
            return;
        };

        handSprite.spriteFrame = this.idleHandSprite;
        this.handNode!.setPosition(startPosition);

        this.handTween = tween(this.handNode!)
            .delay(0.5)
            .call(() => { handSprite.spriteFrame = this.clickHandSprite!; })
            .delay(0.15) 
            .to(1.5, { position: endPosition }, { easing: 'sineInOut' })
            .call(() => { handSprite.spriteFrame = this.idleHandSprite!; })
            .delay(0.5)
            .call(() => this.runAnimationLoop(startNode, endNode))
            .start();
    }

    private getUIPosition(targetNode: Node): Vec3 | null {
        const referenceNode = this.handNode?.parent;
        if (!referenceNode) return null;

        const refUIT = referenceNode.getComponent(UITransform);
        const targetUIT = targetNode.getComponent(UITransform);
        if (!refUIT || !targetUIT) return null;

        const worldPos = targetUIT.convertToWorldSpaceAR(v3(0, 0, 0));
        return refUIT.convertToNodeSpaceAR(worldPos);
    }
}