import { _decorator, Component, Node, instantiate, Prefab, Vec3, UITransform, Label, ProgressBar, director, CCFloat, CCInteger, tween, v3, Sprite, Tween, AudioSource, VideoPlayer } from 'cc';
import { CatController } from './CatController';
import { TutorialController } from './TutorialController';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    // --- Inspector Properties ---
    @property(Node) public catsContainer: Node | null = null;
    @property(Label) public timerLabel: Label | null = null;
    @property(ProgressBar) public mergeProgressBar: ProgressBar | null = null;
    @property(Node) public ctaCanvas: Node | null = null;
    @property({ type: Node, tooltip: "The 'Drag to Match' text shown at the start." })
    public dragToMatchText: Node | null = null;
    @property({ type: Label, tooltip: "The label for showing 'Awesome!' or 'Try Again!'." })
    public endGameStatusLabel: Label | null = null;
    @property({ type: Node, tooltip: "The semi-transparent overlay shown at the end of the game."})
    public endGameOverlay: Node | null = null;
    @property({ type: Prefab, tooltip: "The particle effect for successful merges."})
    public starParticlePrefab: Prefab | null = null;
    @property({ type: Node, tooltip: "The black-and-white background sprite." })
    public bwBackground: Node | null = null;
    @property({ type: Node, tooltip: "The node with the Mask component revealing the color background." })
    public colorRevealMask: Node | null = null;
    @property({ type: Node, tooltip: "The visual wave sprite node that moves down the screen." })
    public revealWave: Node | null = null;
    @property({ type: TutorialController, tooltip: "The controller for the tutorial hand animation." })
    public tutorialController: TutorialController | null = null;
    @property({ type: Node, tooltip: "The semi-transparent overlay that darkens the screen for the tutorial." })
    public tutorialSpotlightOverlay: Node | null = null;
    @property({ type: Node, tooltip: "The background glow for the first tutorial cat." })
    private spotlightGlow1: Node | null = null;
    @property({ type: Node, tooltip: "The background glow for the second tutorial cat." })
    private spotlightGlow2: Node | null = null;
    @property({ type: VideoPlayer, tooltip: "The video player for the win confetti."})
    public confettiPlayer: VideoPlayer | null = null;
    @property({ type: Node, tooltip: "The sprite node for the sad emoji on loss."})
    public sadEmoji: Node | null = null;
    @property({ type: Prefab, tooltip: "The particle effect for the crying emoji's tears."})
    public tearParticlePrefab: Prefab | null = null;
    @property(CCFloat) public gameDuration: number = 60;
    @property(CCInteger) public totalMergeTypes: number = 7;
    @property(CCFloat) public revealDuration: number = 3.0;
    @property({ type: CCFloat, tooltip: "Time in seconds of player inactivity before showing a hint." })
    public idleHintDelay: number = 3.0;

    // --- Internal State ---
    private isGameStarted: boolean = false;
    private isGameOver: boolean = false;
    private isTutorialActive: boolean = false;
    private mergedTypes: Set<string> = new Set();
    private elapsedTime: number = 0;
    private idleTimer: number = 0;
    private bounceTween: Tween<Node> | null = null;
    private sadEmojiTween: Tween<Node> | null = null;
    private audioSource: AudioSource | null = null;
    private tutorialCallback: (() => void) | null = null;
    private savedEventBlocker: any = null;
    private originalStartNodeParent: Node | null = null;
    private originalEndNodeParent: Node | null = null;
    private originalStartNodePos: Vec3 = v3();
    private originalEndNodePos: Vec3 = v3();

    start() {
        this.audioSource = this.getComponent(AudioSource);
        this.resetGame();
    }

    update(deltaTime: number) {
        if (this.isGameOver) return;
        if (this.isGameStarted) {
            this.elapsedTime += deltaTime;
            const remainingTime = Math.max(0, this.gameDuration - this.elapsedTime);
            if (this.timerLabel) this.timerLabel.string = `${Math.ceil(remainingTime)}`;

            if (remainingTime <= 0) this.handleGameEnd(false);

            if (!this.isTutorialActive) {
                this.idleTimer += deltaTime;
                if (this.idleTimer >= this.idleHintDelay) this.triggerIdleHint();
            }
        }
    }

    public resetIdleTimer() {
        this.idleTimer = 0;
    }

    private resetGame() {
        if (this.sadEmojiTween) {
            this.sadEmojiTween.stop();
            this.sadEmojiTween = null;
        }
        if (this.ctaCanvas) this.ctaCanvas.active = false;
        if (this.mergeProgressBar) this.mergeProgressBar.progress = 0;
        if (this.timerLabel) this.timerLabel.string = `${this.gameDuration}`;
        if (this.endGameOverlay) this.endGameOverlay.active = false;
        
        if (this.dragToMatchText) {
            if (this.bounceTween) this.bounceTween.stop();
            Tween.stopAllByTarget(this.dragToMatchText);
            this.dragToMatchText.setScale(v3(0, 0, 0));
            this.dragToMatchText.active = true;
            this.bounceTween = tween(this.dragToMatchText).to(0.7, { scale: v3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' }).to(0.7, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' }).union().repeatForever();
            tween(this.dragToMatchText).to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).call(() => { this.bounceTween?.start(); }).start();
        }

        this.isGameStarted = false;
        this.isGameOver = false;
        this.mergedTypes.clear();
        this.elapsedTime = 0;
        this.idleTimer = 0;

        if (this.bwBackground) this.bwBackground.active = true;
        if (this.revealWave) this.revealWave.active = false;
        if (this.colorRevealMask) this.colorRevealMask.getComponent(UITransform)!.height = 0;
        
        if (this.tutorialController) {
            this.isTutorialActive = true;
            if (this.tutorialSpotlightOverlay) this.tutorialSpotlightOverlay.active = false;
            this.tutorialCallback = this.startTutorialSequence.bind(this);
            this.scheduleOnce(this.tutorialCallback, 2.0);
        }
    }
    
    private startTutorialSequence() {
        if (!this.isTutorialActive || !this.tutorialController) return;
        const { startNode, endNode } = this.tutorialController;
        if (!startNode || !endNode) {
            console.error("Initial tutorial nodes not set in TutorialController!");
            return;
        }
        this.setupInitialTutorial(startNode, endNode);
        this.tutorialController.playTutorial(startNode, endNode);
        this.tutorialCallback = null;
    }

    private triggerIdleHint() {
        if (!this.tutorialController || !this.catsContainer) return;
        this.resetIdleTimer();
        const pair = this.findMergeablePair();
        if (pair) {
            this.isTutorialActive = true;
            this.tutorialController.playTutorial(pair.startNode, pair.endNode);
        }
    }

    private setupInitialTutorial(startNode: Node, endNode: Node) {
        if (!this.tutorialSpotlightOverlay) return;
        this.tutorialSpotlightOverlay.active = true;
        const overlayUIT = this.tutorialSpotlightOverlay.getComponent(UITransform);
        if(!overlayUIT) return;
        
        const overlaySprite = this.tutorialSpotlightOverlay.getComponent(Sprite);
        if (overlaySprite) { // @ts-ignore
            this.savedEventBlocker = overlaySprite._eventBlocker; // @ts-ignore
            overlaySprite._eventBlocker = null;
        }

        this.originalStartNodeParent = startNode.parent;
        this.originalEndNodeParent = endNode.parent;
        this.originalStartNodePos.set(startNode.position);
        this.originalEndNodePos.set(endNode.position);

        const startWorldPos = startNode.parent!.getComponent(UITransform)!.convertToWorldSpaceAR(startNode.position);
        startNode.setParent(this.tutorialSpotlightOverlay);
        startNode.setPosition(overlayUIT.convertToNodeSpaceAR(startWorldPos));

        const endWorldPos = endNode.parent!.getComponent(UITransform)!.convertToWorldSpaceAR(endNode.position);
        endNode.setParent(this.tutorialSpotlightOverlay);
        endNode.setPosition(overlayUIT.convertToNodeSpaceAR(endWorldPos));

        if (this.spotlightGlow1) this.spotlightGlow1.setPosition(startNode.position);
        if (this.spotlightGlow2) this.spotlightGlow2.setPosition(endNode.position);
    }
    
    public notifyFirstInteraction(): void {
        this.resetIdleTimer();
        if (!this.isTutorialActive) {
            if (!this.isGameStarted) this.notifyGameStart();
            return;
        }
        
        this.isTutorialActive = false;
        if (this.tutorialController) this.tutorialController.stopTutorial();
        
        if (this.tutorialSpotlightOverlay && this.tutorialSpotlightOverlay.active) {
            this.tutorialSpotlightOverlay.active = false;
            const overlaySprite = this.tutorialSpotlightOverlay.getComponent(Sprite);
            if (overlaySprite && this.savedEventBlocker) { // @ts-ignore
                overlaySprite._eventBlocker = this.savedEventBlocker;
            }
        }

        if (this.originalStartNodeParent && this.tutorialController) {
            const { startNode, endNode } = this.tutorialController;
            if (startNode) {
                startNode.setParent(this.originalStartNodeParent);
                startNode.setPosition(this.originalStartNodePos);
            }
            if (endNode && this.originalEndNodeParent) {
                endNode.setParent(this.originalEndNodeParent);
                endNode.setPosition(this.originalEndNodePos);
            }
            this.originalStartNodeParent = null;
            this.originalEndNodeParent = null;
        }
        
        if (this.tutorialCallback) {
            this.unschedule(this.tutorialCallback);
            this.tutorialCallback = null;
        }
        
        if (this.dragToMatchText) {
            if (this.bounceTween) this.bounceTween.stop();
            this.dragToMatchText.active = false;
        }
        
        if (!this.isGameStarted) this.notifyGameStart();
    }
    
    public notifyGameStart() {
        if (this.isGameStarted) return;
        this.isGameStarted = true;
        this.resetIdleTimer();
    }
    
    private handleGameEnd(didWin: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.isGameStarted = false;
        
        if (this.tutorialController) this.tutorialController.stopTutorial();
        
        this.scheduleOnce(() => this.showEndGameOverlay(didWin), 3.5);
        this.scheduleOnce(() => {
            if (this.endGameOverlay) this.endGameOverlay.active = false;
            this.showCtaScreen();
        }, 5.5);

        if (didWin && this.bwBackground && this.revealWave && this.colorRevealMask) {
            const backgroundTransform = this.bwBackground.getComponent(UITransform)!;
            const targetHeight = backgroundTransform.height;
            const startY = targetHeight / 2;
            this.revealWave.setPosition(0, startY, 0);
            this.revealWave.active = true;
            tween(this.revealWave).to(this.revealDuration, { position: v3(0, -startY, 0) }, { easing: 'cubicInOut' })
                .call(() => {
                    this.revealWave!.active = false;
                    this.bwBackground!.active = false;
                }).start();
            const maskTransform = this.colorRevealMask.getComponent(UITransform)!;
            tween(maskTransform).to(this.revealDuration, { height: targetHeight }, { easing: 'cubicInOut' }).start();
        }
    }

    private showEndGameOverlay(didWin: boolean) {
        if (!this.endGameOverlay || !this.endGameStatusLabel) return;
        
        if (this.confettiPlayer) this.confettiPlayer.node.active = false;
        if (this.sadEmoji) this.sadEmoji.active = false;
        if (this.sadEmojiTween) {
            this.sadEmojiTween.stop();
            this.sadEmojiTween = null;
        }

        this.endGameOverlay.active = true;

        if (didWin) {
            this.endGameStatusLabel.string = "AWESOME!";
            if (this.confettiPlayer) {
                this.confettiPlayer.node.active = true;
                this.confettiPlayer.play();
            }
        } else {
            this.endGameStatusLabel.string = "TRY AGAIN!";
            if (this.sadEmoji) {
                this.sadEmoji.active = true;
                this.sadEmoji.setScale(v3(0, 0, 0));
                this.sadEmoji.setRotationFromEuler(0, 0, 0);

                tween(this.sadEmoji)
                    .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                    .call(() => {
                        if (this.tearParticlePrefab) {
                            const leftTear = instantiate(this.tearParticlePrefab);
                            this.sadEmoji!.addChild(leftTear);
                            leftTear.setPosition(-30, -20, 0);

                            const rightTear = instantiate(this.tearParticlePrefab);
                            this.sadEmoji!.addChild(rightTear);
                            rightTear.setPosition(30, -20, 0);
                        }

                        this.sadEmojiTween = tween(this.sadEmoji!)
                            .to(0.8, { scale: v3(1.05, 0.95, 1) }, { easing: 'sineInOut' })
                            .to(0.8, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
                            .to(0.4, { angle: -5 }, { easing: 'sineInOut'})
                            .to(0.8, { angle: 5 }, { easing: 'sineInOut'})
                            .to(0.4, { angle: 0 }, { easing: 'sineInOut'})
                            .union().repeatForever().start();
                    })
                    .start();
            }
        }
    }

    private showCtaScreen() {
        if (this.ctaCanvas) this.ctaCanvas.active = true;
    }

    private checkForWin() {
        if (this.mergedTypes.size >= this.totalMergeTypes) {
            this.handleGameEnd(true);
        }
    }

    private findMergeablePair(): { startNode: Node, endNode: Node } | null {
        if (!this.catsContainer) return null;
        const availableCats = new Map<string, Node[]>();
        for (const catNode of this.catsContainer.children) {
            const catController = catNode.getComponent(CatController);
            if (catNode.active && catController) {
                const { catType } = catController;
                if (!availableCats.has(catType)) availableCats.set(catType, []);
                availableCats.get(catType)!.push(catNode);
            }
        }
        for (const nodes of availableCats.values()) {
            if (nodes.length >= 2) return { startNode: nodes[0], endNode: nodes[1] };
        }
        return null;
    }

    public tryMerge(draggedCatNode: Node): boolean {
        const c = draggedCatNode.getComponent(CatController);
        const t = draggedCatNode.getComponent(UITransform);
        if (!this.catsContainer || !c || !t) return false;
        const r = t.getBoundingBoxToWorld();
        for (const o of this.catsContainer.children) {
            if (o === draggedCatNode || !o.active) continue;
            const oc = o.getComponent(CatController);
            if (!oc || oc.catType !== c.catType) continue;
            const ot = o.getComponent(UITransform);
            if (!ot) continue;
            const or = ot.getBoundingBoxToWorld();
            if (or.intersects(r)) {
                this.performMerge(draggedCatNode, o);
                return true;
            }
        }
        return false;
    }

    private performMerge(draggedCatNode: Node, staticCatNode: Node) {
        const draggedCatSprite = draggedCatNode.getComponent(Sprite)!;
        const draggedCatController = draggedCatNode.getComponent(CatController)!;
        
        if (this.audioSource && draggedCatController.mergeSound) {
            this.audioSource.playOneShot(draggedCatController.mergeSound, 1.0);
        }

        if (this.starParticlePrefab) {
            const staticTransform = staticCatNode.getComponent(UITransform)!;
            const worldPos = staticTransform.convertToWorldSpaceAR(v3(0,0,0));
            const canvasTransform = this.node.parent!.getComponent(UITransform)!;
            const nodePos = canvasTransform.convertToNodeSpaceAR(worldPos);
            const stars = instantiate(this.starParticlePrefab);
            this.node.parent!.addChild(stars); 
            stars.setPosition(nodePos);
        }

        draggedCatNode.setPosition(staticCatNode.getPosition());
        draggedCatSprite.spriteFrame = draggedCatController.coloredCat;
        staticCatNode.destroy();
        
        draggedCatNode.removeComponent(CatController);
        if (!this.mergedTypes.has(draggedCatController.catType)) {
            this.mergedTypes.add(draggedCatController.catType);
            this.updateProgressBar();
        }
        this.checkForWin();
    }
    
    private updateProgressBar() {
        if (this.mergeProgressBar) {
            this.mergeProgressBar.progress = this.mergedTypes.size / this.totalMergeTypes;
        }
    }

    public onPlayAgainClicked(): void {
        director.loadScene(director.getScene().name);
    }
}