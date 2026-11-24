# Diagnosis: Rosetta Stone speech never recognized in Safari

Diagnosed on 2026-11-24 on a MacBook Pro (MacBookPro18,1, Apple M1 Pro), macOS 27.3 (26C5047e), Safari 27.3, using the built-in microphone. The page was Rosetta Stone's web app, Sapphire learning path.

## Symptom

- Speaking activities never recognize speech.
- The input meter in System Settings › Sound moves normally until a lesson starts, then stops moving. A restart doesn't change this.
- The microphone works in Safari on sites that open a single microphone stream.
- Voice Isolation is off (Mic Mode: Standard).

## Cause

Rosetta Stone opens the microphone in two ways at the same time.

1. **Stream A**, open for the whole lesson: a normal `getUserMedia` audio stream with echo cancellation. Safari serves it through Apple's voice-processing audio unit (VPIO), which switches on processing in the built-in microphone hardware.
2. **Stream B**, opened for each speaking attempt (about 15 seconds): Rosetta Stone asks for raw audio.

   ```json
   { "audio": { "echoCancellation": false, "googEchoCancellation": false,
                "googAutoGainControl": false, "googNoiseSuppression": false,
                "googHighpassFilter": false, "googTypingNoiseDetection": false },
     "video": false }
   ```

   Safari builds a second capture unit, without voice processing, for this stream. Each time, the system log shows `CoreAudioCaptureUnit::updateMutedState … unable to set kAUVoiceIOProperty_MuteOutput, error -10879`.

While stream A is open, **every raw reader of the built-in microphone gets near-silence**. That includes stream B, the System Settings input meter, and a separate command-line meter (`tools/meter.swift`). Safari still reports stream B as `muted: false` with `readyState: "live"`, and fires no `mute` event, so the page can't tell anything is wrong.

### Measurements

| Condition | Speech level seen by a raw reader | Recognized |
|---|---|---|
| Lesson open (voice processing active) | about −66 dB (near-silent) | no |
| About 0.5 s after the lesson closes its microphone | about −25 dB | n/a |
| Rosetta Stone unmodified (`echoCancellation: false`) | near-silent | no |
| Request changed to `echoCancellation: true` | −21 dB peak | **yes** |

### Reproduced outside Rosetta Stone

[`repro/index.html`](../repro/index.html) recreates the pattern on a plain local page. These are median levels while talking continuously, split at each step:

| Step | A (`echoCancellation` on) | B (`echoCancellation` off) | B′ (`echoCancellation` on) |
|---|---|---|---|
| A only | −41.2 dB | | |
| A and B | −43.1 dB | **−71.0 dB** (max −60.5) | |
| A stopped, B alone | | **−36.4 dB** | |
| B′ started next to B | | **−69.3 dB** | −41.2 dB |

Track B reported `muted: false` in every step, and no `mute` event fired. The silence follows whichever echo-cancelled capture is open: it starts when one opens, whether that happens before or after the raw stream, and ends when none is left.

### Timeline from the system log

```
04:21:36.507  lesson opens the microphone (Safari, stream A, voice processing)
04:21:36.510  corespeechd: CSSelfTriggerDetector starts recording
   … stream B opens and closes with each speaking prompt, error -10879 each time …
04:24:19.296  corespeechd: CSSelfTriggerDetector stops recording
04:24:21.187  WebKit GPU process: CoreAudioCaptureUnit::deallocateStoredVPIOUnit
04:24:21.407  WebKit GPU process: AUVoiceProcessor destroyed
04:24:21.6    raw microphone level jumps from about −66 dB to about −25 dB
```

Siri was enabled on this Mac, with "Hey Siri" (voice trigger) off. Its self-trigger detector (`corespeechd`) starts recording when the lesson opens the microphone and stops when the lesson ends. While a lesson runs, the only processes holding the microphone are Safari's GPU process and CoreSpeech. Whether Siri contributes to the silence hasn't been tested.

## Fix

Rewrite stream B's request to `echoCancellation: true` and drop the `goog*` keys. Safari then serves stream B through the same voice-processed path as stream A, and it delivers normal audio. That is all [`extension/mic-fix.js`](../extension/mic-fix.js) does.

### Implementation notes

- Safari 27.3 doesn't support `"world": "MAIN"` for content scripts (Apple's packager warned about it during conversion). So `extension/loader.js` adds `mic-fix.js` to the page's own script environment itself.
- Rosetta Stone's Content Security Policy only allows scripts that carry its nonce (plus `'strict-dynamic'`). The loader first tries the extension's file URL. If that's blocked, it copies the nonce from one of the page's own `<script nonce>` elements and adds the fix inline.
- Once the fix is active, the page's `<html>` element carries `data-rs-mic-fix="active"`.

## Ruled out

| Hypothesis | Result |
|---|---|
| iPhone Continuity microphone taking the input | No. Safari always captured "MacBook Pro Microphone". |
| Input volume turned down | No. It was at 100% throughout. |
| Safari's microphone broken in general | No. Single-stream test sites work. |
| A second Rosetta Stone tab | No. One tab; the page itself opens both streams. |
| Stream A stuck muted | No. Its mute state toggles correctly between prompts. |
| A third-party audio driver | No. The suspect "ParrotAudio" plug-in is Apple's own (`com.apple.audio.ParrotAudioPlugin`, signed by Apple). It fails to load at boot and wasn't running. |
| Safari Mic Mode set to Wide Spectrum | Not possible. Safari offers only Standard and Voice Isolation. |
| A Safari feature flag | No. All 668 WebKit feature flags in this build were listed. None of the visible ones affects voice processing. |
| Safari's built-in SpeechRecognition API | Not used. Rosetta Stone runs its own recognizer over Web Audio. |

## What would fix it properly

**Rosetta Stone** could do any of these:

1. Reuse stream A for speaking attempts, for example with `MediaStreamTrack.clone()`, instead of calling `getUserMedia` a second time.
2. Request the same processing for both streams. In Safari, that means `echoCancellation: true` for the speaking stream.
3. Detect silence: if the speaking stream stays below about −60 dB while the learner is prompted to speak, show a microphone warning instead of "not recognized".

**Apple** could make Safari deliver real audio to a raw stream while a voice-processed stream from the same microphone is open. Failing that, Safari should mark the raw stream as muted or fail the request, rather than silently delivering near-silence.

## Related reports

Nobody else has publicly reported this exact Rosetta Stone failure yet. These reports describe the same mechanism from other angles:

- [WebKit bug 287872](https://bugs.webkit.org/show_bug.cgi?id=287872) (2025, open): on a Mac, a second `getUserMedia` call with `echoCancellation: false` makes an existing echo-cancelled stream fail. It's the same two-stream pattern, but there the first stream breaks instead of the second.
- [WebKit bug 294623](https://bugs.webkit.org/show_bug.cgi?id=294623) (2025, open): while Safari records audio, other apps using the built-in microphone get much quieter input. This matches the raw readers going near-silent here.
- [WebKit bug 179363](https://bugs.webkit.org/show_bug.cgi?id=179363): a WebKit engineer recommends cloning an existing track rather than calling `getUserMedia` again. The original report is about iOS video.
- [Biscotti pull request 115](https://github.com/scosman/Biscotti/pull/115) (2026, open): while an app holds the built-in microphone through the voice-processing unit, other apps' microphones go quiet, even though the system input level looks normal.
- [vorssaint-utils issue 1568](https://github.com/vorssaint/vorssaint-utils/issues/1568) (2026, open): Safari's voice-processing path keeps delivering audio while apps that read the raw device get silence. The trigger there is a device-level mute, not echo cancellation.

## References

- Apple Developer: [Audio Unit Voice I/O](https://developer.apple.com/documentation/audiotoolbox/audio-unit-voice-i-o)
- Apple Support: [Use Mic Modes on your Mac](https://support.apple.com/guide/mac-help/use-mic-modes-on-your-mac-mchle82b42f0/mac)
- Apple Developer: [Running your Safari web extension](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)
- Rosetta Stone: [Sapphire learning path support](https://support.rosettastone.com/sapphire-learning-path/) and [Troubleshooting messages and tips for speaking activities](https://support.rosettastone.com/Troubleshooting-Messages-and-Tips-for-Speaking-Activities/)
