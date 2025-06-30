import {
    _decorator,
    AnimationClip,
    AudioClip,
    AudioSource,
    BoxCollider,
    Camera,
    Component,
    geometry,
    Input,
    input,
    instantiate,
    Material,
    math,
    MeshRenderer,
    Node,
    PhysicsSystem,
    Prefab,
    SkeletalAnimation,
    sys,
    Tween,
    tween,
    v3,
    Vec3
} from 'cc';


import { super_html_playable } from './super_html_playable';

const {ccclass} = _decorator;

@ccclass('CTAButtonHandler')
export class CTAButtonHandler extends Component {

    private adHandler: any = null;
    super_html_playable: super_html_playable = new super_html_playable();

    onLoad() {
        if (typeof super_html_playable !== 'undefined') {
            this.adHandler = new super_html_playable();
            console.log("Ad network library (super_html_playable) initialized successfully.");
        } else {
            console.warn("Ad network library not found. Clicks will use a fallback 'window.open' for local testing.");
        }
    }

    public onStoreButtonClicked(): void {
        console.log("Store button clicked!");


        if (sys.os === sys.OS.ANDROID) {
            window.open("https://play.google.com/store/apps/details?id=com.game.goolny.stickers", "Merge Sticker Playbook 2D");
        } else if (sys.os === sys.OS.IOS) {
            window.open("https://apps.apple.com/us/app/merge-sticker-playbook-2d/id6505066374", "Merge Sticker Playbook 2D");
        } else {
            window.open("https://play.google.com/store/apps/details?id=com.game.goolny.stickers", "Merge Sticker Playbook 2D");
        }
        this.super_html_playable.download();
        // const mainAudio = find("Canvas-001/GameCamera")?.getComponent(AudioSource);
        // if (mainAudio) {
        //     mainAudio.stop();
        // }

        
       

    }
}