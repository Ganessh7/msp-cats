import { _decorator, Component, Node, instantiate, Prefab, Vec3, UITransform, Label, ProgressBar, director, CCFloat, CCInteger, tween, v3, Sprite, Tween, AudioSource } from 'cc';
import { CatController } from './CatController';
import { TutorialController } from './TutorialController';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    // --- Core Gameplay References ---
    @property(Node) public catsContainer: Node | null = null;
    @property(Label) public timerLabel: Label | null = null;
    @property(ProgressBar) public mergeProgressBar: ProgressBar | null = null;
    @property(Node) public ctaCanvas: Node | null = null;

    // --- Polished UI & Effect References ---
    @property({ type: Node, tooltip: "The 'Drag to Match' text shown at the start." })
    public dragToMatchText: Node | null = null;
    @property({ type: Label, tooltip: "The label for showing 'Awesome!' or 'Try Again!'." })
    public endGameStatusLabel: Label | null = null;
    @property({ type: Node, tooltip: "The semi-transparent overlay shown at the end of the game."})
    public endGameOverlay: Node | null = null;
    @property({ type: Prefab, tooltip: "The particle effect for merges and end screen."})
    public starParticlePrefab: Prefab | null = null;

    // --- Reveal Effect References ---
    @property({ type: Node, tooltip: "The black-and-white background sprite." })
    public bwBackground: Node | null = null;
    @property({ type: Node, tooltip: "The node with the Mask component revealing the color background." })
    public colorRevealMask: Node | null = null;
    @property({ type: Node, tooltip: "The visual wave sprite node that moves down the screen." })
    public revealWave: Node | null = null;

    // --- Tutorial Reference ---
    @property({ type: TutorialController, tooltip: "The controller for the tutorial hand animation." })
    public tutorialController: TutorialController | null = null;

    // --- Gameplay Settings ---
    @property(CCFloat) public gameDuration: number = 60;
    @property(CCInteger) public totalMergeTypes: number = 7;
    @property(CCFloat) public revealDuration: number = 3.0;

    // --- Internal State ---
    private isGameStarted: boolean = false;
    private isGameOver: boolean = false;
    private isTutorialActive: boolean = false;
    private mergedTypes: Set<string> = new Set();
    private elapsedTime: number = 0;
    private bounceTween: Tween<Node> | null = null;
    private audioSource: AudioSource | null = null;

    start() {
        // Get the AudioSource component on this node to play sounds.
        this.audioSource = this.getComponent(AudioSource);
        if (!this.audioSource) {
            console.warn("GameManager is missing an AudioSource component. Sounds will not be played.");
        }
        this.resetGame();
    }

    update(deltaTime: number) {
        if (!this.isGameStarted || this.isGameOver) return;
        
        this.elapsedTime += deltaTime;
        const remainingTime = Math.max(0, this.gameDuration - this.elapsedTime);
        if (this.timerLabel) this.timerLabel.string = `${Math.ceil(remainingTime)}`;

        if (remainingTime <= 0) {
            this.handleGameEnd(false);
        }
    }

    private resetGame() {
        if (this.ctaCanvas) this.ctaCanvas.active = false;
        if (this.mergeProgressBar) this.mergeProgressBar.progress = 0;
        if (this.timerLabel) this.timerLabel.string = `${this.gameDuration}`;
        if (this.endGameOverlay) this.endGameOverlay.active = false;
        
        if (this.dragToMatchText) {
            if (this.bounceTween) this.bounceTween.stop();
            Tween.stopAllByTarget(this.dragToMatchText);

            this.dragToMatchText.setScale(v3(0, 0, 0));
            this.dragToMatchText.active = true;
            
            this.bounceTween = tween(this.dragToMatchText)
                .to(0.7, { scale: v3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' })
                .to(0.7, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
                .union()
                .repeatForever();
                
            tween(this.dragToMatchText)
                .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                .call(() => { 
                    this.bounceTween?.start();
                })
                .start();
        }

        this.isGameStarted = false;
        this.isGameOver = false;
        this.mergedTypes.clear();
        this.elapsedTime = 0;

        if (this.bwBackground) this.bwBackground.active = true;
        if (this.revealWave) this.revealWave.active = false;
        if (this.colorRevealMask) this.colorRevealMask.getComponent(UITransform)!.height = 0;
        
        if (this.tutorialController) {
            this.isTutorialActive = true;
            this.tutorialController.playTutorial();
        }
    }

    public notifyGameStart() {
        if (this.isGameStarted) return;
        this.isGameStarted = true;
    }

    public notifyFirstInteraction(): void {
        if (!this.isTutorialActive) return;
        this.isTutorialActive = false;
        
        if (this.tutorialController) this.tutorialController.stopTutorial();
        
        if (this.dragToMatchText) {
            if (this.bounceTween) this.bounceTween.stop();
            this.dragToMatchText.active = false;
        }
    }
    
    private handleGameEnd(didWin: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.isGameStarted = false;
        
        const END_SCREEN_DELAY = 3.5;
        const END_SCREEN_DURATION = 2.0;

        this.scheduleOnce(() => {
            this.showEndGameOverlay(didWin);
        }, END_SCREEN_DELAY);

        const ctaTotalDelay = END_SCREEN_DELAY + END_SCREEN_DURATION;
        this.scheduleOnce(() => {
            if (this.endGameOverlay) this.endGameOverlay.active = false;
            this.showCtaScreen();
        }, ctaTotalDelay);

        if (didWin) {
            const backgroundTransform = this.bwBackground?.getComponent(UITransform);
            if (!backgroundTransform) return;

            const targetHeight = backgroundTransform.height;
            const startY = targetHeight / 2;

            if (this.revealWave) {
                this.revealWave.setPosition(0, startY, 0);
                this.revealWave.active = true;
                
                tween(this.revealWave)
                    .to(this.revealDuration, { position: v3(0, -startY, 0) }, { easing: 'cubicInOut' })
                    .call(() => {
                        if (this.revealWave) this.revealWave.active = false;
                        if (this.bwBackground) this.bwBackground.active = false;
                    })
                    .start();
            }

            const maskTransform = this.colorRevealMask?.getComponent(UITransform);
            if (maskTransform) {
                tween(maskTransform)
                    .to(this.revealDuration, { height: targetHeight }, { easing: 'cubicInOut' })
                    .start();
            }
        }
    }

    private showEndGameOverlay(didWin: boolean) {
        if (this.endGameOverlay) {
            this.endGameOverlay.active = true;
            if (this.endGameStatusLabel) {
                this.endGameStatusLabel.string = didWin ? "AWESOME!" : "TRY AGAIN!";
                if (this.starParticlePrefab) {
                    const stars = instantiate(this.starParticlePrefab);
                    this.endGameOverlay.addChild(stars);
                    stars.setPosition(v3(0, 0, 0));
                }
            }
        }
    }

    private showCtaScreen() {
        if (this.ctaCanvas) {
            this.ctaCanvas.active = true;
        }
    }

    private checkForWin() {
        if (this.mergedTypes.size >= this.totalMergeTypes) {
            this.handleGameEnd(true);
        }
    }

    public tryMerge(draggedCatNode: Node): boolean {
        if (!this.catsContainer) return false;
        const c = draggedCatNode.getComponent(CatController);
        const t = draggedCatNode.getComponent(UITransform);
        if (!c || !t) return false;

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
        const staticTransform = staticCatNode.getComponent(UITransform);
        const draggedCatSprite = draggedCatNode.getComponent(Sprite);
        const draggedCatController = draggedCatNode.getComponent(CatController);
        const canvasNode = this.node.parent;
        if (!staticTransform || !draggedCatSprite || !draggedCatController || !canvasNode) return;

        // --- PLAY THE MERGE SOUND ---
        if (this.audioSource && draggedCatController.mergeSound) {
            // playOneShot is perfect for sound effects, volume is the second parameter.
            this.audioSource.playOneShot(draggedCatController.mergeSound, 1.0);
        }

        const worldPos = staticTransform.convertToWorldSpaceAR(v3(0,0,0));
        const canvasTransform = canvasNode.getComponent(UITransform);
        if (!canvasTransform) return;

        const nodePos = canvasTransform.convertToNodeSpaceAR(worldPos);
        
        if (this.starParticlePrefab) {
            const stars = instantiate(this.starParticlePrefab);
            canvasNode.addChild(stars); 
            stars.setPosition(nodePos);
            stars.setSiblingIndex(999);
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
        this.scheduleOnce(() => {
            director.loadScene(director.getScene().name);
        }, 0.2);
    }
}