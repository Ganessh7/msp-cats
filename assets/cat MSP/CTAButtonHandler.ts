import { _decorator, Component, AudioSource, find } from 'cc';

/**
 * This special 'declare' line tells TypeScript that a variable named 'super_html_playable'
 * might exist globally. This is provided by the ad network's JavaScript library.
 */
declare const super_html_playable: any;

const { ccclass } = _decorator;

@ccclass('CTAButtonHandler')
export class CTAButtonHandler extends Component {

    private adHandler: any = null;

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

        // Optional: Stop background music when the CTA is clicked.
        const mainAudio = find("Canvas-001/GameCamera")?.getComponent(AudioSource);
        if (mainAudio) {
            mainAudio.stop();
        }
        
        // --- Primary Click Logic ---
        if (this.adHandler && typeof this.adHandler.download === 'function') {
            console.log("Calling ad network's download() function...");
            this.adHandler.download();
        } 
        else {
            // --- Fallback Logic for Local Testing ---
            console.log("FALLBACK: Opening a default store URL with window.open()");
            window.open("https://play.google.com/store/apps/details?id=com.game.goolny.stickers", "_blank");
        }
    }
}