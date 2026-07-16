// A tiny, render-independent signal shared between the voice controller
// (VoiceAvatar) and the WebGL frame loop (TalkingHead). The three.js render loop
// runs outside React, so reading a mutable flag here each frame is more reliable
// than depending on React → R3F prop propagation timing for the "speaking" state.
export const avatarState = { speaking: false, level: 0 };
